-- 티어 자동 계산 트리거 수정
-- 회원가입(INSERT) 시에만 작동하도록 변경
-- UPDATE 시에는 작동하지 않음 (관리자가 수동으로 관리)

-- 기존 트리거 삭제
DROP TRIGGER IF EXISTS trigger_update_user_tier ON users;

-- 새 트리거 생성 (INSERT 시에만 자동 계산)
CREATE TRIGGER trigger_update_user_tier
  BEFORE INSERT
  ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tier();

-- 트리거 설명
COMMENT ON TRIGGER trigger_update_user_tier ON users IS
'회원가입 시 학생수/학급수 기준으로 티어 자동 계산 (학생수 ≤240 OR 학급수 ≤11 → Priority, 그 외 → Standard). UPDATE 시에는 관리자가 수동으로 관리.';
