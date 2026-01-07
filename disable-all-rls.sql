-- ============================================================================
-- 스포츠박스 예약 시스템 - RLS 완전 비활성화
-- ============================================================================
--
-- 목적: 커스텀 인증 시스템을 사용하므로 RLS를 비활성화하고
--       애플리케이션 레벨에서 권한을 관리합니다.
--
-- 보안: Supabase Service Role Key를 안전하게 관리하고
--       애플리케이션 코드에서 권한 체크를 철저히 해야 합니다.
-- ============================================================================

-- 모든 테이블의 기존 RLS 정책 삭제
DO $$
DECLARE
    r RECORD;
    policy_record RECORD;
BEGIN
    RAISE NOTICE '기존 RLS 정책 삭제 중...';

    -- 모든 public 스키마 테이블 순회
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    ) LOOP
        -- 각 테이블의 정책 삭제
        FOR policy_record IN (
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = r.tablename
        ) LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                policy_record.policyname, r.tablename);
            RAISE NOTICE '정책 삭제: %.%', r.tablename, policy_record.policyname;
        END LOOP;
    END LOOP;
END $$;

-- 모든 테이블에서 RLS 비활성화
ALTER TABLE IF EXISTS regions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservation_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservation_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservation_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS blocked_dates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS homepage_popups DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS announcement_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS announcement_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_reservations_limit DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservation_transactions DISABLE ROW LEVEL SECURITY;

-- RLS 상태 확인
SELECT
    schemaname,
    tablename,
    CASE
        WHEN rowsecurity THEN '활성화 ⚠️'
        ELSE '비활성화 ✅'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ RLS가 모든 테이블에서 비활성화되었습니다.';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ 보안 주의사항:';
    RAISE NOTICE '1. Supabase Service Role Key를 안전하게 보관하세요';
    RAISE NOTICE '2. 애플리케이션 코드에서 권한 체크를 철저히 하세요';
    RAISE NOTICE '3. API 엔드포인트에서 사용자 인증을 확인하세요';
    RAISE NOTICE '4. 민감한 데이터 접근 시 추가 검증을 수행하세요';
    RAISE NOTICE '';
END $$;
