-- 동시 접속 제한 및 예약 동시성 제어를 위한 데이터베이스 스키마

-- 1. 세션 관리 테이블
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address INET,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  
  -- 사용자당 최대 1개 활성 세션 보장
  CONSTRAINT unique_active_session UNIQUE (user_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- 인덱스 추가
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = true;

-- 2. 예약 정원 관리 테이블
CREATE TABLE daily_reservations_limit (
  id SERIAL PRIMARY KEY,
  reservation_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL, -- '09:00-12:00', '13:00-16:00', '17:00-20:00'
  max_capacity INTEGER NOT NULL DEFAULT 2, -- 관리자가 설정하는 최대 정원
  current_count INTEGER NOT NULL DEFAULT 0, -- 현재 예약 수
  is_full BOOLEAN GENERATED ALWAYS AS (current_count >= max_capacity) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(reservation_date, time_slot)
);

-- 3. 예약 트랜잭션 로그 테이블 (동시성 제어)
CREATE TABLE reservation_transactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  reservation_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  transaction_id UUID DEFAULT gen_random_uuid(),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'success', 'failed', 'expired'
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '5 minutes'),
  
  INDEX idx_reservation_trans_user(user_id),
  INDEX idx_reservation_trans_date(reservation_date),
  INDEX idx_reservation_trans_status(status)
);

-- 4. 기존 reservations 테이블에 transaction_id 추가 (이미 존재한다면)
-- ALTER TABLE reservations ADD COLUMN transaction_id UUID;
-- ALTER TABLE reservations ADD CONSTRAINT fk_reservation_transaction 
--   FOREIGN KEY (transaction_id) REFERENCES reservation_transactions(transaction_id);

-- 5. 세션 정리 함수 (만료된 세션 자동 삭제)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  -- 만료된 세션 비활성화
  UPDATE user_sessions 
  SET is_active = false 
  WHERE expires_at < CURRENT_TIMESTAMP AND is_active = true;
  
  -- 30일 이상 된 비활성 세션 삭제
  DELETE FROM user_sessions 
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days' AND is_active = false;
END;
$$ LANGUAGE plpgsql;

-- 6. 예약 정원 체크 및 업데이트 함수 (원자적 연산)
CREATE OR REPLACE FUNCTION try_reserve_slot(
  p_user_id VARCHAR(255),
  p_date DATE,
  p_time_slot VARCHAR(20)
) RETURNS JSON AS $$
DECLARE
  v_transaction_id UUID;
  v_current_count INTEGER;
  v_max_capacity INTEGER;
  v_result JSON;
BEGIN
  -- 1. 예약 트랜잭션 생성
  INSERT INTO reservation_transactions (user_id, reservation_date, time_slot)
  VALUES (p_user_id, p_date, p_time_slot)
  RETURNING transaction_id INTO v_transaction_id;
  
  -- 2. 해당 날짜/시간의 정원 정보 조회 (FOR UPDATE로 락)
  SELECT current_count, max_capacity
  INTO v_current_count, v_max_capacity
  FROM daily_reservations_limit
  WHERE reservation_date = p_date AND time_slot = p_time_slot
  FOR UPDATE;
  
  -- 3. 정원 정보가 없으면 생성 (기본값 2명)
  IF NOT FOUND THEN
    INSERT INTO daily_reservations_limit (reservation_date, time_slot, max_capacity, current_count)
    VALUES (p_date, p_time_slot, 2, 0);
    v_current_count := 0;
    v_max_capacity := 2;
  END IF;
  
  -- 4. 정원 초과 체크
  IF v_current_count >= v_max_capacity THEN
    -- 예약 실패
    UPDATE reservation_transactions 
    SET status = 'failed', failure_reason = '예약 정원이 마감되었습니다.'
    WHERE transaction_id = v_transaction_id;
    
    v_result := json_build_object(
      'success', false,
      'message', '예약 정원이 마감되었습니다.',
      'transaction_id', v_transaction_id,
      'current_count', v_current_count,
      'max_capacity', v_max_capacity
    );
  ELSE
    -- 예약 성공 - 정원 카운트 증가
    UPDATE daily_reservations_limit 
    SET current_count = current_count + 1, updated_at = CURRENT_TIMESTAMP
    WHERE reservation_date = p_date AND time_slot = p_time_slot;
    
    UPDATE reservation_transactions 
    SET status = 'success'
    WHERE transaction_id = v_transaction_id;
    
    v_result := json_build_object(
      'success', true,
      'message', '예약이 성공했습니다.',
      'transaction_id', v_transaction_id,
      'current_count', v_current_count + 1,
      'max_capacity', v_max_capacity
    );
  END IF;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- 오류 발생 시 트랜잭션 실패 처리
    UPDATE reservation_transactions 
    SET status = 'failed', failure_reason = SQLERRM
    WHERE transaction_id = v_transaction_id;
    
    RETURN json_build_object(
      'success', false,
      'message', '예약 처리 중 오류가 발생했습니다.',
      'error', SQLERRM,
      'transaction_id', v_transaction_id
    );
END;
$$ LANGUAGE plpgsql;

-- 7. 예약 취소 시 정원 카운트 감소 함수
CREATE OR REPLACE FUNCTION cancel_reservation_slot(
  p_date DATE,
  p_time_slot VARCHAR(20)
) RETURNS void AS $$
BEGIN
  UPDATE daily_reservations_limit 
  SET current_count = GREATEST(current_count - 1, 0), updated_at = CURRENT_TIMESTAMP
  WHERE reservation_date = p_date AND time_slot = p_time_slot;
END;
$$ LANGUAGE plpgsql;

-- 8. 자동 정리 스케줄러 (Supabase에서는 cron extension 필요)
-- SELECT cron.schedule('cleanup-sessions', '0 */6 * * *', 'SELECT cleanup_expired_sessions();');

-- 9. RLS (Row Level Security) 정책
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reservations_limit ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_transactions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 세션만 조회 가능
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid()::text = user_id);

-- 예약 정원은 모든 사용자가 조회 가능
CREATE POLICY "All users can view reservation limits" ON daily_reservations_limit
  FOR SELECT USING (true);

-- 예약 트랜잭션은 사용자 본인만 조회 가능
CREATE POLICY "Users can view own reservation transactions" ON reservation_transactions
  FOR SELECT USING (auth.uid()::text = user_id);

-- 관리자는 모든 테이블에 접근 가능 (서비스 롤 키 사용 시)