-- Phase 1 RLS hardening
-- Apply only after the corresponding auth/session/users/admins browser calls
-- have been moved behind server APIs.

begin;

alter table public.users enable row level security;
alter table public.user_sessions enable row level security;
alter table public.admins enable row level security;
alter table public.admin_sessions enable row level security;

drop policy if exists "service role users" on public.users;
drop policy if exists "service role user_sessions" on public.user_sessions;
drop policy if exists "service role admins" on public.admins;
drop policy if exists "service role admin_sessions" on public.admin_sessions;

create policy "service role users"
on public.users
for all
to service_role
using (true)
with check (true);

create policy "service role user_sessions"
on public.user_sessions
for all
to service_role
using (true)
with check (true);

create policy "service role admins"
on public.admins
for all
to service_role
using (true)
with check (true);

create policy "service role admin_sessions"
on public.admin_sessions
for all
to service_role
using (true)
with check (true);

commit;

-- Verification
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('users', 'user_sessions', 'admins', 'admin_sessions')
order by tablename;
