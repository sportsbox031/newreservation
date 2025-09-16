-- 수정된 공지사항 테이블 스키마 (기존 admins 테이블 사용)

-- 관리자 테이블에 지역 정보 컬럼 추가 (필요한 경우만)
ALTER TABLE admins ADD COLUMN IF NOT EXISTS region_id INTEGER REFERENCES regions(id);

-- 공지사항 테이블 생성
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES admins(id) NOT NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('all', 'region')),
    target_region_id INTEGER REFERENCES regions(id),
    is_important BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 공지사항 조회 기록 테이블
CREATE TABLE announcement_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(announcement_id, user_id)
);

-- 인덱스 생성
CREATE INDEX idx_announcements_target_type ON announcements(target_type);
CREATE INDEX idx_announcements_target_region ON announcements(target_region_id);
CREATE INDEX idx_announcements_important ON announcements(is_important);
CREATE INDEX idx_announcements_published ON announcements(is_published);
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);

-- RLS 활성화
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_views ENABLE ROW LEVEL SECURITY;

-- 사용자용 정책: 게시된 공지사항 중 본인 지역에 해당하는 것만 조회
CREATE POLICY "Users can view relevant announcements" ON announcements
    FOR SELECT USING (
        is_published = true AND (
            target_type = 'all' OR 
            (target_type = 'region' AND target_region_id = (
                SELECT c.region_id FROM users u 
                JOIN cities c ON u.city_id = c.id 
                WHERE u.id = auth.uid()
            ))
        )
    );

-- 관리자용 정책: 관리자는 권한 범위 내에서 공지사항 관리 가능
CREATE POLICY "Admins can manage announcements" ON announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins a 
            WHERE a.id = auth.uid() AND (
                a.role = 'super' OR 
                (a.role IN ('south', 'north') AND a.region_id = announcements.target_region_id)
            )
        )
    );

-- 조회 기록 정책
CREATE POLICY "Users can manage their views" ON announcement_views
    FOR ALL USING (user_id = auth.uid());