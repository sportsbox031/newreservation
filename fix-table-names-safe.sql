-- 테이블 이름 일관성 수정 (안전한 버전)

DO $$ 
BEGIN
    -- 1. daily_reservations_limit 테이블이 존재하고 daily_reservation_limits가 없으면 이름 변경
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_reservations_limit') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_reservation_limits') THEN
        ALTER TABLE daily_reservations_limit RENAME TO daily_reservation_limits;
        RAISE NOTICE 'daily_reservations_limit 테이블을 daily_reservation_limits로 이름 변경했습니다.';
    
    -- 2. 둘 다 존재하면 old 테이블 삭제
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_reservations_limit') 
          AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_reservation_limits') THEN
        DROP TABLE daily_reservations_limit CASCADE;
        RAISE NOTICE 'daily_reservations_limit 테이블을 삭제했습니다 (중복 제거).';
    
    -- 3. daily_reservation_limits만 존재하면 아무것도 안함
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_reservation_limits') THEN
        RAISE NOTICE 'daily_reservation_limits 테이블이 이미 존재합니다.';
    
    -- 4. 둘 다 없으면 새로 생성
    ELSE
        CREATE TABLE daily_reservation_limits (
          id SERIAL PRIMARY KEY,
          region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          max_reservations INTEGER NOT NULL DEFAULT 2,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE(region_id, date)
        );
        RAISE NOTICE 'daily_reservation_limits 테이블을 새로 생성했습니다.';
    END IF;
END $$;

-- 인덱스 추가 (IF NOT EXISTS 사용)
CREATE INDEX IF NOT EXISTS idx_daily_reservation_limits_region ON daily_reservation_limits(region_id);
CREATE INDEX IF NOT EXISTS idx_daily_reservation_limits_date ON daily_reservation_limits(date);
CREATE INDEX IF NOT EXISTS idx_daily_reservation_limits_region_date ON daily_reservation_limits(region_id, date);

-- RLS 비활성화
ALTER TABLE daily_reservation_limits DISABLE ROW LEVEL SECURITY;

-- 완료 메시지
SELECT '테이블 정리가 완료되었습니다!' as status;