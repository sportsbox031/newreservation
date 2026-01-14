-- ============================================
-- 예약 정원 체크 Trigger (수정된 버전)
-- FOR UPDATE 오류 수정 - Advisory Lock 사용
-- ============================================

-- 1. 기존 Trigger 및 Function 삭제
DROP TRIGGER IF EXISTS check_capacity_before_insert ON reservations;
DROP FUNCTION IF EXISTS check_reservation_capacity();

-- 2. 예약 정원 체크 함수 생성 (수정된 버전)
CREATE OR REPLACE FUNCTION check_reservation_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
  daily_limit_count INTEGER;
  lock_key BIGINT;
BEGIN
  -- Advisory Lock을 위한 고유 키 생성 (region_id + date 조합)
  lock_key := (NEW.region_id::BIGINT * 100000000) + (NEW.date - '2000-01-01'::DATE);
  
  -- Advisory Lock 획득 (트랜잭션 종료 시 자동 해제)
  PERFORM pg_advisory_xact_lock(lock_key);
  
  -- 현재 예약 수 조회 (락 획득 후이므로 안전)
  SELECT COUNT(*) INTO current_count
  FROM reservations
  WHERE region_id = NEW.region_id
    AND date = NEW.date
    AND status IN ('pending', 'approved');

  -- 특정 날짜별 제한 확인 (daily_reservation_limits 테이블)
  SELECT max_reservations INTO daily_limit_count
  FROM daily_reservation_limits
  WHERE region_id = NEW.region_id
    AND date = NEW.date
    AND max_reservations > 0;

  -- 특정 날짜 제한이 있으면 그것을 사용, 없으면 월별 기본 설정 사용
  IF daily_limit_count IS NOT NULL THEN
    max_count := daily_limit_count;
  ELSE
    -- 월별 기본 설정 조회
    SELECT max_reservations_per_day INTO max_count
    FROM reservation_settings
    WHERE region_id = NEW.region_id
      AND year = EXTRACT(YEAR FROM NEW.date::date)
      AND month = EXTRACT(MONTH FROM NEW.date::date);

    -- 설정이 없으면 기본값 2 사용
    IF max_count IS NULL THEN
      max_count := 2;
    END IF;
  END IF;

  -- 정원 초과 체크
  IF current_count >= max_count THEN
    RAISE EXCEPTION '예약이 마감되었습니다. 다른 날짜를 선택해주세요. (정원: %개, 현재: %개)', max_count, current_count
      USING HINT = 'Reservation capacity exceeded',
            ERRCODE = 'P0001'; -- raise_exception 코드
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger 생성 (INSERT 전에 실행)
CREATE TRIGGER check_capacity_before_insert
BEFORE INSERT ON reservations
FOR EACH ROW
EXECUTE FUNCTION check_reservation_capacity();

-- 4. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_reservations_region_date_status
ON reservations(region_id, date, status);

CREATE INDEX IF NOT EXISTS idx_daily_limits_region_date
ON daily_reservation_limits(region_id, date);

CREATE INDEX IF NOT EXISTS idx_settings_region_year_month
ON reservation_settings(region_id, year, month);

-- ============================================
-- 완료! 
-- Advisory Lock을 사용하여 동시성 제어
-- COUNT()와 FOR UPDATE 충돌 문제 해결
-- ============================================
