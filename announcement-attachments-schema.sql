-- Announcement Attachments Schema
-- 공지사항 파일 첨부 기능을 위한 데이터베이스 스키마

-- 첨부파일 테이블 생성
CREATE TABLE IF NOT EXISTS announcement_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,  -- 바이트 단위
    file_type VARCHAR(100) NOT NULL,  -- MIME type
    storage_path TEXT NOT NULL,  -- Supabase Storage 경로
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 파일 크기 제한: 5MB (5 * 1024 * 1024 = 5242880 bytes)
    CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 5242880)
);

-- 성능 최적화를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_attachments_announcement_id ON announcement_attachments(announcement_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_at ON announcement_attachments(uploaded_at DESC);

-- Row Level Security (RLS) 활성화
ALTER TABLE announcement_attachments ENABLE ROW LEVEL SECURITY;

-- RLS 정책 1: 사용자는 공개된 공지사항의 첨부파일만 조회 가능
CREATE POLICY "Users can view announcement attachments" ON announcement_attachments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM announcements a
            WHERE a.id = announcement_attachments.announcement_id
            AND a.is_published = true
        )
    );

-- RLS 정책 2: 관리자는 자신이 작성한 공지사항의 첨부파일 관리 가능
CREATE POLICY "Admins can manage announcement attachments" ON announcement_attachments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM announcements a
            WHERE a.id = announcement_attachments.announcement_id
        )
    );

-- 첨부파일 개수 확인 함수 (최대 3개 제한을 위한 헬퍼 함수)
CREATE OR REPLACE FUNCTION count_announcement_attachments(p_announcement_id UUID)
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM announcement_attachments
    WHERE announcement_id = p_announcement_id;
$$ LANGUAGE SQL STABLE;

-- 테이블 및 함수 설명 추가
COMMENT ON TABLE announcement_attachments IS '공지사항 첨부파일 정보를 저장하는 테이블';
COMMENT ON COLUMN announcement_attachments.announcement_id IS '연결된 공지사항 ID (ON DELETE CASCADE)';
COMMENT ON COLUMN announcement_attachments.file_name IS '원본 파일명';
COMMENT ON COLUMN announcement_attachments.file_size IS '파일 크기 (바이트, 최대 5MB)';
COMMENT ON COLUMN announcement_attachments.file_type IS 'MIME type (예: application/pdf, image/jpeg)';
COMMENT ON COLUMN announcement_attachments.storage_path IS 'Supabase Storage 내 파일 경로';
COMMENT ON FUNCTION count_announcement_attachments IS '특정 공지사항의 첨부파일 개수를 반환 (최대 3개 제한 검증용)';

-- 설치 확인 메시지
DO $$
BEGIN
    RAISE NOTICE '공지사항 첨부파일 스키마가 성공적으로 생성되었습니다.';
    RAISE NOTICE '다음 단계: Supabase Dashboard에서 "announcement-attachments" Storage 버킷을 생성하세요.';
END $$;
