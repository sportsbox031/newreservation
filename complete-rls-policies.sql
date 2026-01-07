-- ============================================================================
-- 스포츠박스 예약 시스템 - 완전한 RLS 정책
-- ============================================================================
--
-- 현재 상태: 커스텀 인증 시스템 사용 (Supabase Auth 미사용)
-- 권한 관리: 애플리케이션 레벨에서 처리
--
-- 이 파일은 두 가지 버전을 제공합니다:
-- 1. PART A: 현재 구조에 맞는 RLS 비활성화 (권장)
-- 2. PART B: 참고용 완전한 RLS 정책 (향후 Supabase Auth 마이그레이션 시)
-- ============================================================================

-- ============================================================================
-- PART A: 현재 구조에 맞는 RLS 설정 (커스텀 인증)
-- ============================================================================

-- 모든 테이블의 기존 RLS 정책 삭제
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON %I.%I', r.schemaname, r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Users can view own sessions" ON %I.%I', r.schemaname, r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "All users can view reservation limits" ON %I.%I', r.schemaname, r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Users can view own reservation transactions" ON %I.%I', r.schemaname, r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Anyone can view active popups" ON %I.%I', r.schemaname, r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Admins can manage popups" ON %I.%I', r.schemaname, r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Users can view relevant announcements" ON %I.%I', r.schemaname, r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Admins can manage announcements" ON %I.%I', r.schemaname, r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Users can manage their views" ON %I.%I', r.schemaname, r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Users can view announcement attachments" ON %I.%I', r.schemaname, r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Admins can manage announcement attachments" ON %I.%I', r.schemaname, r.tablename);
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

-- 완료 메시지
SELECT
    'RLS가 비활성화되었습니다. 애플리케이션 레벨에서 권한을 관리하세요.' as status,
    '보안: Supabase Service Role Key 또는 애플리케이션 레벨 권한 체크 필수' as security_note;


-- ============================================================================
-- PART B: 참고용 완전한 RLS 정책 (향후 Supabase Auth 마이그레이션 시)
-- ============================================================================
--
-- 주의: 이 정책들은 Supabase Auth를 사용할 때만 작동합니다.
-- 현재는 실행하지 마세요. 향후 마이그레이션 시 참고용입니다.
-- ============================================================================

/*

-- ============================================================================
-- 1. regions 테이블
-- ============================================================================
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 지역 정보를 조회할 수 있음
CREATE POLICY "Anyone can view regions" ON regions
    FOR SELECT USING (true);

-- 관리자만 지역 정보를 수정할 수 있음
CREATE POLICY "Admins can manage regions" ON regions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid() AND role = 'super'
        )
    );


-- ============================================================================
-- 2. cities 테이블
-- ============================================================================
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 시/군 정보를 조회할 수 있음
CREATE POLICY "Anyone can view cities" ON cities
    FOR SELECT USING (true);

-- 관리자만 시/군 정보를 수정할 수 있음
CREATE POLICY "Admins can manage cities" ON cities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid() AND role = 'super'
        )
    );


-- ============================================================================
-- 3. users 테이블
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 정보만 조회 가능
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid());

-- 사용자는 본인의 정보를 수정 가능 (비밀번호, 연락처 등)
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 관리자는 모든 사용자 정보를 조회 가능
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid()
        )
    );

-- Super 관리자는 모든 사용자 정보를 수정 가능
CREATE POLICY "Super admin can manage users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid() AND role = 'super'
        )
    );

-- South/North 관리자는 본인 지역 사용자만 관리 가능
CREATE POLICY "Regional admins can manage their users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins a
            JOIN cities c ON users.city_id = c.id
            WHERE a.id = auth.uid()
            AND a.role IN ('south', 'north')
            AND a.region_id = c.region_id
        )
    );


-- ============================================================================
-- 4. admins 테이블
-- ============================================================================
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- 관리자는 본인의 정보만 조회 가능
CREATE POLICY "Admins can view own profile" ON admins
    FOR SELECT USING (id = auth.uid());

-- Super 관리자는 모든 관리자 정보를 관리 가능
CREATE POLICY "Super admin can manage all admins" ON admins
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid() AND role = 'super'
        )
    );


-- ============================================================================
-- 5. reservations 테이블
-- ============================================================================
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 예약만 조회 가능
CREATE POLICY "Users can view own reservations" ON reservations
    FOR SELECT USING (user_id = auth.uid());

-- 사용자는 본인의 예약을 생성 가능
CREATE POLICY "Users can create reservations" ON reservations
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 사용자는 본인의 예약을 취소 요청 가능
CREATE POLICY "Users can request cancel" ON reservations
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid() AND
        status IN ('pending', 'approved', 'cancel_requested')
    );

-- 관리자는 모든 예약을 조회 가능
CREATE POLICY "Admins can view all reservations" ON reservations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid()
        )
    );

-- Super 관리자는 모든 예약을 관리 가능
CREATE POLICY "Super admin can manage all reservations" ON reservations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid() AND role = 'super'
        )
    );

-- South/North 관리자는 본인 지역 예약만 관리 가능
CREATE POLICY "Regional admins can manage their reservations" ON reservations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins a
            WHERE a.id = auth.uid()
            AND a.role IN ('south', 'north')
            AND a.region_id = reservations.region_id
        )
    );


-- ============================================================================
-- 6. reservation_slots 테이블
-- ============================================================================
ALTER TABLE reservation_slots ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인 예약의 슬롯만 조회 가능
CREATE POLICY "Users can view own slots" ON reservation_slots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reservations r
            WHERE r.id = reservation_slots.reservation_id
            AND r.user_id = auth.uid()
        )
    );

-- 사용자는 본인 예약의 슬롯을 생성 가능
CREATE POLICY "Users can create slots" ON reservation_slots
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM reservations r
            WHERE r.id = reservation_slots.reservation_id
            AND r.user_id = auth.uid()
        )
    );

-- 관리자는 모든 슬롯을 조회/관리 가능
CREATE POLICY "Admins can manage slots" ON reservation_slots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid()
        )
    );


-- ============================================================================
-- 7. reservation_logs 테이블
-- ============================================================================
ALTER TABLE reservation_logs ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인 예약의 로그만 조회 가능
CREATE POLICY "Users can view own logs" ON reservation_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reservations r
            WHERE r.id = reservation_logs.reservation_id
            AND r.user_id = auth.uid()
        )
    );

-- 관리자는 모든 로그를 조회 가능
CREATE POLICY "Admins can view all logs" ON reservation_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid()
        )
    );

-- 시스템만 로그를 생성 가능 (서비스 롤)
CREATE POLICY "System can create logs" ON reservation_logs
    FOR INSERT WITH CHECK (true);


-- ============================================================================
-- 8. reservation_settings 테이블
-- ============================================================================
ALTER TABLE reservation_settings ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 예약 설정을 조회 가능
CREATE POLICY "Anyone can view settings" ON reservation_settings
    FOR SELECT USING (true);

-- Super 관리자만 예약 설정을 수정 가능
CREATE POLICY "Super admin can manage settings" ON reservation_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid() AND role = 'super'
        )
    );

-- South/North 관리자는 본인 지역 설정만 관리 가능
CREATE POLICY "Regional admins can manage their settings" ON reservation_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins a
            WHERE a.id = auth.uid()
            AND a.role IN ('south', 'north')
            AND a.region_id = reservation_settings.region_id
        )
    );


-- ============================================================================
-- 9. blocked_dates 테이블
-- ============================================================================
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 차단 날짜를 조회 가능
CREATE POLICY "Anyone can view blocked dates" ON blocked_dates
    FOR SELECT USING (true);

-- Super 관리자만 차단 날짜를 관리 가능
CREATE POLICY "Super admin can manage blocked dates" ON blocked_dates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid() AND role = 'super'
        )
    );

-- South/North 관리자는 본인 지역 차단 날짜만 관리 가능
CREATE POLICY "Regional admins can manage their blocked dates" ON blocked_dates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins a
            WHERE a.id = auth.uid()
            AND a.role IN ('south', 'north')
            AND a.region_id = blocked_dates.region_id
        )
    );


-- ============================================================================
-- 10. homepage_popups 테이블
-- ============================================================================
ALTER TABLE homepage_popups ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 활성화된 팝업을 조회 가능
CREATE POLICY "Anyone can view active popups" ON homepage_popups
    FOR SELECT USING (
        is_active = true
        AND start_date <= NOW()
        AND (end_date IS NULL OR end_date >= NOW())
    );

-- 관리자는 모든 팝업을 조회 가능
CREATE POLICY "Admins can view all popups" ON homepage_popups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid()
        )
    );

-- 관리자는 팝업을 관리 가능
CREATE POLICY "Admins can manage popups" ON homepage_popups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid()
        )
    );


-- ============================================================================
-- 11. announcements 테이블
-- ============================================================================
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 사용자는 게시된 공지사항 중 본인 지역에 해당하는 것만 조회
CREATE POLICY "Users can view relevant announcements" ON announcements
    FOR SELECT USING (
        is_published = true AND (
            target_type = 'all' OR
            (target_type = 'region' AND target_region_id = (
                SELECT c.region_id FROM users u
                JOIN cities c ON u.city_id = c.id
                WHERE u.id = auth.uid()
            ))
        )
    );

-- 관리자는 모든 공지사항을 조회 가능
CREATE POLICY "Admins can view all announcements" ON announcements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid()
        )
    );

-- Super 관리자는 모든 공지사항을 관리 가능
CREATE POLICY "Super admin can manage announcements" ON announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid() AND role = 'super'
        )
    );

-- South/North 관리자는 본인 지역 공지사항만 관리 가능
CREATE POLICY "Regional admins can manage their announcements" ON announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins a
            WHERE a.id = auth.uid()
            AND a.role IN ('south', 'north')
            AND (
                announcements.target_type = 'all' OR
                a.region_id = announcements.target_region_id
            )
        )
    );


-- ============================================================================
-- 12. announcement_views 테이블
-- ============================================================================
ALTER TABLE announcement_views ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 조회 기록만 관리 가능
CREATE POLICY "Users can manage their views" ON announcement_views
    FOR ALL USING (user_id = auth.uid());

-- 관리자는 모든 조회 기록을 조회 가능
CREATE POLICY "Admins can view all views" ON announcement_views
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid()
        )
    );


-- ============================================================================
-- 13. announcement_attachments 테이블
-- ============================================================================
ALTER TABLE announcement_attachments ENABLE ROW LEVEL SECURITY;

-- 사용자는 게시된 공지사항의 첨부파일만 조회 가능
CREATE POLICY "Users can view announcement attachments" ON announcement_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM announcements a
            WHERE a.id = announcement_attachments.announcement_id
            AND a.is_published = true
        )
    );

-- 관리자는 모든 첨부파일을 관리 가능
CREATE POLICY "Admins can manage attachments" ON announcement_attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid()
        )
    );


-- ============================================================================
-- 14. user_sessions 테이블
-- ============================================================================
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 세션만 조회 가능
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (user_id = auth.uid()::text);

-- 시스템만 세션을 생성/수정 가능 (서비스 롤)
CREATE POLICY "System can manage sessions" ON user_sessions
    FOR ALL WITH CHECK (true);


-- ============================================================================
-- 15. daily_reservations_limit 테이블
-- ============================================================================
ALTER TABLE daily_reservations_limit ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 예약 정원을 조회 가능
CREATE POLICY "Anyone can view reservation limits" ON daily_reservations_limit
    FOR SELECT USING (true);

-- 시스템만 정원을 관리 가능 (서비스 롤)
CREATE POLICY "System can manage limits" ON daily_reservations_limit
    FOR ALL WITH CHECK (true);

-- 관리자는 정원을 조회 가능
CREATE POLICY "Admins can view limits" ON daily_reservations_limit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid()
        )
    );


-- ============================================================================
-- 16. reservation_transactions 테이블
-- ============================================================================
ALTER TABLE reservation_transactions ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 트랜잭션만 조회 가능
CREATE POLICY "Users can view own transactions" ON reservation_transactions
    FOR SELECT USING (user_id = auth.uid()::text);

-- 시스템만 트랜잭션을 생성 가능 (서비스 롤)
CREATE POLICY "System can create transactions" ON reservation_transactions
    FOR INSERT WITH CHECK (true);

-- 관리자는 모든 트랜잭션을 조회 가능
CREATE POLICY "Admins can view all transactions" ON reservation_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE id = auth.uid()
        )
    );


-- ============================================================================
-- 완료
-- ============================================================================
SELECT
    '참고용 RLS 정책이 생성되었습니다.' as status,
    'Supabase Auth 마이그레이션 후에 활성화하세요.' as note;

*/
