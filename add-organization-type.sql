-- 단체 유형(학교/아동복지시설) 컬럼 추가 및 트리거 수정

-- 1. users 테이블에 organization_type 컬럼 추가
ALTER TABLE users
ADD COLUMN IF NOT EXISTS organization_type VARCHAR(20) DEFAULT 'school'
  CHECK (organization_type IN ('school', 'welfare'));

-- 2. 등급 자동 업데이트 트리거 함수 수정
CREATE OR REPLACE FUNCTION update_user_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- 아동복지시설인 경우 무조건 Standard 등급
  IF NEW.organization_type = 'welfare' THEN
    NEW.tier := 'Standard';
    RETURN NEW;
  END IF;

  -- 학교인 경우 student_count, class_count 기반으로 자동 계산
  IF NEW.student_count IS NOT NULL AND NEW.class_count IS NOT NULL THEN
    NEW.tier := calculate_user_tier(NEW.student_count, NEW.class_count);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 기존 사용자들은 모두 학교로 설정 (기본값)
UPDATE users
SET organization_type = 'school'
WHERE organization_type IS NULL;

-- 컬럼 설명 추가
COMMENT ON COLUMN users.organization_type IS '단체 유형: school(학교, 학생수/학급수 기반 등급) / welfare(아동복지시설, 무조건 Standard)';

-- 트리거 함수 설명 업데이트
COMMENT ON FUNCTION update_user_tier() IS
'회원 등급 자동 계산. 아동복지시설은 무조건 Standard, 학교는 student_count/class_count 기준으로 Priority/Standard 구분.';
