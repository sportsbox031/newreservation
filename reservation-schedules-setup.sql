-- 예약 자동 시작/종료 스케줄 테이블
-- 관리자가 지정한 한국 시간(KST)에 전체/티어별 예약을 자동으로 시작(open)하거나 종료(close)한다.
-- scheduled_at은 UTC(TIMESTAMPTZ)로 저장하며, 애플리케이션에서 KST 입력을 UTC로 변환해 저장한다.
-- 실행은 서버 API가 기한이 지난(pending) 스케줄을 원자적으로 클레임한 뒤
-- 기존 수동 제어와 동일한 로직(updateTierReservationStatusOnServer)을 호출하는 방식이다.

CREATE TABLE IF NOT EXISTS reservation_schedules (
  id BIGSERIAL PRIMARY KEY,
  region_code TEXT NOT NULL CHECK (region_code IN ('south', 'north')),
  year_month TEXT NOT NULL,                         -- 적용 대상 월 'YYYY-MM'
  tier_id INTEGER REFERENCES member_tiers(id),      -- NULL이면 전체 티어 대상
  action TEXT NOT NULL CHECK (action IN ('open', 'close')),
  scheduled_at TIMESTAMPTZ NOT NULL,                -- 실행 예정 시각 (UTC 저장, KST 입력)
  executed_at TIMESTAMPTZ,                          -- 실행(클레임) 시각. NULL = 대기중
  execution_result TEXT,                            -- 'success' | 'error: ...' | 'retry: ...'
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 기한 도래한 대기 스케줄 조회용 부분 인덱스
CREATE INDEX IF NOT EXISTS idx_reservation_schedules_due
  ON reservation_schedules (scheduled_at)
  WHERE executed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reservation_schedules_region
  ON reservation_schedules (region_code, scheduled_at DESC);

-- RLS 활성화 (정책 없음 = anon/authenticated 접근 차단, service role 키만 접근 가능)
ALTER TABLE reservation_schedules ENABLE ROW LEVEL SECURITY;
