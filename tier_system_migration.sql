-- ==========================================
-- TIER SYSTEM MIGRATION - NON-DESTRUCTIVE
-- ==========================================
-- 이 스크립트는 기존 시스템에 영향을 주지 않고 티어 시스템을 추가합니다.
-- 모든 기존 사용자는 Standard 티어로 설정됩니다.

-- 1. Create member_tiers table
CREATE TABLE IF NOT EXISTS member_tiers (
  id SERIAL PRIMARY KEY,
  tier_name VARCHAR(50) NOT NULL UNIQUE,
  tier_level INTEGER NOT NULL,
  description TEXT,
  monthly_reservation_limit INTEGER DEFAULT 4,
  daily_slot_limit INTEGER DEFAULT 2,
  advance_reservation_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Insert default tiers (Priority/Standard)
INSERT INTO member_tiers (tier_name, tier_level, description, advance_reservation_days)
VALUES
  ('Priority', 1, '우선 회원 - 하루 먼저 예약', 1),
  ('Standard', 2, '일반 회원', 0)
ON CONFLICT (tier_name) DO NOTHING;

-- 3. Create tier reservation settings table (regional tier control)
CREATE TABLE IF NOT EXISTS tier_reservation_settings (
  id SERIAL PRIMARY KEY,
  region_code VARCHAR(10) NOT NULL,              -- 'south', 'north'
  year_month VARCHAR(7) NOT NULL,                -- 'YYYY-MM'
  tier_id INTEGER REFERENCES member_tiers(id),
  is_open BOOLEAN DEFAULT false,                 -- 기본값: 예약 종료
  reservation_start_date DATE,                   -- Priority: 20일, Standard: 21일
  created_by VARCHAR(255),                       -- 설정한 관리자 ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(region_code, year_month, tier_id)       -- 지역/월/티어별 하나의 설정
);

-- 4. Add tier_id to users table (NON-BREAKING CHANGE)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='tier_id'
    ) THEN
        ALTER TABLE users ADD COLUMN tier_id INTEGER REFERENCES member_tiers(id);

        -- Set all existing users to Standard tier (tier_level = 2)
        UPDATE users
        SET tier_id = (SELECT id FROM member_tiers WHERE tier_name = 'Standard')
        WHERE tier_id IS NULL;

        RAISE NOTICE 'tier_id column added to users table and all existing users set to Standard tier';
    ELSE
        RAISE NOTICE 'tier_id column already exists in users table';
    END IF;
END $$;

-- 5. Add RLS policies for tier tables
ALTER TABLE member_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_reservation_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read member_tiers
DROP POLICY IF EXISTS "Allow read access to member_tiers" ON member_tiers;
CREATE POLICY "Allow read access to member_tiers" ON member_tiers
  FOR SELECT USING (true);

-- Allow all access to tier_reservation_settings (admin-controlled)
DROP POLICY IF EXISTS "Allow admin access to tier_reservation_settings" ON tier_reservation_settings;
CREATE POLICY "Allow admin access to tier_reservation_settings" ON tier_reservation_settings
  FOR ALL USING (true);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_tier_id ON users(tier_id);
CREATE INDEX IF NOT EXISTS idx_tier_reservation_settings_region_month ON tier_reservation_settings(region_code, year_month);
CREATE INDEX IF NOT EXISTS idx_tier_reservation_settings_tier_id ON tier_reservation_settings(tier_id);

-- 7. Verification queries
DO $$
DECLARE
    tier_count INTEGER;
    user_count INTEGER;
    users_with_tier INTEGER;
BEGIN
    -- Check tiers created
    SELECT COUNT(*) INTO tier_count FROM member_tiers;
    RAISE NOTICE 'Created % tiers', tier_count;

    -- Check users have tiers assigned
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO users_with_tier FROM users WHERE tier_id IS NOT NULL;
    RAISE NOTICE 'Total users: %, Users with tier: %', user_count, users_with_tier;

    -- Verify all users have Standard tier by default
    IF user_count = users_with_tier THEN
        RAISE NOTICE 'SUCCESS: All users have been assigned tiers';
    ELSE
        RAISE NOTICE 'WARNING: Some users do not have tiers assigned';
    END IF;
END $$;

-- 8. Display tier information
SELECT
    id,
    tier_name,
    tier_level,
    description,
    advance_reservation_days,
    monthly_reservation_limit,
    daily_slot_limit
FROM member_tiers
ORDER BY tier_level;

-- 마이그레이션 완료
-- 모든 기존 사용자가 Standard 티어로 설정되었습니다
-- tier_reservation_settings 테이블이 지역별 티어 제어를 위해 생성되었습니다
-- API 통합 준비 완료