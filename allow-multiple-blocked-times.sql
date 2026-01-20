-- 같은 날짜에 여러 시간대 차단을 허용하기 위해 UNIQUE 제약조건 제거
-- 2024-01-20

-- 기존 UNIQUE 제약조건 제거
ALTER TABLE blocked_dates DROP CONSTRAINT IF EXISTS blocked_dates_region_id_date_key;

-- 확인: 제약조건이 제거되었는지 확인
-- SELECT conname FROM pg_constraint WHERE conrelid = 'blocked_dates'::regclass;
