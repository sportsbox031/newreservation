-- user_sessions 테이블 스키마 수정: user_id 타입을 UUID로 변경

-- 1. 기존 user_sessions 테이블 데이터 백업 및 삭제
DROP TABLE IF EXISTS user_sessions_backup;
CREATE TABLE user_sessions_backup AS SELECT * FROM user_sessions;

-- 2. user_sessions 테이블 완전히 재생성
DROP TABLE IF EXISTS user_sessions CASCADE;

-- 3. 올바른 스키마로 user_sessions 테이블 생성
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(45), -- IPv6 지원을 위해 VARCHAR 사용
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 인덱스 생성
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- 5. RLS 비활성화 (커스텀 인증 시스템 사용)
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;

-- 6. 세션 정리 함수 재생성
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

-- 완료 메시지
SELECT 'user_sessions 테이블 스키마가 수정되었습니다!' as status;