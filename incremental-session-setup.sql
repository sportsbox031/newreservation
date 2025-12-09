-- 기존 테이블과 충돌하지 않도록 점진적으로 세션 관리 기능 추가

-- 1. 기존 user_sessions 테이블 구조 확인 및 필요 컬럼 추가
-- (이미 존재하는 테이블이므로 ALTER 사용)

-- 필요한 컬럼들이 없으면 추가
DO $$ 
BEGIN
    -- session_token 컬럼 추가 (없으면)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_sessions' AND column_name = 'session_token') THEN
        ALTER TABLE user_sessions ADD COLUMN session_token VARCHAR(255) UNIQUE;
    END IF;
    
    -- user_agent 컬럼 추가 (없으면)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_sessions' AND column_name = 'user_agent') THEN
        ALTER TABLE user_sessions ADD COLUMN user_agent TEXT;
    END IF;
    
    -- ip_address 컬럼 추가 (없으면)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_sessions' AND column_name = 'ip_address') THEN
        ALTER TABLE user_sessions ADD COLUMN ip_address INET;
    END IF;
    
    -- is_active 컬럼 추가 (없으면)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_sessions' AND column_name = 'is_active') THEN
        ALTER TABLE user_sessions ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- last_activity 컬럼 추가 (없으면)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_sessions' AND column_name = 'last_activity') THEN
        ALTER TABLE user_sessions ADD COLUMN last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- expires_at 컬럼 추가 (없으면)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_sessions' AND column_name = 'expires_at') THEN
        ALTER TABLE user_sessions ADD COLUMN expires_at TIMESTAMP;
    END IF;
END $$;

-- 2. 예약 정원 관리 테이블 생성 (IF NOT EXISTS 사용)
CREATE TABLE IF NOT EXISTS daily_reservations_limit (
  id SERIAL PRIMARY KEY,
  reservation_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 2,
  current_count INTEGER NOT NULL DEFAULT 0,
  is_full BOOLEAN GENERATED ALWAYS AS (current_count >= max_capacity) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(reservation_date, time_slot)
);

-- 3. 예약 트랜잭션 로그 테이블 생성 (IF NOT EXISTS 사용)
CREATE TABLE IF NOT EXISTS reservation_transactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  reservation_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  transaction_id UUID DEFAULT gen_random_uuid(),
  status VARCHAR(20) DEFAULT 'pending',
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '5 minutes')
);

-- 4. 인덱스 추가 (IF NOT EXISTS 사용)
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_daily_reservations_date ON daily_reservations_limit(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservation_trans_user ON reservation_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reservation_trans_date ON reservation_transactions(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservation_trans_status ON reservation_transactions(status);

-- 5. 기존 함수 제거 후 재생성
DROP FUNCTION IF EXISTS cleanup_expired_sessions();

-- 세션 정리 함수
CREATE FUNCTION cleanup_expired_sessions()
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

-- 6. 기존 함수 제거 후 재생성 (return type 변경을 위해)
DROP FUNCTION IF EXISTS try_reserve_slot(VARCHAR, DATE, VARCHAR);

-- 예약 정원 체크 및 업데이트 함수 (원자적 연산)
CREATE FUNCTION try_reserve_slot(
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

-- 7. 기존 함수 제거 후 재생성
DROP FUNCTION IF EXISTS cancel_reservation_slot(DATE, VARCHAR);

-- 예약 취소 시 정원 카운트 감소 함수
CREATE FUNCTION cancel_reservation_slot(
  p_date DATE,
  p_time_slot VARCHAR(20)
) RETURNS void AS $$
BEGIN
  UPDATE daily_reservations_limit 
  SET current_count = GREATEST(current_count - 1, 0), updated_at = CURRENT_TIMESTAMP
  WHERE reservation_date = p_date AND time_slot = p_time_slot;
END;
$$ LANGUAGE plpgsql;

-- 8. RLS (Row Level Security) 정책 - 안전하게 적용
DO $$ 
BEGIN
    -- user_sessions 테이블에 RLS 활성화 (이미 활성화되어 있으면 무시)
    BEGIN
        ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        -- 이미 활성화되어 있으면 무시
    END;
    
    -- daily_reservations_limit 테이블에 RLS 활성화
    BEGIN
        ALTER TABLE daily_reservations_limit ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        -- 이미 활성화되어 있으면 무시
    END;
    
    -- reservation_transactions 테이블에 RLS 활성화
    BEGIN
        ALTER TABLE reservation_transactions ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        -- 이미 활성화되어 있으면 무시
    END;
END $$;

-- 9. RLS 정책 생성 (IF NOT EXISTS는 정책에 사용불가하므로 DROP IF EXISTS 후 생성)
-- 사용자는 자신의 세션만 조회 가능
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid()::text = user_id);

-- 예약 정원은 모든 사용자가 조회 가능
DROP POLICY IF EXISTS "All users can view reservation limits" ON daily_reservations_limit;
CREATE POLICY "All users can view reservation limits" ON daily_reservations_limit
  FOR SELECT USING (true);

-- 예약 트랜잭션은 사용자 본인만 조회 가능
DROP POLICY IF EXISTS "Users can view own reservation transactions" ON reservation_transactions;
CREATE POLICY "Users can view own reservation transactions" ON reservation_transactions
  FOR SELECT USING (auth.uid()::text = user_id);

-- 완료 메시지
SELECT '세션 관리 기능이 성공적으로 설정되었습니다!' as setup_status;