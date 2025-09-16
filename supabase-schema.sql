-- Supabase 스포츠박스 예약시스템 데이터베이스 스키마

-- 1. 지역 정보 테이블 (경기남부/북부)
CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE -- 'south', 'north'
);

-- 2. 시/군 정보 테이블
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    region_id INTEGER REFERENCES regions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 사용자 테이블
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name VARCHAR(100) NOT NULL UNIQUE, -- 단체명 (로그인 ID)
    password_hash TEXT NOT NULL,
    manager_name VARCHAR(50) NOT NULL, -- 담당자명
    city_id INTEGER REFERENCES cities(id) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    privacy_consent BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'suspended'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 관리자 테이블
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'super', 'south', 'north'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 예약 설정 테이블 (월별)
CREATE TABLE reservation_settings (
    id SERIAL PRIMARY KEY,
    region_id INTEGER REFERENCES regions(id),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    is_open BOOLEAN DEFAULT false, -- 예약 받기 시작/종료
    max_reservations_per_day INTEGER DEFAULT 2, -- 하루 최대 예약 수
    max_days_per_month INTEGER DEFAULT 4, -- 계정당 월 최대 예약 일수
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(region_id, year, month)
);

-- 6. 예약 불가 날짜 테이블
CREATE TABLE blocked_dates (
    id SERIAL PRIMARY KEY,
    region_id INTEGER REFERENCES regions(id),
    date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(region_id, date)
);

-- 7. 예약 테이블
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    region_id INTEGER REFERENCES regions(id),
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'cancelled', 'admin_cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 예약 시간 슬롯 테이블 (하루에 최대 2타임)
CREATE TABLE reservation_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grade VARCHAR(10) NOT NULL, -- '1학년', '2학년', ..., '6학년', '기타'
    participant_count INTEGER NOT NULL,
    location VARCHAR(100) NOT NULL,
    slot_order INTEGER NOT NULL CHECK (slot_order IN (1, 2)), -- 1번째/2번째 타임
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. 예약 상태 로그 테이블
CREATE TABLE reservation_logs (
    id SERIAL PRIMARY KEY,
    reservation_id UUID REFERENCES reservations(id),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by UUID, -- user_id 또는 admin_id
    changed_by_type VARCHAR(10), -- 'user' 또는 'admin'
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_users_organization_name ON users(organization_name);
CREATE INDEX idx_users_city_id ON users(city_id);
CREATE INDEX idx_reservations_user_id ON reservations(user_id);
CREATE INDEX idx_reservations_date ON reservations(date);
CREATE INDEX idx_reservations_region_date ON reservations(region_id, date);
CREATE INDEX idx_reservation_slots_reservation_id ON reservation_slots(reservation_id);

-- Row Level Security (RLS) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_slots ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성 (사용자는 본인의 데이터만 접근 가능)
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own reservations" ON reservations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reservations" ON reservations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reservations" ON reservations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own reservation slots" ON reservation_slots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reservations 
            WHERE reservations.id = reservation_slots.reservation_id 
            AND reservations.user_id = auth.uid()
        )
    );

-- 기본 데이터 삽입
INSERT INTO regions (name, code) VALUES
    ('경기남부', 'south'),
    ('경기북부', 'north');

INSERT INTO cities (name, region_id) VALUES
    -- 경기남부 (region_id = 1)
    ('과천시', 1), ('광명시', 1), ('광주시', 1), ('군포시', 1), ('김포시', 1),
    ('부천시', 1), ('성남시', 1), ('수원시', 1), ('시흥시', 1), ('안산시', 1),
    ('안성시', 1), ('안양시', 1), ('여주시', 1), ('오산시', 1), ('용인시', 1),
    ('의왕시', 1), ('이천시', 1), ('평택시', 1), ('하남시', 1), ('화성시', 1),
    ('양평군', 1),
    -- 경기북부 (region_id = 2)
    ('고양시', 2), ('구리시', 2), ('남양주시', 2), ('동두천시', 2), ('양주시', 2),
    ('의정부시', 2), ('파주시', 2), ('포천시', 2), ('가평군', 2), ('연천군', 2);

-- 기본 관리자 계정 생성 (비밀번호는 애플리케이션에서 해시화 처리)
INSERT INTO admins (username, password_hash, role) VALUES
    ('admin', 'admin123', 'super'),
    ('admin_south', 'admin123', 'south'),
    ('admin_north', 'admin123', 'north');

-- 뷰 생성: 사용자 정보와 지역 정보 조인
CREATE VIEW user_details AS
SELECT 
    u.id,
    u.organization_name,
    u.manager_name,
    u.phone,
    u.email,
    u.status,
    c.name as city_name,
    r.name as region_name,
    r.code as region_code,
    u.created_at
FROM users u
JOIN cities c ON u.city_id = c.id
JOIN regions r ON c.region_id = r.id;

-- 함수: 사용자의 월별 예약 가능 일수 확인
CREATE OR REPLACE FUNCTION get_user_monthly_reservation_count(
    user_uuid UUID,
    target_year INTEGER,
    target_month INTEGER
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM reservations r
        WHERE r.user_id = user_uuid
        AND EXTRACT(YEAR FROM r.date) = target_year
        AND EXTRACT(MONTH FROM r.date) = target_month
        AND r.status IN ('pending', 'approved')
    );
END;
$$ LANGUAGE plpgsql;

-- 함수: 특정 날짜의 예약 개수 확인
CREATE OR REPLACE FUNCTION get_daily_reservation_count(
    target_region_id INTEGER,
    target_date DATE
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM reservations r
        WHERE r.region_id = target_region_id
        AND r.date = target_date
        AND r.status IN ('pending', 'approved')
    );
END;
$$ LANGUAGE plpgsql;