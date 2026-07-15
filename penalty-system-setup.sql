-- 사용자 패널티(경고/퇴장) 시스템
-- Supabase SQL Editor에서 실행하세요.

CREATE TABLE IF NOT EXISTS user_penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('warning', 'ejection')),
    reason VARCHAR(50) NOT NULL,
    -- 퇴장 시 신청이 제한되는 월 (KST 기준 퇴장 당월, 'YYYY-MM')
    restricted_month VARCHAR(7),
    -- 경고 누적으로 자동 퇴장된 경우 TRUE (수동 퇴장은 FALSE)
    triggered_by_warning BOOLEAN NOT NULL DEFAULT FALSE,
    -- 부여한 관리자 username
    issued_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_penalties_user_created
    ON user_penalties(user_id, created_at DESC);

-- 연도별 조회(1월 1일 자동 초기화는 조회 조건으로 처리)를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_user_penalties_created
    ON user_penalties(created_at DESC);

-- RLS: 정책을 만들지 않으므로 anon/authenticated 접근 차단.
-- 서버(service role)만 접근 가능.
ALTER TABLE user_penalties ENABLE ROW LEVEL SECURITY;
