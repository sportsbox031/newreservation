-- 예약 동시성 제어 함수 (올바른 버전)

-- 1. 기존 함수들 제거
DROP FUNCTION IF EXISTS try_reserve_slot(VARCHAR, DATE, VARCHAR);
DROP FUNCTION IF EXISTS cancel_reservation_slot(DATE, VARCHAR);
DROP FUNCTION IF EXISTS check_reservation_capacity(INTEGER, DATE);

-- 2. 예약 정원 체크 및 예약 생성 함수
CREATE OR REPLACE FUNCTION check_and_reserve(
  p_user_id UUID,
  p_region_id INTEGER,
  p_date DATE,
  p_max_reservations_per_day INTEGER DEFAULT 2
) RETURNS JSON AS $$
DECLARE
  v_current_count INTEGER;
  v_max_allowed INTEGER;
  v_result JSON;
BEGIN
  -- 트랜잭션 시작 (암시적)
  
  -- 1. 해당 날짜의 현재 예약 수 조회 (FOR UPDATE로 락)
  SELECT COUNT(*)
  INTO v_current_count
  FROM reservations
  WHERE region_id = p_region_id 
    AND date = p_date 
    AND status IN ('pending', 'approved')
  FOR UPDATE;
  
  -- 2. daily_reservation_limits 테이블에서 특별 제한 확인
  SELECT COALESCE(max_reservations, p_max_reservations_per_day)
  INTO v_max_allowed
  FROM daily_reservation_limits
  WHERE region_id = p_region_id AND date = p_date;
  
  -- 특별 제한이 없으면 기본값 사용
  IF v_max_allowed IS NULL THEN
    v_max_allowed := p_max_reservations_per_day;
  END IF;
  
  -- 3. 정원 초과 체크
  IF v_current_count >= v_max_allowed THEN
    -- 예약 실패
    v_result := json_build_object(
      'success', false,
      'message', '선택하신 날짜의 예약이 마감되었습니다.',
      'current_count', v_current_count,
      'max_allowed', v_max_allowed,
      'available_slots', 0
    );
  ELSE
    -- 예약 가능
    v_result := json_build_object(
      'success', true,
      'message', '예약이 가능합니다.',
      'current_count', v_current_count,
      'max_allowed', v_max_allowed,
      'available_slots', v_max_allowed - v_current_count
    );
  END IF;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- 오류 발생 시
    RETURN json_build_object(
      'success', false,
      'message', '예약 확인 중 오류가 발생했습니다.',
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- 3. 사용자 월별 예약 제한 체크 함수
CREATE OR REPLACE FUNCTION check_user_monthly_limit(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER,
  p_max_days_per_month INTEGER DEFAULT 4
) RETURNS JSON AS $$
DECLARE
  v_current_days INTEGER;
  v_result JSON;
BEGIN
  -- 해당 월의 사용자 예약 일수 조회
  SELECT COUNT(DISTINCT date)
  INTO v_current_days
  FROM reservations
  WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM date) = p_year
    AND EXTRACT(MONTH FROM date) = p_month
    AND status IN ('pending', 'approved');
  
  IF v_current_days >= p_max_days_per_month THEN
    v_result := json_build_object(
      'success', false,
      'message', format('월 예약 한도를 초과했습니다. (%s/%s일)', v_current_days, p_max_days_per_month),
      'current_days', v_current_days,
      'max_days', p_max_days_per_month
    );
  ELSE
    v_result := json_build_object(
      'success', true,
      'message', '월 예약 한도 내에 있습니다.',
      'current_days', v_current_days,
      'max_days', p_max_days_per_month,
      'remaining_days', p_max_days_per_month - v_current_days
    );
  END IF;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', '월별 예약 한도 확인 중 오류가 발생했습니다.',
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- 4. 사용자 일별 예약 제한 체크 함수 (하루 최대 2개 시간대)
CREATE OR REPLACE FUNCTION check_user_daily_limit(
  p_user_id UUID,
  p_date DATE,
  p_max_slots_per_day INTEGER DEFAULT 2
) RETURNS JSON AS $$
DECLARE
  v_current_slots INTEGER;
  v_result JSON;
BEGIN
  -- 해당 날짜의 사용자 예약 슬롯 수 조회
  SELECT COUNT(*)
  INTO v_current_slots
  FROM reservations r
  JOIN reservation_slots rs ON r.id = rs.reservation_id
  WHERE r.user_id = p_user_id
    AND r.date = p_date
    AND r.status IN ('pending', 'approved');
  
  IF v_current_slots >= p_max_slots_per_day THEN
    v_result := json_build_object(
      'success', false,
      'message', format('하루 예약 한도를 초과했습니다. (%s/%s개)', v_current_slots, p_max_slots_per_day),
      'current_slots', v_current_slots,
      'max_slots', p_max_slots_per_day
    );
  ELSE
    v_result := json_build_object(
      'success', true,
      'message', '하루 예약 한도 내에 있습니다.',
      'current_slots', v_current_slots,
      'max_slots', p_max_slots_per_day,
      'remaining_slots', p_max_slots_per_day - v_current_slots
    );
  END IF;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', '일별 예약 한도 확인 중 오류가 발생했습니다.',
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- 완료 메시지
SELECT '동시성 제어 함수가 생성되었습니다!' as status;