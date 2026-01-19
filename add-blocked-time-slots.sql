-- 시간 단위 차단 기능 추가
-- blocked_dates 테이블에 start_time, end_time 컬럼 추가
-- null이면 하루 전체 차단, 값이 있으면 해당 시간대만 차단

-- 1. 기존 테이블에 컬럼 추가
ALTER TABLE blocked_dates
ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT NULL,
ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT NULL;

-- 2. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_blocked_dates_time_range
ON blocked_dates(region_id, date, start_time, end_time);

-- 3. 기존 데이터는 그대로 유지 (start_time, end_time이 NULL이면 하루 전체 차단)

-- 확인 쿼리
SELECT * FROM blocked_dates LIMIT 5;
