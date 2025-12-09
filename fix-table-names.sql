-- 테이블 이름 일관성 수정: daily_reservations_limit → daily_reservation_limits

-- 1. 기존 테이블이 있으면 이름 변경
DO $$ 
BEGIN
    -- daily_reservations_limit 테이블이 존재하면 daily_reservation_limits로 이름 변경
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_reservations_limit') THEN
        ALTER TABLE daily_reservations_limit RENAME TO daily_reservation_limits;
    END IF;
END $$;

-- 2. daily_reservation_limits 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS daily_reservation_limits (
  id SERIAL PRIMARY KEY,
  region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  max_reservations INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(region_id, date)
);

-- 3. 인덱스 추가 (IF NOT EXISTS 사용)
CREATE INDEX IF NOT EXISTS idx_daily_reservation_limits_region ON daily_reservation_limits(region_id);
CREATE INDEX IF NOT EXISTS idx_daily_reservation_limits_date ON daily_reservation_limits(date);
CREATE INDEX IF NOT EXISTS idx_daily_reservation_limits_region_date ON daily_reservation_limits(region_id, date);

-- 4. RLS 비활성화
ALTER TABLE daily_reservation_limits DISABLE ROW LEVEL SECURITY;

-- 완료 메시지
SELECT '테이블 이름이 일관성 있게 수정되었습니다!' as status;