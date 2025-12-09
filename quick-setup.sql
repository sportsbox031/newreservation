-- 빠른 설정용 SQL (Supabase SQL Editor에서 실행)

-- 1. 세션 관리 테이블
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address INET,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- 2. 예약 정원 관리 테이블
CREATE TABLE IF NOT EXISTS daily_reservations_limit (
  id SERIAL PRIMARY KEY,
  reservation_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 2,
  current_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(reservation_date, time_slot)
);

-- 3. 예약 트랜잭션 로그 테이블
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

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_daily_reservations_date ON daily_reservations_limit(reservation_date);

-- 간단한 예약 시도 함수 (기본 버전)
CREATE OR REPLACE FUNCTION try_reserve_slot(
  p_user_id VARCHAR,
  p_date DATE,
  p_time_slot VARCHAR
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  current_count INTEGER,
  max_capacity INTEGER
) AS $$
DECLARE
  v_current_count INTEGER := 0;
  v_max_capacity INTEGER := 2;
  v_is_full BOOLEAN := false;
BEGIN
  -- 현재 정원 상황 조회
  SELECT 
    COALESCE(current_count, 0),
    COALESCE(max_capacity, 2)
  INTO v_current_count, v_max_capacity
  FROM daily_reservations_limit 
  WHERE reservation_date = p_date AND time_slot = p_time_slot;
  
  -- 정원 테이블에 없으면 기본값으로 생성
  IF NOT FOUND THEN
    INSERT INTO daily_reservations_limit (reservation_date, time_slot, max_capacity, current_count)
    VALUES (p_date, p_time_slot, 2, 0);
    v_current_count := 0;
    v_max_capacity := 2;
  END IF;
  
  -- 정원 확인
  IF v_current_count >= v_max_capacity THEN
    RETURN QUERY SELECT false, '예약이 마감되었습니다.', v_current_count, v_max_capacity;
    RETURN;
  END IF;
  
  -- 예약 가능 - 카운트 증가
  UPDATE daily_reservations_limit 
  SET 
    current_count = current_count + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE reservation_date = p_date AND time_slot = p_time_slot;
  
  -- 트랜잭션 로그 추가
  INSERT INTO reservation_transactions (user_id, reservation_date, time_slot, status)
  VALUES (p_user_id, p_date, p_time_slot, 'success');
  
  RETURN QUERY SELECT true, '예약이 성공했습니다.', v_current_count + 1, v_max_capacity;
END;
$$ LANGUAGE plpgsql;