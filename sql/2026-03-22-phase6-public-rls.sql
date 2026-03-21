alter table regions enable row level security;
alter table cities enable row level security;
alter table announcements enable row level security;
alter table homepage_popups enable row level security;

drop policy if exists "public read regions" on regions;
drop policy if exists "public read cities" on cities;
drop policy if exists "public read published announcements" on announcements;
drop policy if exists "public read active popups" on homepage_popups;

create policy "public read regions"
on regions
for select
to anon, authenticated
using (true);

create policy "public read cities"
on cities
for select
to anon, authenticated
using (true);

create policy "public read published announcements"
on announcements
for select
to anon, authenticated
using (is_published = true);

create policy "public read active popups"
on homepage_popups
for select
to anon, authenticated
using (
  is_active = true
  and start_date <= now()
  and (end_date is null or end_date >= now())
);

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('regions', 'cities', 'announcements', 'homepage_popups')
order by tablename;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('regions', 'cities', 'announcements', 'homepage_popups')
order by tablename, policyname;
