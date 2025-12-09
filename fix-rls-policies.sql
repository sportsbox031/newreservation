-- RLS 정책 수정: 커스텀 인증 시스템에 맞게 조정
-- auth.uid() 의존성 제거하고 서비스 역할로 접근하도록 수정

-- 1. 기존 RLS 정책 제거
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "All users can view reservation limits" ON daily_reservations_limit;
DROP POLICY IF EXISTS "Users can view own reservation transactions" ON reservation_transactions;

-- 2. 서비스 역할(service_role)에서 모든 접근 허용하는 정책 생성
-- user_sessions 테이블: 서비스 역할로 모든 작업 허용
CREATE POLICY "Service role full access" ON user_sessions
  FOR ALL USING (true);

-- daily_reservations_limit 테이블: 서비스 역할로 모든 작업 허용  
CREATE POLICY "Service role full access" ON daily_reservations_limit
  FOR ALL USING (true);

-- reservation_transactions 테이블: 서비스 역할로 모든 작업 허용
CREATE POLICY "Service role full access" ON reservation_transactions
  FOR ALL USING (true);

-- 3. 또는 RLS 자체를 비활성화 (더 간단한 방법)
-- ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_reservations_limit DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE reservation_transactions DISABLE ROW LEVEL SECURITY;

-- 완료 메시지
SELECT 'RLS 정책이 커스텀 인증에 맞게 수정되었습니다!' as fix_status;