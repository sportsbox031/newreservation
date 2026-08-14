# 스포츠이벤트 Phase 2 (사용자 신청 흐름) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인한 사용자가 모집중 스포츠이벤트를 조회하고, 신청 폼으로 신청하고, "내 신청내역"에서 상태 확인 및 선정 전 취소를 할 수 있게 한다.

**Architecture:** 순수 로직(신청 입력 검증·전체인원·취소가능)은 `src/lib/*.ts` + `node:test`로 추출. service-role 서버 로직은 `eventUserServer.ts`(이벤트 조회)·`eventApplicationServer.ts`(신청 CRUD)로 분리. Next.js App Router API(`/api/events`, `/api/events/applications`)는 `validateUserApiRequest`로 인증하고 서버 함수를 호출하는 얇은 층. UI는 `/events`(캐러셀+내 신청내역), `/events/[id]`(상세+신청 모달) 클라이언트 페이지. 이벤트는 지역 무관.

**Tech Stack:** Next.js 15 (App Router, Turbopack), TypeScript, Supabase(service-role), React Hook 없이 useState 기반 클라이언트 페이지, `react-calendar` v6, `dompurify`, `node:test`.

**Spec:** `docs/superpowers/specs/2026-08-14-sports-event-phase2-4-user-application-design.md`

## Global Constraints

- 스포츠교실 예약/대시보드/공지 코드와 공유 헬퍼(`resolveReservationRegionScope`, `regions`/`cities` 테이블)는 **수정 금지**. 읽기(조회)만 허용.
- 이벤트는 **지역 구분 없음**. 사용자 목록/신청에서 지역 매칭·필터 금지.
- 모든 서버 쓰기는 service-role 키(`SUPABASE_SERVICE_ROLE_KEY`)를 쓰는 API 라우트에서만. 클라이언트에서 직접 Supabase 쓰기 금지.
- 오류 응답 형식: `{ error: { message: string } }` (한국어 메시지).
- 신청 폼의 단체명·담당자·연락처·지역은 **사용자 입력을 신뢰하지 않고 서버가 세션/`users` 행에서 읽어 스냅샷 저장**.
- 테스트: 순수 헬퍼는 라이브러리 옆 `*.test.ts` + `node --test`, import는 `.ts` 확장자 명시.
- 중복 신청: 부분 유니크 `uq_event_applications_once = UNIQUE(event_id, user_id) WHERE status <> 'cancelled'` (DB에 이미 존재).
- 파일 상태 3-state·서명URL 등은 Phase 3에서 다룸. 이 플랜은 신청까지만.

---

## 기존 코드 참조 (구현 전 읽을 것)

- `src/lib/eventReservationStatus.ts` — `computeEffectiveOpen(event, nowIso)` 존재. 재사용.
- `src/lib/eventServer.ts` — service-role 클라이언트·`runQueryWithTimeout` 패턴, `EventWithDates` 타입.
- `src/app/api/user/reservations/route.ts` — `validateUserApiRequest` 사용 패턴(인증→`authResult.user.id`→서버함수→`NextResponse.json({ data })`).
- `src/lib/requestUtils.ts` — `getErrorMessage`, `withTimeout`.
- `src/types/database.ts` — `EventApplication`, `EventApplicationInsert`, `SportsEvent`, `EventDate`, `EventFormFile` alias. `users` Row는 `organization_name`, `manager_name`, `phone`, `city_id` 포함.
- `src/hooks/useSessionCheck.ts` — 사용자 페이지 세션 훅(`user`는 localStorage `currentUser`).
- `src/lib/clientAuthHeaders.ts` — `buildCookieFirstClientHeaders()` (fetch 헤더).
- `src/app/dashboard/page.tsx` — `react-calendar` 사용 예, 헤더 버튼 영역(약 1209–1229행: 내 예약/계정관리/로그아웃 버튼).
- `src/components/RichTextEditor.tsx` — `dompurify` 사용 예.

---

### Task 1: 신청 입력 검증 순수 헬퍼

**Files:**
- Create: `src/lib/eventApplicationHelpers.ts`
- Test: `src/lib/eventApplicationHelpers.test.ts`

**Interfaces:**
- Produces:
  - `type NormalizedApplicationInput = { event_id: string; event_date_id: string; student_count: number; leader_count: number }`
  - `validateApplicationInput(input: unknown): { ok: true; value: NormalizedApplicationInput } | { ok: false; message: string }`
  - `computeTotalCount(student: number, leader: number): number`
  - `canCancelApplication(status: string): boolean`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// src/lib/eventApplicationHelpers.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  validateApplicationInput,
  computeTotalCount,
  canCancelApplication,
} from './eventApplicationHelpers.ts'

test('event_id 없으면 거부', () => {
  const r = validateApplicationInput({ event_date_id: 'd1', student_count: 3, leader_count: 1 })
  assert.equal(r.ok, false)
})

test('event_date_id 없으면 거부', () => {
  const r = validateApplicationInput({ event_id: 'e1', student_count: 3, leader_count: 1 })
  assert.equal(r.ok, false)
})

test('참여 인원 합계가 0이면 거부', () => {
  const r = validateApplicationInput({ event_id: 'e1', event_date_id: 'd1', student_count: 0, leader_count: 0 })
  assert.equal(r.ok, false)
})

test('음수 인원은 거부', () => {
  const r = validateApplicationInput({ event_id: 'e1', event_date_id: 'd1', student_count: -1, leader_count: 2 })
  assert.equal(r.ok, false)
})

test('정상 입력은 정규화되어 통과', () => {
  const r = validateApplicationInput({ event_id: 'e1', event_date_id: 'd1', student_count: 20, leader_count: 3 })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.value.student_count, 20)
    assert.equal(r.value.leader_count, 3)
  }
})

test('computeTotalCount 합산', () => {
  assert.equal(computeTotalCount(20, 3), 23)
})

test('applied 상태만 취소 가능', () => {
  assert.equal(canCancelApplication('applied'), true)
  assert.equal(canCancelApplication('selected'), false)
  assert.equal(canCancelApplication('rejected'), false)
  assert.equal(canCancelApplication('cancelled'), false)
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `node --test src/lib/eventApplicationHelpers.test.ts`
Expected: FAIL (모듈/함수 없음)

- [ ] **Step 3: 최소 구현**

```typescript
// src/lib/eventApplicationHelpers.ts
export type NormalizedApplicationInput = {
  event_id: string
  event_date_id: string
  student_count: number
  leader_count: number
}

type ValidateResult =
  | { ok: true; value: NormalizedApplicationInput }
  | { ok: false; message: string }

function toCount(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  if (!Number.isInteger(v) || v < 0) return null
  return v
}

export function validateApplicationInput(input: unknown): ValidateResult {
  const raw = (input ?? {}) as Record<string, unknown>

  const event_id = typeof raw.event_id === 'string' ? raw.event_id.trim() : ''
  if (!event_id) return { ok: false, message: '이벤트 정보가 올바르지 않습니다.' }

  const event_date_id = typeof raw.event_date_id === 'string' ? raw.event_date_id.trim() : ''
  if (!event_date_id) return { ok: false, message: '신청할 일정 날짜를 선택해주세요.' }

  const student_count = toCount(raw.student_count)
  const leader_count = toCount(raw.leader_count)
  if (student_count === null || leader_count === null) {
    return { ok: false, message: '참여 인원은 0 이상의 정수로 입력해주세요.' }
  }
  if (student_count + leader_count < 1) {
    return { ok: false, message: '참여 인원을 1명 이상 입력해주세요.' }
  }

  return { ok: true, value: { event_id, event_date_id, student_count, leader_count } }
}

export function computeTotalCount(student: number, leader: number): number {
  return student + leader
}

export function canCancelApplication(status: string): boolean {
  return status === 'applied'
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test src/lib/eventApplicationHelpers.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/eventApplicationHelpers.ts src/lib/eventApplicationHelpers.test.ts
git commit -m "feat(events): add application input validation helpers (TDD)"
```

---

### Task 2: 사용자용 이벤트 조회 서버

**Files:**
- Create: `src/lib/eventUserServer.ts`

**Interfaces:**
- Consumes: `computeEffectiveOpen` (from `@/lib/eventReservationStatus`), `EventWithDates` (from `@/lib/eventServer`).
- Produces:
  - `listOpenEventsOnServer(nowIso: string): Promise<{ data: EventWithDates[] | null; error: { message: string } | null }>`
  - `getEventForUserOnServer(id: string, userId: string, nowIso: string): Promise<{ data: EventWithDates | null; error: { message: string } | null; status?: number }>`

**설명:** 목록은 `computeEffectiveOpen`이 true인 이벤트만. 상세는 이벤트가 모집중이거나, 해당 사용자가 그 이벤트에 신청 이력(취소 포함)이 있으면 종료 후에도 열람 허용. 지역 필터 없음.

- [ ] **Step 1: 구현 작성**

```typescript
// src/lib/eventUserServer.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import { computeEffectiveOpen } from '@/lib/eventReservationStatus'
import type { EventWithDates } from '@/lib/eventServer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

const QUERY_TIMEOUT_MS = 8000

export async function listOpenEventsOnServer(
  nowIso: string
): Promise<{ data: EventWithDates[] | null; error: { message: string } | null }> {
  try {
    const { data, error } = await withTimeout(
      supabaseAdmin
        .from('events')
        .select('*, event_dates(*), event_form_files(*)')
        .order('created_at', { ascending: false }),
      QUERY_TIMEOUT_MS,
      '이벤트 목록을 불러오는 중 시간이 초과되었습니다.'
    )
    if (error) {
      return { data: null, error: { message: getErrorMessage(error, '이벤트 목록을 불러오는데 실패했습니다.') } }
    }
    const rows = (data ?? []) as EventWithDates[]
    const open = rows.filter((e) => computeEffectiveOpen(e, nowIso))
    return { data: open, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '이벤트 목록을 불러오는 중 오류가 발생했습니다.') } }
  }
}

export async function getEventForUserOnServer(
  id: string,
  userId: string,
  nowIso: string
): Promise<{ data: EventWithDates | null; error: { message: string } | null; status?: number }> {
  try {
    const { data, error } = await withTimeout(
      supabaseAdmin
        .from('events')
        .select('*, event_dates(*), event_form_files(*)')
        .eq('id', id)
        .single(),
      QUERY_TIMEOUT_MS,
      '이벤트 정보를 불러오는 중 시간이 초과되었습니다.'
    )
    if (error || !data) {
      return { data: null, error: { message: '이벤트를 찾을 수 없습니다.' }, status: 404 }
    }
    const event = data as EventWithDates

    if (computeEffectiveOpen(event, nowIso)) {
      return { data: event, error: null }
    }

    // 모집 종료: 본인 신청 이력이 있으면 열람 허용
    const { data: app } = await withTimeout(
      supabaseAdmin
        .from('event_applications')
        .select('id')
        .eq('event_id', id)
        .eq('user_id', userId)
        .limit(1),
      QUERY_TIMEOUT_MS,
      '신청 이력을 확인하는 중 시간이 초과되었습니다.'
    )
    if (app && app.length > 0) {
      return { data: event, error: null }
    }

    return { data: null, error: { message: '모집이 종료된 이벤트입니다.' }, status: 403 }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '이벤트 정보를 불러오는 중 오류가 발생했습니다.') }, status: 500 }
  }
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: `0`

- [ ] **Step 3: 커밋**

```bash
git add src/lib/eventUserServer.ts
git commit -m "feat(events): add user-facing event read server (open list + detail gate)"
```

---

### Task 3: `/api/events` 라우트 (목록 + 상세)

**Files:**
- Create: `src/app/api/events/route.ts`

**Interfaces:**
- Consumes: `validateUserApiRequest` (`@/lib/auth`), `listOpenEventsOnServer`/`getEventForUserOnServer` (Task 2).
- Produces: `GET /api/events` → `{ data: EventWithDates[] }`; `GET /api/events?id=<uuid>` → `{ data: EventWithDates }`.

- [ ] **Step 1: 구현 작성**

```typescript
// src/app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateUserApiRequest } from '@/lib/auth'
import { listOpenEventsOnServer, getEventForUserOnServer } from '@/lib/eventUserServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function GET(request: NextRequest) {
  const authResult = await validateUserApiRequest(request)
  if (!authResult.authenticated || !authResult.user) {
    return NextResponse.json({ error: { message: authResult.error || '로그인이 필요합니다.' } }, { status: 401 })
  }

  try {
    const nowIso = new Date().toISOString()
    const id = new URL(request.url).searchParams.get('id')

    if (id) {
      const result = await getEventForUserOnServer(id, authResult.user.id, nowIso)
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
      }
      return NextResponse.json({ data: result.data })
    }

    const result = await listOpenEventsOnServer(nowIso)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ data: result.data ?? [] })
  } catch (e) {
    return NextResponse.json(
      { error: { message: getErrorMessage(e, '이벤트를 불러오는 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: 타입체크 + 수동 확인(선택)**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` → `0`
(실제 응답 확인은 Task 8 이후 앱 검증에서 일괄 수행)

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/events/route.ts
git commit -m "feat(events): add GET /api/events (open list + detail)"
```

---

### Task 4: 신청 서버 (생성·조회·취소, 스냅샷)

**Files:**
- Create: `src/lib/eventApplicationServer.ts`

**Interfaces:**
- Consumes: `NormalizedApplicationInput` (Task 1), `computeEffectiveOpen`, `canCancelApplication`, `computeTotalCount`.
- Produces:
  - `createApplicationOnServer(input: NormalizedApplicationInput, userId: string, nowIso: string): Promise<ServerResult<{ id: string }>>`
  - `listMyApplicationsOnServer(userId: string): Promise<ServerResult<MyApplicationRow[]>>`
  - `cancelApplicationOnServer(id: string, userId: string): Promise<ServerResult<{ id: string }>>`
  - `type MyApplicationRow = { id: string; event_id: string; event_title: string; event_date: string | null; status: string; total_count: number; created_at: string }`
  - `type ServerResult<T> = { data: T | null; error: { message: string } | null; status?: number }`

**검증 순서(생성):** ①이벤트 존재 & `computeEffectiveOpen` ②선택 `event_date_id`가 해당 이벤트 소속 ③단체명·담당자·연락처·지역을 `users` 행에서 스냅샷 ④insert(부분 유니크 위반 = 이미 신청).

- [ ] **Step 1: 구현 작성**

```typescript
// src/lib/eventApplicationServer.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import { computeEffectiveOpen } from '@/lib/eventReservationStatus'
import { canCancelApplication, computeTotalCount, type NormalizedApplicationInput } from '@/lib/eventApplicationHelpers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})
const T = 8000

export type ServerResult<T> = { data: T | null; error: { message: string } | null; status?: number }
export type MyApplicationRow = {
  id: string
  event_id: string
  event_title: string
  event_date: string | null
  status: string
  total_count: number
  created_at: string
}

async function resolveUserRegionId(userId: string, cityId: number | null): Promise<number | null> {
  if (!cityId) return null
  const { data } = await withTimeout(
    supabaseAdmin.from('cities').select('region_id').eq('id', cityId).single(),
    T,
    '지역 정보를 확인하는 중 시간이 초과되었습니다.'
  )
  return data?.region_id ?? null
}

export async function createApplicationOnServer(
  input: NormalizedApplicationInput,
  userId: string,
  nowIso: string
): Promise<ServerResult<{ id: string }>> {
  try {
    // 1) 이벤트 존재 + 모집중
    const { data: event, error: evErr } = await withTimeout(
      supabaseAdmin
        .from('events')
        .select('id, is_open, reservation_start_at, reservation_end_at')
        .eq('id', input.event_id)
        .single(),
      T,
      '이벤트 정보를 불러오는 중 시간이 초과되었습니다.'
    )
    if (evErr || !event) return { data: null, error: { message: '이벤트를 찾을 수 없습니다.' }, status: 404 }
    if (!computeEffectiveOpen(event, nowIso)) {
      return { data: null, error: { message: '현재 신청할 수 없는 이벤트입니다.' }, status: 400 }
    }

    // 2) 선택 날짜가 이벤트 소속인지
    const { data: date } = await withTimeout(
      supabaseAdmin
        .from('event_dates')
        .select('id')
        .eq('id', input.event_date_id)
        .eq('event_id', input.event_id)
        .single(),
      T,
      '일정 정보를 확인하는 중 시간이 초과되었습니다.'
    )
    if (!date) return { data: null, error: { message: '선택한 일정이 올바르지 않습니다.' }, status: 400 }

    // 3) 스냅샷: users 행에서 단체/담당/연락처/지역
    const { data: user, error: uErr } = await withTimeout(
      supabaseAdmin
        .from('users')
        .select('organization_name, manager_name, phone, city_id')
        .eq('id', userId)
        .single(),
      T,
      '회원 정보를 불러오는 중 시간이 초과되었습니다.'
    )
    if (uErr || !user) return { data: null, error: { message: '회원 정보를 확인할 수 없습니다.' }, status: 400 }
    const region_id = await resolveUserRegionId(userId, user.city_id ?? null)

    // 4) insert (부분 유니크 위반 = 이미 신청)
    const { data: inserted, error: insErr } = await withTimeout(
      supabaseAdmin
        .from('event_applications')
        .insert([{
          event_id: input.event_id,
          user_id: userId,
          event_date_id: input.event_date_id,
          student_count: input.student_count,
          leader_count: input.leader_count,
          applicant_org_name: user.organization_name,
          applicant_manager_name: user.manager_name,
          applicant_phone: user.phone,
          region_id,
          status: 'applied',
        }])
        .select('id')
        .single(),
      T,
      '신청 저장 중 시간이 초과되었습니다.'
    )
    if (insErr || !inserted) {
      const msg = /duplicate|unique/i.test(insErr?.message || '')
        ? '이미 신청한 이벤트입니다.'
        : getErrorMessage(insErr, '신청에 실패했습니다.')
      return { data: null, error: { message: msg }, status: 400 }
    }
    // total_count는 DB generated 컬럼이므로 클라이언트 계산은 표시용
    void computeTotalCount(input.student_count, input.leader_count)
    return { data: { id: inserted.id }, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '신청 처리 중 오류가 발생했습니다.') }, status: 500 }
  }
}

export async function listMyApplicationsOnServer(userId: string): Promise<ServerResult<MyApplicationRow[]>> {
  try {
    const { data, error } = await withTimeout(
      supabaseAdmin
        .from('event_applications')
        .select('id, event_id, status, total_count, created_at, events(title), event_dates(event_date)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      T,
      '신청 내역을 불러오는 중 시간이 초과되었습니다.'
    )
    if (error) return { data: null, error: { message: getErrorMessage(error, '신청 내역을 불러오는데 실패했습니다.') } }
    const rows: MyApplicationRow[] = (data ?? []).map((r: Record<string, unknown>) => {
      const ev = r.events as { title?: string } | null
      const ed = r.event_dates as { event_date?: string } | null
      return {
        id: r.id as string,
        event_id: r.event_id as string,
        event_title: ev?.title ?? '(삭제된 이벤트)',
        event_date: ed?.event_date ?? null,
        status: r.status as string,
        total_count: (r.total_count as number) ?? 0,
        created_at: r.created_at as string,
      }
    })
    return { data: rows, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '신청 내역을 불러오는 중 오류가 발생했습니다.') } }
  }
}

export async function cancelApplicationOnServer(id: string, userId: string): Promise<ServerResult<{ id: string }>> {
  try {
    const { data: app, error: fErr } = await withTimeout(
      supabaseAdmin.from('event_applications').select('id, user_id, status').eq('id', id).single(),
      T,
      '신청 정보를 불러오는 중 시간이 초과되었습니다.'
    )
    if (fErr || !app) return { data: null, error: { message: '신청 내역을 찾을 수 없습니다.' }, status: 404 }
    if (app.user_id !== userId) return { data: null, error: { message: '본인 신청만 취소할 수 있습니다.' }, status: 403 }
    if (!canCancelApplication(app.status)) {
      return { data: null, error: { message: '이미 선정/탈락 처리되었거나 취소된 신청입니다.' }, status: 400 }
    }
    const { error: uErr } = await withTimeout(
      supabaseAdmin
        .from('event_applications')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id),
      T,
      '신청 취소 중 시간이 초과되었습니다.'
    )
    if (uErr) return { data: null, error: { message: getErrorMessage(uErr, '신청 취소에 실패했습니다.') }, status: 400 }
    return { data: { id }, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '신청 취소 중 오류가 발생했습니다.') }, status: 500 }
  }
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: `0` (만약 `event_applications` 관계 select 타입 오류가 나면, 반환 row를 `as Record<string, unknown>[]`로 캐스팅해 우회 — 이미 map에서 캐스팅함)

- [ ] **Step 3: 커밋**

```bash
git add src/lib/eventApplicationServer.ts
git commit -m "feat(events): add application server (create with snapshot, list, cancel)"
```

---

### Task 5: `/api/events/applications` 라우트 (POST/GET/DELETE)

**Files:**
- Create: `src/app/api/events/applications/route.ts`

**Interfaces:**
- Consumes: `validateUserApiRequest`, `validateApplicationInput` (Task 1), `createApplicationOnServer`/`listMyApplicationsOnServer`/`cancelApplicationOnServer` (Task 4).
- Produces: `POST` → `{ data: { id } }`; `GET` → `{ data: MyApplicationRow[] }`; `DELETE ?id=` → `{ data: { id } }`.

- [ ] **Step 1: 구현 작성**

```typescript
// src/app/api/events/applications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateUserApiRequest } from '@/lib/auth'
import { validateApplicationInput } from '@/lib/eventApplicationHelpers'
import {
  createApplicationOnServer,
  listMyApplicationsOnServer,
  cancelApplicationOnServer,
} from '@/lib/eventApplicationServer'
import { getErrorMessage } from '@/lib/requestUtils'

async function requireUser(request: NextRequest) {
  const auth = await validateUserApiRequest(request)
  if (!auth.authenticated || !auth.user) {
    return { ok: false as const, response: NextResponse.json({ error: { message: auth.error || '로그인이 필요합니다.' } }, { status: 401 }) }
  }
  return { ok: true as const, user: auth.user }
}

export async function POST(request: NextRequest) {
  const u = await requireUser(request)
  if (!u.ok) return u.response
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = validateApplicationInput(body)
    if (!parsed.ok) return NextResponse.json({ error: { message: parsed.message } }, { status: 400 })

    const result = await createApplicationOnServer(parsed.value, u.user.id, new Date().toISOString())
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '신청 처리 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const u = await requireUser(request)
  if (!u.ok) return u.response
  try {
    const result = await listMyApplicationsOnServer(u.user.id)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ data: result.data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '신청 내역을 불러오는 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const u = await requireUser(request)
  if (!u.ok) return u.response
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: { message: 'ID가 필요합니다.' } }, { status: 400 })
    const result = await cancelApplicationOnServer(id, u.user.id)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '신청 취소 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` → `0`

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/events/applications/route.ts
git commit -m "feat(events): add /api/events/applications (apply, my list, cancel)"
```

---

### Task 6: 대시보드 헤더 "스포츠이벤트" 진입 버튼

**Files:**
- Modify: `src/app/dashboard/page.tsx` (헤더 버튼 영역, "내 예약" 버튼 근처)

**Interfaces:**
- Consumes: `useRouter` (이미 대시보드에서 사용 중) 또는 `<Link>`.

- [ ] **Step 1: 아이콘 import 확인 후 버튼 추가**

`src/app/dashboard/page.tsx`의 헤더에서 "내 예약" 버튼(대략 `handleOpenMyReservations` onClick 버튼) 바로 앞에 이벤트 진입 버튼을 추가한다. lucide-react에서 `Trophy` 아이콘을 import 목록에 추가(이미 있으면 생략).

```tsx
{/* 스포츠이벤트 진입 */}
<Link
  href="/events"
  className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 p-1 sm:p-0"
>
  <Trophy className="w-4 h-4" />
  <span className="hidden sm:inline text-sm">스포츠이벤트</span>
</Link>
```

`Link`는 이미 `next/link`에서 import되어 있음(헤더 로고에서 사용). `Trophy`가 없으면 lucide-react import에 추가.

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` → `0`

- [ ] **Step 3: 커밋**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat(events): add sports-event entry button to dashboard header"
```

---

### Task 7: `/events` 목록 페이지 (캐러셀 + 내 신청내역 버튼)

**Files:**
- Create: `src/app/events/page.tsx`
- Create: `src/components/MyApplicationsModal.tsx`

**Interfaces:**
- Consumes: `GET /api/events`, `GET /api/events/applications`, `DELETE /api/events/applications?id=`, `buildCookieFirstClientHeaders`, `useSessionCheck` 패턴(localStorage `currentUser` 확인).
- Produces: 사용자가 모집중 이벤트를 보고 클릭 → `/events/[id]`로 이동. "내 신청내역" 버튼 → `MyApplicationsModal`.

**설명:** 캐러셀은 별도 라이브러리 없이 가로 스크롤 카드 리스트(경량)로 구현. 대표이미지 공개 URL은 `NEXT_PUBLIC_SUPABASE_URL/storage/v1/object/public/event-images/{path}` 규칙(관리자 페이지 `eventImagePublicUrl`와 동일).

- [ ] **Step 1: MyApplicationsModal 컴포넌트 작성**

```tsx
// src/components/MyApplicationsModal.tsx
'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import ModalOverlay from '@/components/ModalOverlay'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'

interface MyApplication {
  id: string
  event_id: string
  event_title: string
  event_date: string | null
  status: string
  total_count: number
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  applied: '신청',
  selected: '선정',
  rejected: '탈락',
  cancelled: '취소',
}

export default function MyApplicationsModal({ onClose }: { onClose: () => void }) {
  const [apps, setApps] = useState<MyApplication[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/events/applications', {
        credentials: 'include',
        headers: buildCookieFirstClientHeaders(),
      })
      const json = await res.json().catch(() => null)
      setApps(res.ok ? json?.data || [] : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCancel = async (id: string) => {
    if (!confirm('이 신청을 취소하시겠습니까?')) return
    const res = await fetch(`/api/events/applications?id=${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: buildCookieFirstClientHeaders(),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) { alert(json?.error?.message || '취소 중 오류가 발생했습니다.'); return }
    load()
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">내 신청내역</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {loading ? (
            <p className="text-center text-gray-500 py-8">불러오는 중...</p>
          ) : apps.length === 0 ? (
            <p className="text-center text-gray-500 py-8">신청한 이벤트가 없습니다.</p>
          ) : (
            apps.map((a) => (
              <div key={a.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{a.event_title}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {a.event_date || '-'} · 전체 {a.total_count}명
                    </p>
                  </div>
                  <span className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full whitespace-nowrap">
                    {STATUS_LABEL[a.status] || a.status}
                  </span>
                </div>
                {a.status === 'applied' && (
                  <div className="mt-3 text-right">
                    <button
                      onClick={() => handleCancel(a.id)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      신청 취소
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </ModalOverlay>
  )
}
```

- [ ] **Step 2: `/events` 페이지 작성**

```tsx
// src/app/events/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, List } from 'lucide-react'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'
import MyApplicationsModal from '@/components/MyApplicationsModal'

interface EventCard {
  id: string
  title: string
  thumbnail_path: string | null
}

function eventImagePublicUrl(path: string | null): string | null {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base}/storage/v1/object/public/event-images/${path}`
}

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EventCard[]>([])
  const [loading, setLoading] = useState(true)
  const [showMine, setShowMine] = useState(false)

  useEffect(() => {
    const currentUser = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null
    if (!currentUser) { router.push('/auth/login'); return }
    ;(async () => {
      try {
        const res = await fetch('/api/events', { credentials: 'include', headers: buildCookieFirstClientHeaders() })
        const json = await res.json().catch(() => null)
        setEvents(res.ok ? json?.data || [] : [])
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">스포츠이벤트</h1>
          </div>
          <button
            onClick={() => setShowMine(true)}
            className="flex items-center gap-1 text-gray-700 hover:text-blue-600"
          >
            <List className="w-4 h-4" />
            <span className="text-sm">내 신청내역</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">모집중인 이벤트</h2>
        {loading ? (
          <p className="text-gray-500 py-12 text-center">불러오는 중...</p>
        ) : events.length === 0 ? (
          <p className="text-gray-500 py-12 text-center">현재 모집중인 이벤트가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((e) => {
              const img = eventImagePublicUrl(e.thumbnail_path)
              return (
                <button
                  key={e.id}
                  onClick={() => router.push(`/events/${e.id}`)}
                  className="text-left bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={e.title} className="w-full h-full object-cover" />
                    ) : (
                      <Trophy className="w-10 h-10 text-gray-300" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-medium text-gray-900 truncate">{e.title}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>

      {showMine && <MyApplicationsModal onClose={() => setShowMine(false)} />}
    </div>
  )
}
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` → `0`

- [ ] **Step 4: 커밋**

```bash
git add src/app/events/page.tsx src/components/MyApplicationsModal.tsx
git commit -m "feat(events): add /events list page and my-applications modal"
```

---

### Task 8: `/events/[id]` 상세 페이지 + 신청 폼 모달

**Files:**
- Create: `src/app/events/[id]/page.tsx`
- Create: `src/components/EventApplyModal.tsx`

**Interfaces:**
- Consumes: `GET /api/events?id=`, `POST /api/events/applications`, `react-calendar`, `dompurify`.
- Produces: 상세 화면(이미지·영상·HTML 설명·일정·서류양식 다운로드는 Phase 3에서 배선하되 목록 표시만) + "신청하기" → `EventApplyModal`. 신청 성공 시 `"신청이 완료되었습니다. 선정 발표를 기다려주세요."` alert + 모달 닫힘.

**설명:** 신청 폼은 `react-calendar`로 `event_dates`에 있는 날짜만 선택 가능(그 외 `tileDisabled`). 단체명·담당자·연락처는 `localStorage.currentUser`에서 읽어 읽기전용 표시(저장은 서버 스냅샷). 학생수+인솔자수 입력 → 전체인원 자동 합산.

- [ ] **Step 1: EventApplyModal 작성**

```tsx
// src/components/EventApplyModal.tsx
'use client'

import { useState } from 'react'
import Calendar from 'react-calendar'
import { X } from 'lucide-react'
import ModalOverlay from '@/components/ModalOverlay'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'

interface EventDateOption { id: string; event_date: string; label: string | null }
interface Props {
  eventId: string
  dates: EventDateOption[]
  org: { organization_name: string; manager_name: string; phone: string }
  onClose: () => void
  onApplied: () => void
}

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function EventApplyModal({ eventId, dates, org, onClose, onApplied }: Props) {
  const allowed = new Set(dates.map((d) => d.event_date))
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [student, setStudent] = useState(0)
  const [leader, setLeader] = useState(0)
  const [saving, setSaving] = useState(false)

  const total = student + leader

  const handleSubmit = async () => {
    const chosen = dates.find((d) => d.event_date === selectedDate)
    if (!chosen) { alert('신청할 일정 날짜를 선택해주세요.'); return }
    if (total < 1) { alert('참여 인원을 1명 이상 입력해주세요.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/events/applications', {
        method: 'POST',
        credentials: 'include',
        headers: buildCookieFirstClientHeaders(),
        body: JSON.stringify({
          event_id: eventId,
          event_date_id: chosen.id,
          student_count: student,
          leader_count: leader,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) { alert(json?.error?.message || '신청 중 오류가 발생했습니다.'); return }
      alert('신청이 완료되었습니다. 선정 발표를 기다려주세요.')
      onApplied()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} closeOnBackdrop={false}>
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">이벤트 신청</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">신청 일정 <span className="text-red-500">*</span></label>
            <Calendar
              onChange={(v) => v instanceof Date && setSelectedDate(toYmd(v))}
              tileDisabled={({ date, view }) => view === 'month' && !allowed.has(toYmd(date))}
              className="border rounded-lg"
            />
            <p className="text-sm text-gray-600 mt-2">선택: {selectedDate || '없음'}</p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">단체명</span><span className="text-gray-900">{org.organization_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">담당자</span><span className="text-gray-900">{org.manager_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">연락처</span><span className="text-gray-900">{org.phone}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">참여 학생수</label>
              <input type="number" min={0} value={student}
                onChange={(e) => setStudent(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">인솔자수</label>
              <input type="number" min={0} value={leader}
                onChange={(e) => setLeader(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>
          <p className="text-sm text-gray-700">전체 인원: <span className="font-semibold">{total}명</span></p>
        </div>
        <div className="sticky bottom-0 bg-white border-t p-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">취소</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60">
            {saving ? '신청 중...' : '신청하기'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}
```

- [ ] **Step 2: `/events/[id]` 상세 페이지 작성**

```tsx
// src/app/events/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DOMPurify from 'dompurify'
import { ArrowLeft, Trophy } from 'lucide-react'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'
import EventApplyModal from '@/components/EventApplyModal'

interface EventDetail {
  id: string
  title: string
  description: string | null
  content_type: 'html' | 'text'
  thumbnail_path: string | null
  video_url: string | null
  event_dates: { id: string; event_date: string; label: string | null; sort_order: number }[]
  event_form_files?: { id: string; file_name: string; storage_path: string }[]
}

function eventImagePublicUrl(path: string | null): string | null {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base}/storage/v1/object/public/event-images/${path}`
}

export default function EventDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = String(params?.id || '')
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showApply, setShowApply] = useState(false)
  const [org, setOrg] = useState({ organization_name: '', manager_name: '', phone: '' })

  useEffect(() => {
    const cu = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null
    if (!cu) { router.push('/auth/login'); return }
    try {
      const u = JSON.parse(cu)
      setOrg({ organization_name: u.organization_name || '', manager_name: u.manager_name || '', phone: u.phone || '' })
    } catch { /* noop */ }
    ;(async () => {
      try {
        const res = await fetch(`/api/events?id=${id}`, { credentials: 'include', headers: buildCookieFirstClientHeaders() })
        const json = await res.json().catch(() => null)
        if (!res.ok) { alert(json?.error?.message || '이벤트를 불러오지 못했습니다.'); router.push('/events'); return }
        setEvent(json?.data || null)
      } finally {
        setLoading(false)
      }
    })()
  }, [id, router])

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">불러오는 중...</div>
  if (!event) return null

  const img = eventImagePublicUrl(event.thumbnail_path)
  const sortedDates = [...event.event_dates].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/events')} className="text-gray-500 hover:text-gray-800"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold text-gray-900 truncate">{event.title}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <Trophy className="w-12 h-12 text-gray-300" />
          )}
        </div>

        {event.description && (
          <div
            className="prose max-w-none text-gray-800"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.description) }}
          />
        )}

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">일정</h3>
          <ul className="space-y-1 text-sm text-gray-700">
            {sortedDates.map((d) => (
              <li key={d.id}>· {d.event_date}{d.label ? ` (${d.label})` : ''}</li>
            ))}
          </ul>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setShowApply(true)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            신청하기
          </button>
        </div>
      </main>

      {showApply && (
        <EventApplyModal
          eventId={event.id}
          dates={sortedDates}
          org={org}
          onClose={() => setShowApply(false)}
          onApplied={() => { /* 상태 없음: 알림 후 닫힘만 */ }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` → `0`

- [ ] **Step 4: 커밋**

```bash
git add src/app/events/[id]/page.tsx src/components/EventApplyModal.tsx
git commit -m "feat(events): add event detail page and apply modal"
```

---

### Task 9: 실제 앱 end-to-end 검증

**Files:** (없음 — 실행/관측)

- [ ] **Step 1: dev 서버 기동 후 흐름 구동**

`npm run dev` → 사용자 계정(`테스트단체`/비밀번호)으로 로그인 → 대시보드 헤더 "스포츠이벤트" 클릭 → `/events` 목록 확인. (모집중 이벤트가 없으면 관리자로 이벤트 하나 생성 후 예약 시작 토글로 모집중 상태 만들기.)

- [ ] **Step 2: 신청 → 내 신청내역 → 취소 관측**

이벤트 상세 → 신청하기 → 달력에서 지정 날짜 선택 + 학생/인솔자 수 입력 → 신청 완료 알림 확인. "내 신청내역"에서 상태 `신청` 확인 → 취소 → 목록에서 `취소` 확인. 재신청 가능한지 확인(부분 유니크).

- [ ] **Step 3: 검증 결과 기록**

`superpowers:verification-before-completion`으로 실제 관측 증거(응답/스크린샷) 남기기. 통과 시 Phase 2 완료.

---

## Self-Review (작성자 체크 완료)

- **스펙 커버리지:** §4.1 사용자 API(events GET/detail, applications POST/GET/DELETE) → Task 3·5. §5 사용자 UI(진입 버튼·목록·상세·신청 모달·내 신청내역) → Task 6·7·8. 신청 검증 순서(모집중·중복·날짜소속·스냅샷) → Task 4. 서류 제출/서명URL(§4.1 submissions, §6 관리자, §7 스케줄러)은 **Phase 3·4 플랜에서 다룸**(이 플랜 범위 밖, 의도적).
- **플레이스홀더:** 없음(모든 코드 스텝에 실제 코드 포함).
- **타입 일관성:** `NormalizedApplicationInput`(Task 1) → Task 4·5에서 동일 사용. `MyApplicationRow`(Task 4) → Task 7 모달의 `MyApplication` 인터페이스와 필드 일치. `EventWithDates`(eventServer)는 Task 2에서 import.
- **주의:** Task 4의 `event_applications` 관계 select가 생성 타입과 어긋날 수 있어 `Record<string, unknown>` 캐스팅으로 방어함. `users` row에 `manager_name`/`phone`/`city_id`가 있다고 가정(레포 등록 폼과 일치) — 없으면 Task 4 Step 2 타입에러로 즉시 드러남.

## Phase 3·4 예고 (별도 플랜)

- Phase 3: `/api/events/submissions`(사용자 업로드/삭제/서명URL), `/api/events/files/download`(서류양식 서명URL), 내 신청내역 모달의 서류 제출 UI, `/api/admin/events/applications`·`/submissions`, `/admin/events/[id]` 신청관리 페이지, `/admin/events` 목록 신청수·링크.
- Phase 4: 관리자 폼 스케줄 입력 + `validateEventInput` 확장 + `/api/cron/event-scheduler` + `vercel.json`.
