-- Supabase SQL editor에서 실행
-- 실적관리: 스포츠체험존(수기) + 교실/이벤트 수정 override
create table if not exists public.experience_zone_records (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  organization_name text not null,
  region_id integer references public.regions(id),
  city_id integer references public.cities(id),
  grade text,
  participant_count integer not null default 0 check (participant_count >= 0),
  memo text,
  created_by uuid references public.admins(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_experience_zone_records_date on public.experience_zone_records(date);
create index if not exists idx_experience_zone_records_region on public.experience_zone_records(region_id);

create table if not exists public.performance_overrides (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('sports_class','sports_event')),
  source_id uuid not null,
  grade text,
  participant_count integer check (participant_count is null or participant_count >= 0),
  memo text,
  excluded boolean not null default false,
  updated_by uuid references public.admins(id),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);
create index if not exists idx_performance_overrides_lookup on public.performance_overrides(source_type, source_id);
