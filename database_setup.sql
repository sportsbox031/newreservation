-- 홈페이지 팝업 테이블 생성
CREATE TABLE IF NOT EXISTS homepage_popups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(20) DEFAULT 'html' CHECK (content_type IN ('html', 'markdown', 'text')),
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL,
  author_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_homepage_popups_active ON homepage_popups (is_active);
CREATE INDEX IF NOT EXISTS idx_homepage_popups_dates ON homepage_popups (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_homepage_popups_order ON homepage_popups (display_order);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE homepage_popups ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 활성화된 팝업 조회 가능 (홈페이지용)
CREATE POLICY "Anyone can view active popups" ON homepage_popups
  FOR SELECT USING (is_active = true AND start_date <= NOW() AND (end_date IS NULL OR end_date >= NOW()));

-- 관리자만 모든 팝업 조회/수정/삭제 가능 (관리자용)
CREATE POLICY "Admins can manage popups" ON homepage_popups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE id = auth.uid() OR id = (current_setting('request.jwt.claims', true)::json->>'admin_id')::uuid
    )
  );

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_homepage_popups_updated_at
  BEFORE UPDATE ON homepage_popups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 샘플 데이터 삽입 (테스트용)
INSERT INTO homepage_popups (title, content, content_type, start_date, author_id) 
SELECT 
  '스포츠박스 온라인 예약 시스템 오픈!',
  '<h2>🎉 스포츠박스 온라인 예약 시스템이 오픈되었습니다!</h2>
   <p>이제 <strong>온라인으로 간편하게</strong> 스포츠박스 프로그램을 예약하실 수 있습니다.</p>
   <ul>
     <li>✅ 실시간 예약 확인</li>
     <li>✅ 월 4일, 일 2타임 예약 가능</li>
     <li>✅ 경기남부·북부 31개 시·군 지원</li>
   </ul>
   <p style="color: #dc2626; font-weight: bold;">지금 바로 회원가입하고 건강한 생활을 시작하세요! 💪</p>',
  'html',
  NOW(),
  (SELECT id FROM admins LIMIT 1)
WHERE EXISTS (SELECT 1 FROM admins LIMIT 1);