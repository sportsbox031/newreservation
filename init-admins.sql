-- 관리자 계정 초기화 스크립트
-- 비밀번호: admin123 (해시화됨)

-- 기존 관리자 삭제 (선택사항)
-- DELETE FROM admins WHERE username IN ('admin', 'admin_south', 'admin_north');

-- 전체 관리자 (super)
INSERT INTO admins (id, username, password_hash, role, phone, email)
VALUES (
  gen_random_uuid(),
  'admin',
  'YWRtaW4xMjNzcG9ydHNib3hfc2FsdA==',  -- admin123 해시
  'super',
  '',
  ''
)
ON CONFLICT (username)
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role;

-- 남부 관리자 (south)
INSERT INTO admins (id, username, password_hash, role, phone, email)
VALUES (
  gen_random_uuid(),
  'admin_south',
  'YWRtaW4xMjNzcG9ydHNib3hfc2FsdA==',  -- admin123 해시
  'south',
  '',
  ''
)
ON CONFLICT (username)
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role;

-- 북부 관리자 (north)
INSERT INTO admins (id, username, password_hash, role, phone, email)
VALUES (
  gen_random_uuid(),
  'admin_north',
  'YWRtaW4xMjNzcG9ydHNib3hfc2FsdA==',  -- admin123 해시
  'north',
  '',
  ''
)
ON CONFLICT (username)
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role;

-- 확인
SELECT id, username, role, phone, email, created_at FROM admins ORDER BY created_at;
