-- 스포츠이벤트 예약 서브시스템 스키마
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  content_type text not null default 'html' check (content_type in ('html','text')),
  thumbnail_path text,
  video_url text,
  target_type text not null default 'all' check (target_type in ('all','region')),
  target_region_id integer references public.regions(id),
  is_open boolean not null default false,
  reservation_start_at timestamptz,
  reservation_end_at timestamptz,
  author_id uuid references public.admins(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_dates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  event_date date not null,
  label text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_event_dates_event on public.event_dates(event_id);

create table if not exists public.event_form_files (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  file_name text not null,
  file_size integer not null check (file_size <= 5242880),
  file_type text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);
create index if not exists idx_event_form_files_event on public.event_form_files(event_id);

create table if not exists public.event_applications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id),
  event_date_id uuid references public.event_dates(id),
  student_count integer not null default 0,
  leader_count integer not null default 0,
  total_count integer generated always as (student_count + leader_count) stored,
  applicant_org_name text,
  applicant_manager_name text,
  applicant_phone text,
  region_id integer references public.regions(id),
  status text not null default 'applied' check (status in ('applied','selected','rejected','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_event_applications_once
  on public.event_applications(event_id, user_id) where status <> 'cancelled';
create index if not exists idx_event_applications_event on public.event_applications(event_id);

create table if not exists public.event_submissions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.event_applications(id) on delete cascade,
  file_name text not null,
  file_size integer not null check (file_size <= 5242880),
  file_type text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);
create index if not exists idx_event_submissions_app on public.event_submissions(application_id);
