# 스포츠이벤트 Phase 1 — 관리자 이벤트 CRUD 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대표/지역 관리자가 스포츠이벤트를 생성·수정·삭제하고(이벤트명·대표이미지·HTML설명·영상URL·일정 날짜들·서류양식파일), 예약 시작/종료를 토글할 수 있게 한다.

**Architecture:** 스포츠교실 예약과 분리된 전용 테이블(`events`, `event_dates`, `event_form_files`, 그리고 후속 Phase용 `event_applications`, `event_submissions`)을 신설한다. 쓰기는 전부 service-role Supabase 클라이언트를 쓰는 Next.js API 라우트에서만 수행하고, 기존 관리자 라우트 스켈레톤(`validateApiRequest` → `isAdmin` → 지역 스코프 + 소유권)을 그대로 따른다. 순수 로직(모집상태 계산·입력 검증)은 `src/lib`로 추출해 `node:test`로 단위 테스트한다.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Supabase(PostgreSQL, service-role), Supabase Storage, `node:test`, React Hook Form + Zod, Tailwind, 기존 컴포넌트(`RichTextEditor`, `FileUploadManager`, `AdminNavigation`).

**Spec:** `docs/superpowers/specs/2026-08-13-sports-event-reservation-design.md`

## Global Constraints

- 클라이언트에서 Supabase에 직접 쓰기 금지. 반드시 `/api/**/route.ts`에서 `createClient<Database>(url, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })` 사용.
- 모든 쿼리는 `withTimeout`/`runQueryWithTimeout`로 감싸고 `{ data, error }` 형태로 반환(`src/lib/requestUtils.ts`).
- 사용자 노출 오류 문자열은 한국어, `{ error: { message } }` 또는 `{ error: string }` 형태.
- 타입은 이중 소스: `database.types.ts`(Supabase 생성) + `src/types/database.ts`(좁힌 union + `export type` alias). 스키마 변경 시 `npm run gen:types`(pnpm 필요).
- 파일 검증은 `src/lib/fileValidation.ts` 단일 소스 사용. `MAX_FILE_SIZE`=5MB. 허용 확장자: pdf/hwp/hwpx/jpg/jpeg/png(+기존 목록). hwp/hwpx는 확장자 기반 검증.
- 관리자 인증/권한: `src/lib/auth.ts`의 `validateApiRequest`·`isAdmin`, 지역 스코프는 `src/lib/reservationManagementHelpers.ts`의 `resolveReservationRegionScope`.
- 비-super 관리자는 대상 지역이 본인 지역으로 강제되고, 본인 `author_id` 이벤트만 수정/삭제.
- 테스트 실행: 단일 파일 `node --test src/lib/<name>.test.ts`, 전체 `node --test`. 테스트는 소스 옆에 `*.test.ts`로 두고 `.ts` 확장자로 import.
- 커밋 메시지 말미: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure (Phase 1)

**생성:**
- `sports-events-schema.sql` — 이벤트 서브시스템 전체 테이블 5개 DDL(Phase 1은 앞 3개 사용, 나머지는 후속 Phase가 사용).
- `src/lib/eventReservationStatus.ts` + `.test.ts` — 모집상태(effectiveOpen) 순수 계산.
- `src/lib/eventAdminHelpers.ts` + `.test.ts` — 이벤트 입력 검증 + 지역 스코프 래퍼.
- `src/lib/eventServer.ts` — 이벤트 CRUD 서버 로직(service-role, `authServer.ts` 패턴).
- `src/app/api/admin/events/route.ts` — 이벤트 CRUD 라우트.
- `src/app/api/admin/events/image/route.ts` — 대표이미지 업로드(public 버킷).
- `src/app/api/admin/events/files/route.ts` — 서류양식파일 업로드/삭제(private 버킷).
- `src/app/api/admin/events/status/route.ts` — 예약 시작/종료 토글.
- `src/app/admin/events/page.tsx` — 관리자 이벤트 목록 + 생성/수정 폼.

**수정:**
- `database.types.ts` — `gen:types`로 재생성.
- `src/types/database.ts` — 이벤트 타입 alias 추가.
- `src/components/AdminNavigation.tsx` — "스포츠이벤트" 메뉴 추가.
- `src/app/admin/page.tsx` — super 대시보드에 이벤트 카드 추가.

---

## Task 1: 데이터베이스 스키마 + 타입

**Files:**
- Create: `sports-events-schema.sql`
- Modify: `database.types.ts` (regenerate), `src/types/database.ts`

**Interfaces:**
- Produces: 테이블 `events`, `event_dates`, `event_form_files`, `event_applications`, `event_submissions`. 타입 alias `Event`, `EventDate`, `EventFormFile`, `EventApplication`, `EventSubmission` in `src/types/database.ts`.

- [ ] **Step 1: 스키마 SQL 작성**

`sports-events-schema.sql` 생성:

```sql
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
```

- [ ] **Step 2: Supabase에 스키마 적용**

Supabase SQL 편집기에 위 파일 내용을 실행. 5개 테이블이 생성됐는지 `public` 스키마에서 확인.

- [ ] **Step 3: 타입 재생성**

Run: `npm run gen:types`
Expected: `database.types.ts`에 `events`/`event_dates`/`event_form_files`/`event_applications`/`event_submissions` Row/Insert/Update 타입이 추가됨.

- [ ] **Step 4: 타입 alias 추가**

`src/types/database.ts`에 기존 alias 블록을 따라 추가:

```typescript
export type Event = Database['public']['Tables']['events']['Row']
export type EventDate = Database['public']['Tables']['event_dates']['Row']
export type EventFormFile = Database['public']['Tables']['event_form_files']['Row']
export type EventApplication = Database['public']['Tables']['event_applications']['Row']
export type EventSubmission = Database['public']['Tables']['event_submissions']['Row']

export type EventContentType = 'html' | 'text'
export type EventTargetType = 'all' | 'region'
export type EventApplicationStatus = 'applied' | 'selected' | 'rejected' | 'cancelled'
```

- [ ] **Step 5: 빌드 확인 후 커밋**

Run: `npm run build` (타입 에러 없이 통과 확인 — `next.config.ts`가 빌드 에러를 무시하므로 실제 에러 로그도 확인)

```bash
git add sports-events-schema.sql database.types.ts src/types/database.ts
git commit -m "feat(events): add sports event schema and types"
```

---

## Task 2: 모집상태 계산 순수 헬퍼 (TDD)

**Files:**
- Create: `src/lib/eventReservationStatus.ts`
- Test: `src/lib/eventReservationStatus.test.ts`

**Interfaces:**
- Produces: `computeEffectiveOpen(event: { is_open: boolean; reservation_start_at: string | null; reservation_end_at: string | null }, nowIso: string): boolean`. 스케줄이 하나라도 설정되면 스케줄 우선(`start<=now<end`), 없으면 `is_open` 반환.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/eventReservationStatus.test.ts`:

```typescript
import test from 'node:test'
import assert from 'node:assert/strict'

import { computeEffectiveOpen } from './eventReservationStatus.ts'

const NOW = '2026-08-13T05:00:00.000Z'

test('스케줄이 없으면 is_open 값을 그대로 사용', () => {
  assert.equal(computeEffectiveOpen({ is_open: true, reservation_start_at: null, reservation_end_at: null }, NOW), true)
  assert.equal(computeEffectiveOpen({ is_open: false, reservation_start_at: null, reservation_end_at: null }, NOW), false)
})

test('시작~종료 창 안이면 open (is_open=false여도 스케줄 우선)', () => {
  assert.equal(
    computeEffectiveOpen({ is_open: false, reservation_start_at: '2026-08-13T00:00:00.000Z', reservation_end_at: '2026-08-14T00:00:00.000Z' }, NOW),
    true
  )
})

test('시작 전이면 closed', () => {
  assert.equal(
    computeEffectiveOpen({ is_open: true, reservation_start_at: '2026-08-20T00:00:00.000Z', reservation_end_at: null }, NOW),
    false
  )
})

test('종료 시각 이후면 closed (경계: end는 배타적)', () => {
  assert.equal(
    computeEffectiveOpen({ is_open: true, reservation_start_at: null, reservation_end_at: '2026-08-13T05:00:00.000Z' }, NOW),
    false
  )
})

test('종료만 설정되고 아직 종료 전이면 open', () => {
  assert.equal(
    computeEffectiveOpen({ is_open: false, reservation_start_at: null, reservation_end_at: '2026-08-14T00:00:00.000Z' }, NOW),
    true
  )
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test src/lib/eventReservationStatus.test.ts`
Expected: FAIL (`computeEffectiveOpen` 모듈 없음).

- [ ] **Step 3: 최소 구현**

`src/lib/eventReservationStatus.ts`:

```typescript
type EventOpenInput = {
  is_open: boolean
  reservation_start_at: string | null
  reservation_end_at: string | null
}

export function computeEffectiveOpen(event: EventOpenInput, nowIso: string): boolean {
  const { reservation_start_at, reservation_end_at } = event
  const hasSchedule = Boolean(reservation_start_at) || Boolean(reservation_end_at)

  if (!hasSchedule) {
    return event.is_open
  }

  const now = new Date(nowIso).getTime()
  if (reservation_start_at && now < new Date(reservation_start_at).getTime()) {
    return false
  }
  if (reservation_end_at && now >= new Date(reservation_end_at).getTime()) {
    return false
  }
  return true
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test src/lib/eventReservationStatus.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/eventReservationStatus.ts src/lib/eventReservationStatus.test.ts
git commit -m "feat(events): add effective-open computation helper"
```

---

## Task 3: 이벤트 입력 검증 + 지역 스코프 헬퍼 (TDD)

**Files:**
- Create: `src/lib/eventAdminHelpers.ts`
- Test: `src/lib/eventAdminHelpers.test.ts`

**Interfaces:**
- Consumes: `resolveReservationRegionScope(adminRole, requestedRegionCode)` from `src/lib/reservationManagementHelpers.ts`.
- Produces:
  - `validateEventInput(input): { ok: true; value: NormalizedEventInput } | { ok: false; message: string }`
  - `NormalizedEventInput = { title: string; description: string; content_type: 'html'|'text'; video_url: string | null; target_type: 'all'|'region'; target_region_code: 'south'|'north'|null; dates: { event_date: string; label: string | null; sort_order: number }[] }`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/eventAdminHelpers.test.ts`:

```typescript
import test from 'node:test'
import assert from 'node:assert/strict'

import { validateEventInput } from './eventAdminHelpers.ts'

test('제목이 없으면 거부', () => {
  const r = validateEventInput({ title: '  ', target_type: 'all', dates: [{ event_date: '2026-09-01' }] })
  assert.equal(r.ok, false)
})

test('일정 날짜가 하나도 없으면 거부', () => {
  const r = validateEventInput({ title: '가을 스포츠', target_type: 'all', dates: [] })
  assert.equal(r.ok, false)
})

test("target_type='region'인데 지역이 없으면 거부", () => {
  const r = validateEventInput({ title: 'x', target_type: 'region', target_region_code: null, dates: [{ event_date: '2026-09-01' }] })
  assert.equal(r.ok, false)
})

test('정상 입력은 정규화되어 통과', () => {
  const r = validateEventInput({
    title: '  가을 스포츠  ',
    description: '<p>hi</p>',
    content_type: 'html',
    video_url: '',
    target_type: 'region',
    target_region_code: 'south',
    dates: [{ event_date: '2026-09-02', label: '오전' }, { event_date: '2026-09-01' }],
  })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.value.title, '가을 스포츠')
    assert.equal(r.value.video_url, null)
    assert.equal(r.value.target_region_code, 'south')
    assert.equal(r.value.dates.length, 2)
  }
})

test('잘못된 날짜 형식은 거부', () => {
  const r = validateEventInput({ title: 'x', target_type: 'all', dates: [{ event_date: '2026/09/01' }] })
  assert.equal(r.ok, false)
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test src/lib/eventAdminHelpers.test.ts`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 최소 구현**

`src/lib/eventAdminHelpers.ts`:

```typescript
export type NormalizedEventDate = { event_date: string; label: string | null; sort_order: number }

export type NormalizedEventInput = {
  title: string
  description: string
  content_type: 'html' | 'text'
  video_url: string | null
  target_type: 'all' | 'region'
  target_region_code: 'south' | 'north' | null
  dates: NormalizedEventDate[]
}

type ValidateResult =
  | { ok: true; value: NormalizedEventInput }
  | { ok: false; message: string }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function validateEventInput(input: unknown): ValidateResult {
  const raw = (input ?? {}) as Record<string, unknown>

  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (!title) {
    return { ok: false, message: '이벤트명을 입력해주세요.' }
  }

  const content_type = raw.content_type === 'text' ? 'text' : 'html'
  const target_type = raw.target_type === 'region' ? 'region' : 'all'

  let target_region_code: 'south' | 'north' | null = null
  if (target_type === 'region') {
    if (raw.target_region_code !== 'south' && raw.target_region_code !== 'north') {
      return { ok: false, message: '대상 지역을 선택해주세요.' }
    }
    target_region_code = raw.target_region_code
  }

  const rawDates = Array.isArray(raw.dates) ? raw.dates : []
  if (rawDates.length === 0) {
    return { ok: false, message: '일정 날짜를 최소 1개 이상 추가해주세요.' }
  }

  const dates: NormalizedEventDate[] = []
  for (let i = 0; i < rawDates.length; i++) {
    const d = (rawDates[i] ?? {}) as Record<string, unknown>
    const event_date = typeof d.event_date === 'string' ? d.event_date : ''
    if (!ISO_DATE.test(event_date)) {
      return { ok: false, message: '일정 날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' }
    }
    dates.push({
      event_date,
      label: typeof d.label === 'string' && d.label.trim() ? d.label.trim() : null,
      sort_order: typeof d.sort_order === 'number' ? d.sort_order : i,
    })
  }

  const videoRaw = typeof raw.video_url === 'string' ? raw.video_url.trim() : ''
  const description = typeof raw.description === 'string' ? raw.description : ''

  return {
    ok: true,
    value: { title, description, content_type, video_url: videoRaw || null, target_type, target_region_code, dates },
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test src/lib/eventAdminHelpers.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/eventAdminHelpers.ts src/lib/eventAdminHelpers.test.ts
git commit -m "feat(events): add event input validation helper"
```

---

## Task 4: 이벤트 CRUD 서버 로직 + 라우트

**Files:**
- Create: `src/lib/eventServer.ts`, `src/app/api/admin/events/route.ts`

**Interfaces:**
- Consumes: `validateEventInput` (Task 3), `resolveReservationRegionScope`, `validateApiRequest`/`isAdmin` (`src/lib/auth.ts`), service-role client pattern (`src/lib/authServer.ts:16-23`).
- Produces:
  - `listEventsOnServer(scope): Promise<{ data, error }>`
  - `createEventOnServer(input: NormalizedEventInput, authorId: string, regionId: number | null): Promise<{ data, error }>`
  - `updateEventOnServer(id, input, requester): Promise<{ data, error }>`
  - `deleteEventOnServer(id, requester): Promise<{ data, error }>`
  - 라우트: `GET/POST/PUT?id=/DELETE?id= /api/admin/events`

- [ ] **Step 1: 서버 로직 작성 (`src/lib/eventServer.ts`)**

`src/lib/authServer.ts`의 `supabaseAdmin`/`runQueryWithTimeout` 패턴을 그대로 복제(같은 파일에 import 재사용 대신 동일 초기화). 핵심 함수:

```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import type { NormalizedEventInput } from '@/lib/eventAdminHelpers'

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)
const QUERY_TIMEOUT_MS = 8000
const q = <T,>(p: PromiseLike<T>, m: string) => withTimeout(p, QUERY_TIMEOUT_MS, m)

async function regionIdForCode(code: 'south' | 'north' | null): Promise<number | null> {
  if (!code) return null
  const { data } = await q(
    supabaseAdmin.from('regions').select('id').eq('code', code).single(),
    '지역 정보를 불러오는 중 시간이 초과되었습니다.'
  )
  return data?.id ?? null
}

export async function createEventOnServer(input: NormalizedEventInput, authorId: string) {
  try {
    const target_region_id = await regionIdForCode(input.target_region_code)
    const { data: event, error } = await q(
      supabaseAdmin.from('events').insert([{
        title: input.title,
        description: input.description,
        content_type: input.content_type,
        video_url: input.video_url,
        target_type: input.target_type,
        target_region_id,
        author_id: authorId,
      }]).select().single(),
      '이벤트 생성 중 시간이 초과되었습니다.'
    )
    if (error || !event) return { data: null, error: error || { message: '이벤트 생성에 실패했습니다.' } }

    if (input.dates.length > 0) {
      const rows = input.dates.map((d) => ({ event_id: event.id, event_date: d.event_date, label: d.label, sort_order: d.sort_order }))
      const { error: dErr } = await q(supabaseAdmin.from('event_dates').insert(rows), '일정 저장 중 시간이 초과되었습니다.')
      if (dErr) return { data: null, error: dErr }
    }
    return { data: event, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '이벤트 생성 중 오류가 발생했습니다.') } }
  }
}
```

`updateEventOnServer(id, input, requester)`: 먼저 `events`에서 `author_id`/`target_region_id` 조회 → requester가 super가 아니면 `author_id === requester.id` 확인(아니면 `{ error: { message: '본인이 등록한 이벤트만 수정할 수 있습니다.' } }`), 지역관리자는 `target_region_code`가 본인 지역인지 `resolveReservationRegionScope`로 강제. 이후 `events` update + `event_dates` 전체 삭제 후 재삽입(통째 교체).

`deleteEventOnServer(id, requester)`: 동일한 소유권/지역 확인 후 `events` 삭제(CASCADE로 하위 정리).

`listEventsOnServer(scope)`: super면 전체, 지역관리자면 `target_type='all' OR target_region_id=본인지역`. `events` + `event_dates(count)` 선택, `created_at desc` 정렬.

- [ ] **Step 2: 라우트 작성 (`src/app/api/admin/events/route.ts`)**

`src/app/api/admin/announcements/route.ts`의 구조를 미러. 스켈레톤:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validateApiRequest, isAdmin } from '@/lib/auth'
import { validateEventInput } from '@/lib/eventAdminHelpers'
import { resolveReservationRegionScope } from '@/lib/reservationManagementHelpers'
import { createEventOnServer, updateEventOnServer, deleteEventOnServer, listEventsOnServer } from '@/lib/eventServer'
import { getErrorMessage } from '@/lib/requestUtils'

async function requireAdmin(request: NextRequest) {
  const auth = await validateApiRequest(request)
  if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
    return { ok: false as const, response: NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 }) }
  }
  return { ok: true as const, user: auth.user }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response
  try {
    const body = await request.json()
    const parsed = validateEventInput(body)
    if (!parsed.ok) return NextResponse.json({ error: { message: parsed.message } }, { status: 400 })

    // 지역 스코프 강제: 지역관리자는 본인 지역 or 전체만
    if (parsed.value.target_type === 'region') {
      const scope = resolveReservationRegionScope(admin.user.role, parsed.value.target_region_code)
      if (!scope.ok) return NextResponse.json({ error: { message: scope.message } }, { status: 403 })
    }
    const result = await createEventOnServer(parsed.value, admin.user.id)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '이벤트 생성 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}
// GET(list), PUT(?id=, update), DELETE(?id=, delete) 동일 패턴
```

> 참고: `resolveReservationRegionScope`의 실제 시그니처/반환형은 `src/lib/reservationManagementHelpers.ts:4-32`를 열어 확인하고 그에 맞춰 호출. `admin.user.role`/`admin.user.id`/`admin.user.region_code`는 `src/lib/auth.ts:21-33`의 `AuthResult` 형태.

- [ ] **Step 3: 빌드 및 수동 검증**

Run: `npm run build` (에러 로그 확인)
수동: 로그인한 super 관리자 토큰으로 `POST /api/admin/events`(제목·일정 1개)를 호출해 200 + 생성된 이벤트 반환 확인. `GET`으로 목록에 나오는지 확인. (검증 스킬 `/verify`로 실제 플로우 구동 권장.)

- [ ] **Step 4: 커밋**

```bash
git add src/lib/eventServer.ts src/app/api/admin/events/route.ts
git commit -m "feat(events): add admin event CRUD server logic and route"
```

---

## Task 5: 대표이미지 업로드 라우트

**Files:**
- Create: `src/app/api/admin/events/image/route.ts`

**Interfaces:**
- Consumes: `validateApiRequest`/`isAdmin`, `sanitizeFileName`/`validateFile` (`src/lib/fileValidation.ts`).
- Produces: `POST /api/admin/events/image` (multipart) → `{ data: { path, publicUrl } }`.

- [ ] **Step 1: 라우트 작성 (popup image 미러)**

`src/app/api/admin/popups/image/route.ts:14,68-101`를 미러. 버킷 `event-images`를 (없으면) public으로 자동 생성 → `templates`가 아니라 이미지이므로 경로 `events/{timestamp}_{safeName}` → 업로드 후 `getPublicUrl` 반환. 검증은 이미지 확장자(jpg/jpeg/png)만 허용하도록 `validateFile` 사용.

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`

- [ ] **Step 3: 수동 검증 + 커밋**

이미지 업로드 → 반환된 publicUrl이 브라우저에서 열리는지 확인.

```bash
git add src/app/api/admin/events/image/route.ts
git commit -m "feat(events): add event thumbnail upload route"
```

---

## Task 6: 서류양식파일 업로드/삭제 라우트

**Files:**
- Create: `src/app/api/admin/events/files/route.ts`

**Interfaces:**
- Consumes: `validateApiRequest`/`isAdmin`, `validateFile`/`validateFileMetadata`/`sanitizeFileName`/`validateAttachmentCount` (`src/lib/fileValidation.ts`).
- Produces: `POST` (event_id + 파일 → `event-files` private 버킷 `templates/{eventId}/…` + `event_form_files` 행), `DELETE ?id=&path=` (스토리지+DB 삭제).

- [ ] **Step 1: 라우트 작성 (attachments 미러)**

`src/app/api/admin/announcements/attachments/route.ts`를 미러. 차이점: 버킷 `event-files`(private, 없으면 생성), 경로 `templates/{eventId}/{timestamp}_{safeName}`, 개수 제한 5(양식). `event_form_files`에 메타 저장.

- [ ] **Step 2: 빌드 확인 후 수동 검증 + 커밋**

Run: `npm run build`
수동: hwp/hwpx/pdf 각각 업로드되고 목록/삭제 동작 확인.

```bash
git add src/app/api/admin/events/files/route.ts
git commit -m "feat(events): add event form-file upload/delete route"
```

---

## Task 7: 예약 시작/종료 토글 라우트

**Files:**
- Create: `src/app/api/admin/events/status/route.ts`

**Interfaces:**
- Consumes: `validateApiRequest`/`isAdmin`, 소유권/지역 확인(Task 4 서버 로직 재사용 가능).
- Produces: `PATCH /api/admin/events/status?id=` body `{ is_open: boolean }` → 이벤트 `is_open` 갱신.

- [ ] **Step 1: 라우트 작성**

`requireAdmin` 후 대상 이벤트 조회 → 소유권/지역 확인 → `events.is_open` update. 스케줄이 설정된 이벤트에 수동 토글을 하면 혼동될 수 있으므로, `reservation_start_at`/`reservation_end_at`이 모두 있는 경우 `{ error: { message: '자동 스케줄이 설정된 이벤트는 수동 토글할 수 없습니다. 스케줄을 먼저 해제하세요.' } }` 반환(스펙 §7의 자동/수동 모드 분리).

- [ ] **Step 2: 빌드 확인 후 커밋**

```bash
git add src/app/api/admin/events/status/route.ts
git commit -m "feat(events): add event open/close toggle route"
```

---

## Task 8: 관리자 이벤트 목록 + 생성/수정 UI

**Files:**
- Create: `src/app/admin/events/page.tsx`
- Modify: `src/components/AdminNavigation.tsx`, `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: 위 라우트들, `RichTextEditor` (`src/components/RichTextEditor.tsx`, props `{ value, onChange, placeholder }`), `FileUploadManager` (`src/components/FileUploadManager.tsx`), `react-calendar` 또는 단순 날짜 입력.

- [ ] **Step 1: 네비게이션 항목 추가**

`src/components/AdminNavigation.tsx`에 "스포츠이벤트" 링크(`/admin/events`) 추가. 기존 링크 배열 패턴을 그대로 따름. `adminRole`에 관계없이 노출(super+지역).

- [ ] **Step 2: 목록 페이지 작성**

`src/app/admin/page.tsx`(super 대시보드)와 `src/app/admin/announcements/page.tsx`(CRUD 폼 패턴, `handleSubmit` 파일 오케스트레이션 :169-262)를 참고. `'use client'`, `localStorage.adminInfo`로 세션 확인. 이벤트 목록 테이블(이벤트명·대상지역·모집상태·일정 수·신청 수) + "새 이벤트" 버튼.

- [ ] **Step 3: 생성/수정 폼 구현**

모달 또는 별도 섹션:
- 이벤트명(text), 대표이미지(업로드 → `/api/admin/events/image`), 설명(`RichTextEditor`, `content_type` 함께 저장), 영상 URL(text), 일정 날짜 다중 추가(날짜 입력 + 라벨), 서류양식파일(`FileUploadManager` → `/api/admin/events/files`), 대상 지역(전체/남부/북부, 지역관리자는 본인 지역 고정).
- 저장 시: 이벤트 생성(`POST /api/admin/events`) → 반환 id로 이미지/파일 연결. 수정은 `PUT ?id=`.
- 각 이벤트 행에 예약 시작/종료 토글(`PATCH /api/admin/events/status`).

- [ ] **Step 4: 빌드 + 실제 플로우 검증**

Run: `npm run build`
`/verify` 스킬 또는 `/run`으로 앱 구동 → 관리자로 로그인 → 이벤트 생성(이미지+HTML설명+일정+양식파일) → 목록 표시 → 수정 → 예약 시작/종료 토글 → 삭제까지 end-to-end 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/app/admin/events/page.tsx src/components/AdminNavigation.tsx src/app/admin/page.tsx
git commit -m "feat(events): add admin event management UI"
```

---

## Self-Review (작성자 체크)

**Spec coverage (Phase 1 범위):**
- 관리자 이벤트 생성/수정/삭제 → Task 4, 8 ✅
- 이벤트명·대표이미지·설명(HTML+미리보기)·영상URL·일정·서류양식파일 → Task 5(이미지), 6(양식), 8(RichTextEditor로 HTML 양방향 미리보기 재사용) ✅
- 지역 target + 지역관리자 스코프 → Task 3(검증), 4(스코프 강제) ✅
- 예약 시작/종료 수동 토글 → Task 7, 8 ✅
- 모집상태 계산(읽기시점, Phase 4 사용 예정이나 토글 의미 정의) → Task 2 ✅
- Phase 2~4 항목(사용자 캐러셀/신청/서류제출/선정/cron)은 본 계획 범위 밖 — 후속 계획서.

**Placeholder scan:** 순수 로직 태스크(2,3)는 실제 테스트 코드 포함. 라우트/UI 태스크는 미러 대상 파일을 `path:line`으로 지정 — 이 저장소는 라우트/UI를 단위 테스트하지 않는 패턴이므로 검증은 빌드+수동/`/verify`로 명시.

**Type consistency:** `NormalizedEventInput`(Task 3) → `createEventOnServer`(Task 4)에서 동일 사용. `computeEffectiveOpen` 입력형(Task 2)은 `events` 컬럼(Task 1)과 일치. `content_type`/`target_type`/`status` 리터럴이 스키마 CHECK와 alias union에 일치.

## 남은 확인 / 위험 요소

- **`resolveReservationRegionScope` 실제 시그니처**: 구현 시 `src/lib/reservationManagementHelpers.ts:4-32`를 열어 반환형(`{ ok, message }` 가정)을 확인하고 Task 4 호출부를 맞출 것. 다르면 얇은 어댑터를 `eventAdminHelpers.ts`에 추가.
- **`gen:types`는 pnpm + 원격 Supabase 필요**. 불가 시 `database.types.ts`에 이벤트 테이블 타입을 기존 항목 패턴대로 수기 추가(대안).
- **버킷 자동 생성 권한**: service-role 키로 `event-images`/`event-files` 생성 가능(popup-images 선례). 실패 시 Supabase 대시보드에서 수동 생성.
