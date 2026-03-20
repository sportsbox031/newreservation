-- 원자적 예약 생성 함수
-- Supabase SQL Editor에서 1회 적용 필요

CREATE OR REPLACE FUNCTION create_reservation_atomic(
  p_user_id UUID,
  p_region_id INTEGER,
  p_date DATE,
  p_slots JSONB
) RETURNS JSON AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_last_day INTEGER;
  v_max_days_per_month INTEGER := 4;
  v_existing_dates_count INTEGER := 0;
  v_reservation_id UUID;
  v_created_slots JSONB := '[]'::jsonb;
  v_slot JSONB;
  v_start_time TIME;
  v_end_time TIME;
  v_slot_order INTEGER;
  v_created_slot JSONB;
  v_has_duplicate_date BOOLEAN := false;
  v_has_duplicate_start_time BOOLEAN := false;
  v_start_times TEXT[] := ARRAY[]::TEXT[];
  v_blocked RECORD;
  v_lock_key BIGINT;
  v_lock_acquired BOOLEAN := false;
BEGIN
  v_year := EXTRACT(YEAR FROM p_date);
  v_month := EXTRACT(MONTH FROM p_date);
  v_last_day := EXTRACT(DAY FROM (date_trunc('month', p_date) + INTERVAL '1 month - 1 day'));

  v_lock_key := (p_region_id::BIGINT * 100000000) + (p_date - '2000-01-01'::DATE);
  v_lock_acquired := pg_try_advisory_xact_lock(v_lock_key);

  IF NOT v_lock_acquired THEN
    RETURN json_build_object(
      'success', false,
      'message', '신청이 몰려 예약을 처리 중입니다. 잠시 후 다시 시도해주세요.'
    );
  END IF;

  SELECT COALESCE(max_days_per_month, 4)
  INTO v_max_days_per_month
  FROM reservation_settings
  WHERE region_id = p_region_id
    AND year = v_year
    AND month = v_month
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM reservations
    WHERE user_id = p_user_id
      AND date = p_date
      AND status IN ('pending', 'approved', 'cancel_requested')
  ) INTO v_has_duplicate_date;

  IF v_has_duplicate_date THEN
    RETURN json_build_object(
      'success', false,
      'message', '이미 해당 날짜에 예약이 존재합니다. 같은 날짜에 중복 예약은 불가능합니다.'
    );
  END IF;

  SELECT COUNT(DISTINCT date)
  INTO v_existing_dates_count
  FROM reservations
  WHERE user_id = p_user_id
    AND date BETWEEN make_date(v_year, v_month, 1) AND make_date(v_year, v_month, v_last_day)
    AND status IN ('pending', 'approved', 'cancel_requested');

  IF v_existing_dates_count >= v_max_days_per_month THEN
    RETURN json_build_object(
      'success', false,
      'message', format('월 예약 한도를 초과했습니다. (%s/%s일)', v_existing_dates_count, v_max_days_per_month)
    );
  END IF;

  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    IF v_start_times @> ARRAY[(v_slot->>'start_time')] THEN
      v_has_duplicate_start_time := true;
      EXIT;
    END IF;

    v_start_times := array_append(v_start_times, v_slot->>'start_time');
  END LOOP;

  IF v_has_duplicate_start_time THEN
    RETURN json_build_object(
      'success', false,
      'message', '시작 시간이 중복됩니다. 각 타임의 시작 시간은 서로 달라야 합니다.'
    );
  END IF;

  FOR v_blocked IN
    SELECT *
    FROM blocked_dates
    WHERE region_id = p_region_id
      AND date = p_date
  LOOP
    IF v_blocked.start_time IS NULL OR v_blocked.end_time IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'message', format('%s은(는) 예약이 차단된 날짜입니다. 사유: %s', p_date, COALESCE(v_blocked.reason, '관리자 설정'))
      );
    END IF;

    FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
    LOOP
      v_start_time := (v_slot->>'start_time')::TIME;
      v_end_time := (v_slot->>'end_time')::TIME;

      IF v_start_time < v_blocked.end_time AND v_end_time > v_blocked.start_time THEN
        RETURN json_build_object(
          'success', false,
          'message', format('%s %s~%s는 예약이 차단된 시간대입니다. 사유: %s', p_date, v_blocked.start_time, v_blocked.end_time, COALESCE(v_blocked.reason, '관리자 설정'))
        );
      END IF;
    END LOOP;
  END LOOP;

  INSERT INTO reservations (user_id, region_id, date, status)
  VALUES (p_user_id, p_region_id, p_date, 'pending')
  RETURNING id INTO v_reservation_id;

  FOR v_slot IN
    SELECT value
    FROM jsonb_array_elements(p_slots)
  LOOP
    INSERT INTO reservation_slots (
      reservation_id,
      start_time,
      end_time,
      grade,
      participant_count,
      location,
      slot_order
    )
    VALUES (
      v_reservation_id,
      (v_slot->>'start_time')::TIME,
      (v_slot->>'end_time')::TIME,
      v_slot->>'grade',
      (v_slot->>'participant_count')::INTEGER,
      v_slot->>'location',
      (v_slot->>'slot_order')::INTEGER
    )
    RETURNING jsonb_build_object(
      'id', id,
      'start_time', start_time,
      'end_time', end_time,
      'grade', grade,
      'participant_count', participant_count,
      'location', location,
      'slot_order', slot_order
    ) INTO v_created_slot;

    v_created_slots := v_created_slots || jsonb_build_array(v_created_slot);
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'reservation', json_build_object(
      'id', v_reservation_id,
      'user_id', p_user_id,
      'region_id', p_region_id,
      'date', p_date,
      'status', 'pending',
      'reservation_slots', v_created_slots
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', COALESCE(SQLERRM, '예약 생성 중 오류가 발생했습니다.')
    );
END;
$$ LANGUAGE plpgsql;
