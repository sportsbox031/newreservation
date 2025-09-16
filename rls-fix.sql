-- RLS 정책 수정 스크립트
-- 커스텀 인증을 사용하므로 RLS 정책을 수정합니다

-- 기존 정책들 제거
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can insert own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can update own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can view own reservation slots" ON reservation_slots;

-- 테이블이 존재하지 않을 경우를 대비한 생성
CREATE TABLE IF NOT EXISTS reservation_settings (
    id SERIAL PRIMARY KEY,
    region_id INTEGER REFERENCES regions(id),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    is_open BOOLEAN DEFAULT true,
    max_reservations_per_day INTEGER DEFAULT 2,
    max_days_per_month INTEGER DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(region_id, year, month)
);

-- 기본 설정 데이터 삽입 (존재하지 않는 경우에만)
INSERT INTO reservation_settings (region_id, year, month, is_open, max_reservations_per_day, max_days_per_month) 
SELECT 1, 2024, 12, true, 2, 4
WHERE NOT EXISTS (SELECT 1 FROM reservation_settings WHERE region_id = 1 AND year = 2024 AND month = 12);

INSERT INTO reservation_settings (region_id, year, month, is_open, max_reservations_per_day, max_days_per_month) 
SELECT 2, 2024, 12, true, 2, 4
WHERE NOT EXISTS (SELECT 1 FROM reservation_settings WHERE region_id = 2 AND year = 2024 AND month = 12);

-- 2025년 9월 기본 설정도 추가
INSERT INTO reservation_settings (region_id, year, month, is_open, max_reservations_per_day, max_days_per_month) 
SELECT 1, 2025, 9, true, 2, 4
WHERE NOT EXISTS (SELECT 1 FROM reservation_settings WHERE region_id = 1 AND year = 2025 AND month = 9);

INSERT INTO reservation_settings (region_id, year, month, is_open, max_reservations_per_day, max_days_per_month) 
SELECT 2, 2025, 9, true, 2, 4
WHERE NOT EXISTS (SELECT 1 FROM reservation_settings WHERE region_id = 2 AND year = 2025 AND month = 9);

-- 옵션 1: RLS 완전 비활성화 (권장 - 커스텀 인증 사용시)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE regions DISABLE ROW LEVEL SECURITY;
ALTER TABLE cities DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_logs DISABLE ROW LEVEL SECURITY;

-- 옵션 2: 대안으로 모든 사용자에게 접근 허용하는 정책
-- (RLS를 유지하고 싶다면 아래 주석 해제)
/*
CREATE POLICY "Allow public registration" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update users" ON users
    FOR UPDATE USING (true);

CREATE POLICY "Allow public to read regions and cities" ON regions
    FOR SELECT USING (true);

CREATE POLICY "Allow public to read cities" ON cities
    FOR SELECT USING (true);

CREATE POLICY "Allow reservations for authenticated users" ON reservations
    FOR ALL USING (true);

CREATE POLICY "Allow reservation slots for authenticated users" ON reservation_slots
    FOR ALL USING (true);
*/