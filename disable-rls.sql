-- RLS 완전 비활성화 - 커스텀 인증 시스템용

-- 1. 모든 RLS 정책 제거
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "All users can view reservation limits" ON daily_reservations_limit;
DROP POLICY IF EXISTS "Users can view own reservation transactions" ON reservation_transactions;
DROP POLICY IF EXISTS "Service role full access" ON user_sessions;
DROP POLICY IF EXISTS "Service role full access" ON daily_reservations_limit;
DROP POLICY IF EXISTS "Service role full access" ON reservation_transactions;

-- 2. RLS 완전 비활성화
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reservations_limit DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_transactions DISABLE ROW LEVEL SECURITY;

-- 3. 기존 테이블들도 RLS 비활성화 (필요한 경우)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE cities DISABLE ROW LEVEL SECURITY;
ALTER TABLE regions DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_popups DISABLE ROW LEVEL SECURITY;

-- 완료 메시지
SELECT 'RLS가 모든 테이블에서 비활성화되었습니다!' as status;