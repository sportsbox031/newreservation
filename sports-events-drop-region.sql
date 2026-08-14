-- 스포츠이벤트에서 지역 구분 제거 마이그레이션
-- events 테이블의 대상 지역 컬럼을 삭제한다. 이벤트는 지역과 무관한 전역 대상이 된다.
-- target_region_id는 public.regions(id)를 참조하므로, 컬럼을 삭제하면 해당 외래키 제약도 함께 제거된다.
-- 주의: regions/cities 테이블과 event_applications.region_id는 건드리지 않는다(스포츠교실 공유/향후 신청자 지역 기록용).
alter table public.events drop column if exists target_region_id;
alter table public.events drop column if exists target_type;
