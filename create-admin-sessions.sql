-- admin_sessions 테이블 생성 (관리자 세션 관리)

-- 1. admin_sessions 테이블 생성
CREATE TABLE IF NOT EXISTS admin_sessions (
  id SERIAL PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(45),
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin_sessions(admin_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- 3. RLS 비활성화 (커스텀 인증 시스템 사용)
ALTER TABLE admin_sessions DISABLE ROW LEVEL SECURITY;

-- 4. 관리자 세션 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_admin_sessions()
RETURNS void AS $$
BEGIN
  -- 만료된 세션 비활성화
  UPDATE admin_sessions
  SET is_active = false
  WHERE expires_at < CURRENT_TIMESTAMP AND is_active = true;

  -- 30일 이상 된 비활성 세션 삭제
  DELETE FROM admin_sessions
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days' AND is_active = false;
END;
$$ LANGUAGE plpgsql;

-- 완료 메시지
SELECT 'admin_sessions 테이블이 생성되었습니다!' as status;
