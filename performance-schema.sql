-- Supabase SQL editor에서 실행
-- 실적관리: 수기 실적(스포츠교실/이벤트/체험존) + 교실/이벤트 수정 override
-- 주: 테이블명은 experience_zone_records이지만 program_type 컬럼 추가로 3개 프로그램 모두 수기 입력을 담는다.
create table if not exists public.experience_zone_records (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  organization_name text not null,
  region_id integer references public.regions(id),
  city_id integer references public.cities(id),
  grade text,
  participant_count integer not null default 0 check (participant_count >= 0),
  memo text,
  program_type text not null default 'experience_zone'
    check (program_type in ('sports_class','sports_event','experience_zone')),
  phone text,
  user_id uuid references public.users(id),
  created_by uuid references public.admins(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_experience_zone_records_date on public.experience_zone_records(date);
create index if not exists idx_experience_zone_records_region on public.experience_zone_records(region_id);

-- 기존 배포 테이블 마이그레이션(컬럼 추가). 신규 설치 시에는 위 create가 이미 포함하므로 no-op.
alter table public.experience_zone_records
  add column if not exists program_type text not null default 'experience_zone'
    check (program_type in ('sports_class','sports_event','experience_zone'));
alter table public.experience_zone_records
  add column if not exists phone text;
alter table public.experience_zone_records
  add column if not exists user_id uuid references public.users(id);

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
