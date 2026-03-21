# RLS Hardening Plan

## Goal

기능 이상 없이 Supabase RLS를 단계적으로 적용하기 위해, 먼저 브라우저의 민감 테이블 직접 접근을 서버 API 경유로 전환한다.

## Core Principles

- 이 프로젝트는 Supabase Auth가 아니라 커스텀 세션 구조다.
- 그래서 `authenticated` 정책을 정교하게 짜는 것보다, 브라우저가 민감 테이블을 직접 조회하지 못하게 하고 앱 서버 + `service_role`만 접근하게 만드는 것이 우선이다.
- RLS는 한 번에 전체 적용하지 않는다.
- 항상 `코드 선보완 -> 해당 테이블만 RLS 적용 -> 기능 테스트` 순서로 진행한다.

## Priority

1. 로그인/세션/회원가입 경로를 서버 API로 이동
2. `users`, `user_sessions`, `admins`, `admin_sessions`에 1차 RLS 적용
3. 예약/설정/티어 관련 직접 호출을 서버 API로 이동
4. `reservations`, `reservation_slots`, `reservation_settings`, `blocked_dates`, `daily_reservation_limits`, `tier_reservation_settings` 등에 2차 RLS 적용
5. 공개 테이블만 별도 공개 정책 유지
6. 마지막으로 세션을 `httpOnly` 쿠키로 전환

## Phase 1

### Code First

이 단계에서는 아직 Supabase에서 민감 테이블 RLS를 켜지 않는다.

먼저 서버 API로 옮겨야 하는 것:

- 사용자 로그인
- 회원가입
- 세션 검증
- 로그아웃/세션 종료
- 관리자 로그인

현재 위험 경로:

- `src/app/auth/login/page.tsx`
- `src/app/auth/register/page.tsx`
- `src/hooks/useSessionCheck.ts`
- `src/lib/supabase.ts`

이 단계 목표:

- 브라우저는 `/api/auth/*`만 호출
- `users`, `user_sessions`, `admins`, `admin_sessions`는 서버에서만 접근

## Phase 2

### Supabase SQL

Phase 1 코드 반영 후 실행한다.

대상 테이블:

- `users`
- `user_sessions`
- `admins`
- `admin_sessions`

```sql
alter table users enable row level security;
alter table user_sessions enable row level security;
alter table admins enable row level security;
alter table admin_sessions enable row level security;

drop policy if exists "service role users" on users;
drop policy if exists "service role user_sessions" on user_sessions;
drop policy if exists "service role admins" on admins;
drop policy if exists "service role admin_sessions" on admin_sessions;

create policy "service role users"
on users
for all
to service_role
using (true)
with check (true);

create policy "service role user_sessions"
on user_sessions
for all
to service_role
using (true)
with check (true);

create policy "service role admins"
on admins
for all
to service_role
using (true)
with check (true);

create policy "service role admin_sessions"
on admin_sessions
for all
to service_role
using (true)
with check (true);
```

검증 SQL:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
and tablename in ('users', 'user_sessions', 'admins', 'admin_sessions')
order by tablename;
```

## Phase 3

### Functional Checks

직접 확인할 것:

- 사용자 회원가입
- 사용자 로그인
- 대시보드 진입
- 로그아웃
- 관리자 로그인
- 관리자 진입

정상이어야 하는 상태:

- 앱 기능은 그대로 동작
- 브라우저에서 `users`나 `user_sessions`를 직접 치는 경로가 없어야 함

## Phase 4

### Next Code Migration

그 다음엔 예약/설정 계열 직접 호출을 서버 API로 이동한다.

옮길 대상:

- 내 예약 조회
- 사용자 정보 수정
- 관리자 설정 페이지의 `tier_reservation_settings`
- 차단일/설정 관련 직접 호출
- 예약 목록/슬롯 관련 직접 호출

목표:

- `reservations`
- `reservation_slots`
- `reservation_settings`
- `blocked_dates`
- `daily_reservation_limits`
- `tier_reservation_settings`

를 브라우저에서 직접 안 치게 만든다.

## Phase 5

### Supabase SQL

Phase 4 코드 반영 후 실행한다.

```sql
alter table reservations enable row level security;
alter table reservation_slots enable row level security;
alter table reservation_settings enable row level security;
alter table blocked_dates enable row level security;
alter table daily_reservation_limits enable row level security;
alter table tier_reservation_settings enable row level security;
alter table reservation_logs enable row level security;
alter table reservation_transactions enable row level security;

drop policy if exists "service role reservations" on reservations;
drop policy if exists "service role reservation_slots" on reservation_slots;
drop policy if exists "service role reservation_settings" on reservation_settings;
drop policy if exists "service role blocked_dates" on blocked_dates;
drop policy if exists "service role daily_reservation_limits" on daily_reservation_limits;
drop policy if exists "service role tier_reservation_settings" on tier_reservation_settings;
drop policy if exists "service role reservation_logs" on reservation_logs;
drop policy if exists "service role reservation_transactions" on reservation_transactions;

create policy "service role reservations"
on reservations for all to service_role
using (true) with check (true);

create policy "service role reservation_slots"
on reservation_slots for all to service_role
using (true) with check (true);

create policy "service role reservation_settings"
on reservation_settings for all to service_role
using (true) with check (true);

create policy "service role blocked_dates"
on blocked_dates for all to service_role
using (true) with check (true);

create policy "service role daily_reservation_limits"
on daily_reservation_limits for all to service_role
using (true) with check (true);

create policy "service role tier_reservation_settings"
on tier_reservation_settings for all to service_role
using (true) with check (true);

create policy "service role reservation_logs"
on reservation_logs for all to service_role
using (true) with check (true);

create policy "service role reservation_transactions"
on reservation_transactions for all to service_role
using (true) with check (true);
```

## Phase 6

### Public Table Policies

공개 허용 후보:

- `regions`
- `cities`
- 공개용 `announcements`
- 공개용 `homepage_popups`

```sql
alter table regions enable row level security;
alter table cities enable row level security;
alter table announcements enable row level security;
alter table homepage_popups enable row level security;

drop policy if exists "public read regions" on regions;
drop policy if exists "public read cities" on cities;
drop policy if exists "public read published announcements" on announcements;
drop policy if exists "public read active popups" on homepage_popups;

create policy "public read regions"
on regions for select
to anon, authenticated
using (true);

create policy "public read cities"
on cities for select
to anon, authenticated
using (true);

create policy "public read published announcements"
on announcements for select
to anon, authenticated
using (is_published = true);

create policy "public read active popups"
on homepage_popups for select
to anon, authenticated
using (is_active = true);
```

## Phase 7

### Session Hardening

RLS 적용이 안정화되면 세션을 `localStorage`에서 `httpOnly + Secure + SameSite=Strict` 쿠키로 전환한다.

## Supabase Execution Checklist

매 단계마다 아래 순서로 진행한다.

1. Supabase Dashboard 접속
2. SQL Editor 열기
3. 새 쿼리 생성
4. 해당 단계 SQL 실행
5. 검증 SQL 실행
6. 앱 기능 테스트

공통 검증 SQL:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```
