-- admins 테이블에 phone, email 컬럼 추가

ALTER TABLE admins
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT '',
ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT '';

-- 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'admins'
ORDER BY ordinal_position;
