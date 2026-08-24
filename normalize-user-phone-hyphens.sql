-- ============================================================================
-- 기존 회원 연락처(users.phone) 하이픈 형식 일괄 정규화
--   - 목표 형식: 000-0000-0000 (11자리 3-4-4), 10자리는 3-3-4
--   - 숫자만 추출한 뒤 자리수에 맞춰 하이픈을 삽입한다.
--   - 10/11자리가 아닌 값(비정상/해외/내선 등)은 건드리지 않는다.
--   - src/lib/phone.ts 의 formatPhoneNumber() 와 동일한 규칙.
--
-- 실행 방법: Supabase 대시보드 → SQL Editor 에 붙여넣고 실행.
-- 안전을 위해 먼저 STEP 1(미리보기)로 바뀔 대상을 확인한 뒤 STEP 2를 실행하세요.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1. 변경 대상 미리보기 (읽기 전용 — 실제 변경 없음)
-- 하이픈을 넣으면 값이 바뀌는 행만 before/after 로 보여준다.
-- ---------------------------------------------------------------------------
SELECT
  id,
  organization_name,
  phone AS before,
  CASE
    WHEN length(regexp_replace(phone, '\D', '', 'g')) = 11 THEN
      regexp_replace(regexp_replace(phone, '\D', '', 'g'), '(\d{3})(\d{4})(\d{4})', '\1-\2-\3')
    WHEN length(regexp_replace(phone, '\D', '', 'g')) = 10 THEN
      regexp_replace(regexp_replace(phone, '\D', '', 'g'), '(\d{3})(\d{3})(\d{4})', '\1-\2-\3')
    ELSE phone
  END AS after
FROM users
WHERE phone IS NOT NULL
  AND length(regexp_replace(phone, '\D', '', 'g')) IN (10, 11)
  AND phone <> CASE
    WHEN length(regexp_replace(phone, '\D', '', 'g')) = 11 THEN
      regexp_replace(regexp_replace(phone, '\D', '', 'g'), '(\d{3})(\d{4})(\d{4})', '\1-\2-\3')
    ELSE
      regexp_replace(regexp_replace(phone, '\D', '', 'g'), '(\d{3})(\d{3})(\d{4})', '\1-\2-\3')
  END
ORDER BY organization_name;

-- ---------------------------------------------------------------------------
-- STEP 2. 실제 정규화 실행
-- (STEP 1 결과가 예상과 같을 때만 실행)
-- ---------------------------------------------------------------------------
UPDATE users
SET phone = CASE
  WHEN length(regexp_replace(phone, '\D', '', 'g')) = 11 THEN
    regexp_replace(regexp_replace(phone, '\D', '', 'g'), '(\d{3})(\d{4})(\d{4})', '\1-\2-\3')
  WHEN length(regexp_replace(phone, '\D', '', 'g')) = 10 THEN
    regexp_replace(regexp_replace(phone, '\D', '', 'g'), '(\d{3})(\d{3})(\d{4})', '\1-\2-\3')
  ELSE phone
END
WHERE phone IS NOT NULL
  AND length(regexp_replace(phone, '\D', '', 'g')) IN (10, 11)
  -- 이미 올바른 형식인 행은 건너뛴다(불필요한 업데이트 방지).
  AND phone <> CASE
    WHEN length(regexp_replace(phone, '\D', '', 'g')) = 11 THEN
      regexp_replace(regexp_replace(phone, '\D', '', 'g'), '(\d{3})(\d{4})(\d{4})', '\1-\2-\3')
    ELSE
      regexp_replace(regexp_replace(phone, '\D', '', 'g'), '(\d{3})(\d{3})(\d{4})', '\1-\2-\3')
  END;

-- ---------------------------------------------------------------------------
-- STEP 3. (선택) 관리자 계정 연락처도 동일하게 정규화하려면 아래 실행.
--   admins.phone 은 신규 회원 알림톡 수신자로 쓰인다.
-- ---------------------------------------------------------------------------
-- UPDATE admins
-- SET phone = CASE
--   WHEN length(regexp_replace(phone, '\D', '', 'g')) = 11 THEN
--     regexp_replace(regexp_replace(phone, '\D', '', 'g'), '(\d{3})(\d{4})(\d{4})', '\1-\2-\3')
--   WHEN length(regexp_replace(phone, '\D', '', 'g')) = 10 THEN
--     regexp_replace(regexp_replace(phone, '\D', '', 'g'), '(\d{3})(\d{3})(\d{4})', '\1-\2-\3')
--   ELSE phone
-- END
-- WHERE phone IS NOT NULL
--   AND length(regexp_replace(phone, '\D', '', 'g')) IN (10, 11)
--   AND phone <> CASE
--     WHEN length(regexp_replace(phone, '\D', '', 'g')) = 11 THEN
--       regexp_replace(regexp_replace(phone, '\D', '', 'g'), '(\d{3})(\d{4})(\d{4})', '\1-\2-\3')
--     ELSE
--       regexp_replace(regexp_replace(phone, '\D', '', 'g'), '(\d{3})(\d{3})(\d{4})', '\1-\2-\3')
--   END;
