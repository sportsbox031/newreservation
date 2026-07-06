-- 담당자(현장 요원) 관리 및 예약 배정 테이블
-- 지역별 담당자 등록/팀 구성/휴가 관리 + 예약별 담당자 배정(수동/랜덤)을 지원한다.
-- 접근은 service role 키를 사용하는 서버 API로만 이루어진다.

-- 담당자
CREATE TABLE IF NOT EXISTS staff_members (
  id BIGSERIAL PRIMARY KEY,
  region_code TEXT NOT NULL CHECK (region_code IN ('south', 'north')),
  name TEXT NOT NULL,
  team_no INTEGER,                                  -- 1, 2 ... NULL = 팀 미지정
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_members_region
  ON staff_members (region_code, sort_order);

-- 담당자 휴가일 (해당 날짜에는 배정 제외)
CREATE TABLE IF NOT EXISTS staff_vacations (
  id BIGSERIAL PRIMARY KEY,
  staff_id BIGINT NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_staff_vacations_date
  ON staff_vacations (date);

-- 예약별 담당자 배정
CREATE TABLE IF NOT EXISTS reservation_staff_assignments (
  id BIGSERIAL PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  staff_id BIGINT NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  team_no INTEGER,                                  -- 배정 당시 팀 번호 스냅샷 (수원시 팀 교대 판정용)
  method TEXT NOT NULL DEFAULT 'manual' CHECK (method IN ('manual', 'random_team', 'random_individual')),
  assigned_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reservation_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_reservation_staff_assignments_reservation
  ON reservation_staff_assignments (reservation_id);

-- RLS 활성화 (정책 없음 = anon/authenticated 접근 차단, service role 키만 접근 가능)
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_vacations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_staff_assignments ENABLE ROW LEVEL SECURITY;

-- 초기 담당자 등록 (테이블이 비어 있을 때만 실행되어 재실행해도 중복되지 않음)
-- 팀 구성은 기본값이며 관리자 페이지에서 언제든 변경 가능
INSERT INTO staff_members (region_code, name, team_no, sort_order)
SELECT * FROM (VALUES
  ('south', '박인규', 1, 1),
  ('south', '박광민', 1, 2),
  ('south', '조호석', 2, 3),
  ('south', '차수현', 2, 4),
  ('north', '김영빈', 1, 1),
  ('north', '박규민', 1, 2),
  ('north', '장지원', 2, 3),
  ('north', '황준혁', 2, 4)
) AS seed(region_code, name, team_no, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM staff_members);
