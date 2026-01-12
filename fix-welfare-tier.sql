-- 아동복지시설 등급 처리를 위한 트리거 함수 수정
-- tier가 명시적으로 설정된 경우 (예: 아동복지시설의 Standard) 덮어쓰지 않음

CREATE OR REPLACE FUNCTION update_user_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- tier가 이미 명시적으로 설정된 경우 (INSERT 시 NEW.tier가 NULL이 아닌 경우)
  -- 트리거가 덮어쓰지 않고 그대로 유지
  IF TG_OP = 'INSERT' AND NEW.tier IS NOT NULL THEN
    -- 백엔드에서 명시적으로 tier를 설정한 경우 (예: 아동복지시설 → Standard)
    -- 트리거가 재계산하지 않고 그대로 유지
    RETURN NEW;
  END IF;

  -- tier가 설정되지 않은 경우에만 student_count, class_count 기반으로 자동 계산
  IF NEW.student_count IS NOT NULL AND NEW.class_count IS NOT NULL THEN
    NEW.tier := calculate_user_tier(NEW.student_count, NEW.class_count);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 설명 업데이트
COMMENT ON FUNCTION update_user_tier() IS
'회원 등급 자동 계산 함수. tier가 명시적으로 설정된 경우(아동복지시설 등)는 유지하고, 그렇지 않은 경우만 student_count/class_count 기준으로 자동 계산.';
