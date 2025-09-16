-- Supabase 함수: 공지사항 조회수 증가
CREATE OR REPLACE FUNCTION increment_view_count(announcement_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE announcements 
    SET view_count = view_count + 1 
    WHERE id = announcement_id;
END;
$$ LANGUAGE plpgsql;