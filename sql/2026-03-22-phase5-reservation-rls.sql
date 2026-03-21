-- Phase 5: Reservation / settings / tier table RLS hardening
-- IMPORTANT:
-- 1. Apply this only after the Phase 4 code changes are deployed.
-- 2. This migration assumes browser clients no longer read these tables directly.
-- 3. Service-role based server routes remain allowed.

begin;

alter table if exists reservations enable row level security;
alter table if exists reservation_slots enable row level security;
alter table if exists reservation_settings enable row level security;
alter table if exists blocked_dates enable row level security;
alter table if exists daily_reservation_limits enable row level security;
alter table if exists tier_reservation_settings enable row level security;
alter table if exists reservation_logs enable row level security;
alter table if exists reservation_transactions enable row level security;

drop policy if exists "service role reservations" on reservations;
drop policy if exists "service role reservation_slots" on reservation_slots;
drop policy if exists "service role reservation_settings" on reservation_settings;
drop policy if exists "service role blocked_dates" on blocked_dates;
drop policy if exists "service role daily_reservation_limits" on daily_reservation_limits;
drop policy if exists "service role tier_reservation_settings" on tier_reservation_settings;
drop policy if exists "service role reservation_logs" on reservation_logs;
drop policy if exists "service role reservation_transactions" on reservation_transactions;

create policy "service role reservations"
on reservations
for all
to service_role
using (true)
with check (true);

create policy "service role reservation_slots"
on reservation_slots
for all
to service_role
using (true)
with check (true);

create policy "service role reservation_settings"
on reservation_settings
for all
to service_role
using (true)
with check (true);

create policy "service role blocked_dates"
on blocked_dates
for all
to service_role
using (true)
with check (true);

create policy "service role daily_reservation_limits"
on daily_reservation_limits
for all
to service_role
using (true)
with check (true);

create policy "service role tier_reservation_settings"
on tier_reservation_settings
for all
to service_role
using (true)
with check (true);

create policy "service role reservation_logs"
on reservation_logs
for all
to service_role
using (true)
with check (true);

create policy "service role reservation_transactions"
on reservation_transactions
for all
to service_role
using (true)
with check (true);

commit;

-- Verification 1: RLS enabled
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'reservations',
    'reservation_slots',
    'reservation_settings',
    'blocked_dates',
    'daily_reservation_limits',
    'tier_reservation_settings',
    'reservation_logs',
    'reservation_transactions'
  )
order by tablename;

-- Verification 2: policy presence
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'reservations',
    'reservation_slots',
    'reservation_settings',
    'blocked_dates',
    'daily_reservation_limits',
    'tier_reservation_settings',
    'reservation_logs',
    'reservation_transactions'
  )
order by tablename, policyname;
