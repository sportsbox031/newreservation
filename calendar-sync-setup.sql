-- 구글캘린더 연동: 예약 ↔ 구글 이벤트 매핑 테이블
-- 담당자가 지정된 예약을 지역별 구글캘린더에 동기화할 때 생성된 이벤트 ID를 기록한다.
-- reservation_id에 FK를 걸지 않는 이유: 예약이 삭제된 뒤에도 매핑이 남아 있어야
-- 다음 동기화 때 구글캘린더의 이벤트를 정리(삭제)할 수 있기 때문이다.

CREATE TABLE IF NOT EXISTS reservation_calendar_events (
  id BIGSERIAL PRIMARY KEY,
  reservation_id UUID NOT NULL UNIQUE,
  region_code TEXT NOT NULL CHECK (region_code IN ('south', 'north')),
  date DATE NOT NULL,
  calendar_id TEXT NOT NULL,
  google_event_id TEXT NOT NULL,
  payload_hash TEXT,                -- 마지막으로 보낸 이벤트 내용의 해시 (변경 없으면 구글 호출 생략)
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 이미 테이블을 만든 경우를 위한 컬럼 추가 (재실행해도 안전)
ALTER TABLE reservation_calendar_events ADD COLUMN IF NOT EXISTS payload_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_reservation_calendar_events_region_date
  ON reservation_calendar_events (region_code, date);

-- RLS 활성화 (정책 없음 = anon/authenticated 접근 차단, service role 키만 접근 가능)
ALTER TABLE reservation_calendar_events ENABLE ROW LEVEL SECURITY;
