-- 회원 등급 시스템 추가
-- 학생수/학급수 기반 Priority/Standard 등급 구분

-- 1. users 테이블에 컬럼 추가
ALTER TABLE users
ADD COLUMN IF NOT EXISTS student_count INTEGER,
ADD COLUMN IF NOT EXISTS class_count INTEGER,
ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'Standard' CHECK (tier IN ('Priority', 'Standard'));

-- 2. 등급 자동 계산 함수
CREATE OR REPLACE FUNCTION calculate_user_tier(
  p_student_count INTEGER,
  p_class_count INTEGER
) RETURNS VARCHAR AS $$
BEGIN
  -- 학생수 240명 이하 OR 학급수 11개 이하 → Priority
  -- 둘 다 초과 → Standard
  IF p_student_count <= 240 OR p_class_count <= 11 THEN
    RETURN 'Priority';
  ELSE
    RETURN 'Standard';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. 등급 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_user_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- student_count 또는 class_count가 변경되면 tier 자동 계산
  IF NEW.student_count IS NOT NULL AND NEW.class_count IS NOT NULL THEN
    NEW.tier := calculate_user_tier(NEW.student_count, NEW.class_count);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 트리거 생성 (INSERT 및 UPDATE 시 자동 계산)
DROP TRIGGER IF EXISTS trigger_update_user_tier ON users;
CREATE TRIGGER trigger_update_user_tier
  BEFORE INSERT OR UPDATE OF student_count, class_count
  ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tier();

-- 5. 인덱스 추가 (등급별 조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);

-- 6. 기존 사용자 등급 초기화 (기본값: Standard)
UPDATE users
SET tier = 'Standard'
WHERE tier IS NULL;

COMMENT ON COLUMN users.student_count IS '학생 수';
COMMENT ON COLUMN users.class_count IS '학급 수';
COMMENT ON COLUMN users.tier IS '회원 등급: Priority(학생수 ≤240 OR 학급수 ≤11) / Standard';
