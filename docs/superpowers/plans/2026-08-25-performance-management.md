# 실적관리(Performance Management) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 페이지에 세 프로그램(스포츠교실·스포츠체험존·스포츠이벤트)의 예약/수기 실적을 라이브로 집계·조회·수정하는 실적관리 대시보드 + 상세 조회 페이지를 추가한다.

**Architecture:** 스포츠교실(승인된 `reservations`)·스포츠이벤트(선정된 `event_applications`)를 실시간으로 정규화하고, 관리자 수정분은 `performance_overrides`로 병합한다. 스포츠체험존은 신규 `experience_zone_records`에 전량 수기 저장한다. 순수 로직은 `src/lib/performance*.ts` + co-located `*.test.ts`로 분리하고(testable-helper 패턴), 서버 조회는 service role 라우트에서 지역 스코핑을 강제한다.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase(service role), Tailwind, lucide-react, ExcelJS(기존 의존성), `node:test`. 차트는 외부 라이브러리 없이 인라인 SVG.

**Spec:** `docs/superpowers/specs/2026-08-25-performance-management-design.md`

## Global Constraints

- 성별 구분 없음 — `participant_count`(총 인원)만 사용.
- 예산·홍보·CSV 일괄 업로드 기능 제외. 내보내기는 Excel 다운로드만.
- 접근 권한: `super`=전체, `south`/`north`=자기 지역만. 지역관리자의 region 파라미터는 서버에서 자기 지역으로 강제.
- 학년(`grade`)은 어디서도 필수 아님(nullable).
- API 반환 형식 `{ data, error }`. 관리자 인증은 `validateApiRequest` + `isAdmin`. 지역 스코핑은 `resolveReservationRegionScope(adminRole, requestedRegionCode)` 재사용.
- 테스트는 `node:test` + `node:assert/strict`, 소스는 `.ts` 확장자로 import (`import { x } from './foo.ts'`). 헬퍼는 `src/lib`에서 `import { x } from '@/lib/...'` (테스트 파일도 동일 alias 사용 — 기존 관례).
- 프로그램 식별자 리터럴(verbatim): `'sports_class'` | `'sports_event'` | `'experience_zone'`.
- 지역 코드 리터럴(verbatim): `'south'` | `'north'`.
- 새 파일은 기존 admin 페이지 디자인(white 카드·`rounded-xl`·`shadow-sm`·`blue-600`·`gray-50`, `AdminNavigation`, `ModalOverlay`, `Spinner`)으로 통일. 원본 사이트의 보라 그라데이션 사용 금지.

---

## File Structure

- Create `performance-schema.sql` — 신규 테이블 2개 DDL.
- Modify `src/types/database.ts` — `experience_zone_records`, `performance_overrides` 테이블 타입 인라인 추가 + 타입 alias export (기존 `user_penalties` 패턴).
- Create `src/lib/performanceTypes.ts` — 공용 타입(`PerformanceProgram`, `PerformanceRecord`, `OverrideRow`, `PerformanceFilters`, `PerformanceSummary`).
- Create `src/lib/performanceFilters.ts` (+`.test.ts`) — 쿼리 파라미터 파싱·지역 스코핑, 레코드 필터/정렬/페이지네이션.
- Create `src/lib/performanceRecords.ts` (+`.test.ts`) — 소스 로우 → `PerformanceRecord` 정규화, override 병합, grade 결합, participant 합산.
- Create `src/lib/performanceAggregate.ts` (+`.test.ts`) — 레코드 → 요약(프로그램별 회/명, 총계, 월별 시리즈).
- Create `src/lib/performanceServer.ts` — Supabase 조회 + 위 헬퍼 조합(서버 전용).
- Create `src/app/api/admin/performance/summary/route.ts` — GET 요약.
- Create `src/app/api/admin/performance/records/route.ts` — GET 목록.
- Create `src/app/api/admin/performance/experience/route.ts` — POST.
- Create `src/app/api/admin/performance/experience/[id]/route.ts` — PATCH/DELETE.
- Create `src/app/api/admin/performance/override/route.ts` — PATCH.
- Create `src/app/api/admin/performance/export/route.ts` — GET Excel.
- Modify `src/components/AdminNavigation.tsx` — 실적관리 탭 추가.
- Create `src/app/admin/performance/page.tsx` — 대시보드.
- Create `src/app/admin/performance/records/page.tsx` — 상세 조회 + 모달.

---

## Task 1: DB 스키마 + 타입

**Files:**
- Create: `performance-schema.sql`
- Modify: `src/types/database.ts` (ExtendedPublic Tables 블록에 인라인 추가; 파일 하단 type alias export)

**Interfaces:**
- Produces: 테이블 `experience_zone_records`, `performance_overrides`. 타입 alias `ExperienceZoneRecord`, `ExperienceZoneRecordInsert`, `ExperienceZoneRecordUpdate`, `PerformanceOverride`, `PerformanceOverrideInsert`, `PerformanceOverrideUpdate`.

- [ ] **Step 1: SQL 파일 작성**

Create `performance-schema.sql`:

```sql
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
```

- [ ] **Step 2: `src/types/database.ts`에 테이블 타입 인라인 추가**

`ExtendedPublic`의 `Tables` Merge 블록 안(예: `user_penalties` 블록 근처)에 추가:

```ts
        experience_zone_records: {
          Row: {
            id: string
            date: string
            organization_name: string
            region_id: number | null
            city_id: number | null
            grade: string | null
            participant_count: number
            memo: string | null
            created_by: string | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            date: string
            organization_name: string
            region_id?: number | null
            city_id?: number | null
            grade?: string | null
            participant_count?: number
            memo?: string | null
            created_by?: string | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            date?: string
            organization_name?: string
            region_id?: number | null
            city_id?: number | null
            grade?: string | null
            participant_count?: number
            memo?: string | null
            created_by?: string | null
            created_at?: string
            updated_at?: string
          }
          Relationships: []
        }
        performance_overrides: {
          Row: {
            id: string
            source_type: 'sports_class' | 'sports_event'
            source_id: string
            grade: string | null
            participant_count: number | null
            memo: string | null
            excluded: boolean
            updated_by: string | null
            updated_at: string
          }
          Insert: {
            id?: string
            source_type: 'sports_class' | 'sports_event'
            source_id: string
            grade?: string | null
            participant_count?: number | null
            memo?: string | null
            excluded?: boolean
            updated_by?: string | null
            updated_at?: string
          }
          Update: {
            id?: string
            source_type?: 'sports_class' | 'sports_event'
            source_id?: string
            grade?: string | null
            participant_count?: number | null
            memo?: string | null
            excluded?: boolean
            updated_by?: string | null
            updated_at?: string
          }
          Relationships: []
        }
```

- [ ] **Step 3: type alias export 추가**

`src/types/database.ts` 하단(다른 alias export 근처)에 추가:

```ts
export type ExperienceZoneRecord = Database['public']['Tables']['experience_zone_records']['Row']
export type ExperienceZoneRecordInsert = Database['public']['Tables']['experience_zone_records']['Insert']
export type ExperienceZoneRecordUpdate = Database['public']['Tables']['experience_zone_records']['Update']
export type PerformanceOverride = Database['public']['Tables']['performance_overrides']['Row']
export type PerformanceOverrideInsert = Database['public']['Tables']['performance_overrides']['Insert']
export type PerformanceOverrideUpdate = Database['public']['Tables']['performance_overrides']['Update']
```

- [ ] **Step 4: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 신규 alias/테이블 관련 에러 없음(기존 무관 에러는 무시 — `next.config.ts`가 빌드 시 타입 에러를 무시하므로 신규 코드만 확인).

- [ ] **Step 5: (수동) Supabase 적용 안내 주석 확인**
`performance-schema.sql` 상단에 "Supabase SQL editor에서 실행" 주석이 있는지 확인. (실제 적용은 배포 담당자가 수행)

- [ ] **Step 6: Commit**

```bash
git add performance-schema.sql src/types/database.ts
git commit -m "feat(performance): add experience_zone_records + performance_overrides schema and types"
```

---

## Task 2: 공용 타입 + 필터 헬퍼

**Files:**
- Create: `src/lib/performanceTypes.ts`
- Create: `src/lib/performanceFilters.ts`
- Test: `src/lib/performanceFilters.test.ts`

**Interfaces:**
- Consumes: `resolveReservationRegionScope` from `@/lib/reservationManagementHelpers`.
- Produces:
  - `type PerformanceProgram = 'sports_class' | 'sports_event' | 'experience_zone'`
  - `interface PerformanceRecord { id: string; program_type: PerformanceProgram; date: string; organization_name: string; city_name: string | null; region_id: number | null; region_code: 'south' | 'north' | null; grade: string | null; participant_count: number; memo: string | null; source_type: PerformanceProgram; source_id: string }`
  - `interface OverrideRow { source_type: 'sports_class' | 'sports_event'; source_id: string; grade: string | null; participant_count: number | null; memo: string | null; excluded: boolean }`
  - `interface PerformanceFilters { year: number | null; from: string | null; to: string | null; region: 'south' | 'north' | null; program: PerformanceProgram | 'all'; q: string; page: number; pageSize: number }`
  - `interface PerformanceSummary { totalCount: number; totalParticipants: number; byProgram: Record<PerformanceProgram, { count: number; participants: number }>; monthly: number[] }`
  - `parsePerformanceFilters(params: URLSearchParams, adminRole: string): { filters: PerformanceFilters; error: { message: string } | null }`
  - `applyRecordFilters(records: PerformanceRecord[], filters: PerformanceFilters): PerformanceRecord[]`
  - `sortByDateDesc(records: PerformanceRecord[]): PerformanceRecord[]`
  - `paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; total: number; page: number; pageSize: number }`

- [ ] **Step 1: `performanceTypes.ts` 작성**

```ts
export type PerformanceProgram = 'sports_class' | 'sports_event' | 'experience_zone'

export interface PerformanceRecord {
  id: string
  program_type: PerformanceProgram
  date: string
  organization_name: string
  city_name: string | null
  region_id: number | null
  region_code: 'south' | 'north' | null
  grade: string | null
  participant_count: number
  memo: string | null
  source_type: PerformanceProgram
  source_id: string
}

export interface OverrideRow {
  source_type: 'sports_class' | 'sports_event'
  source_id: string
  grade: string | null
  participant_count: number | null
  memo: string | null
  excluded: boolean
}

export interface PerformanceFilters {
  year: number | null
  from: string | null
  to: string | null
  region: 'south' | 'north' | null
  program: PerformanceProgram | 'all'
  q: string
  page: number
  pageSize: number
}

export interface PerformanceSummary {
  totalCount: number
  totalParticipants: number
  byProgram: Record<PerformanceProgram, { count: number; participants: number }>
  monthly: number[]
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

Create `src/lib/performanceFilters.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  parsePerformanceFilters,
  applyRecordFilters,
  sortByDateDesc,
  paginate,
} from '@/lib/performanceFilters'
import type { PerformanceRecord } from '@/lib/performanceTypes'

function rec(partial: Partial<PerformanceRecord>): PerformanceRecord {
  return {
    id: 'sports_class:1', program_type: 'sports_class', date: '2026-05-10',
    organization_name: '테스트초', city_name: '수원시', region_id: 1, region_code: 'south',
    grade: '3학년', participant_count: 30, memo: null,
    source_type: 'sports_class', source_id: '1', ...partial,
  }
}

test('parsePerformanceFilters: super는 요청 region을 유지', () => {
  const params = new URLSearchParams({ year: '2026', region: 'north', program: 'sports_event', page: '2' })
  const { filters, error } = parsePerformanceFilters(params, 'super')
  assert.equal(error, null)
  assert.equal(filters.year, 2026)
  assert.equal(filters.region, 'north')
  assert.equal(filters.program, 'sports_event')
  assert.equal(filters.page, 2)
  assert.equal(filters.pageSize, 30)
})

test('parsePerformanceFilters: 지역관리자는 자기 지역으로 강제', () => {
  const params = new URLSearchParams({ region: 'south' })
  const { filters } = parsePerformanceFilters(params, 'north')
  assert.equal(filters.region, 'north')
})

test('parsePerformanceFilters: 잘못된 program은 all로', () => {
  const { filters } = parsePerformanceFilters(new URLSearchParams({ program: 'bogus' }), 'super')
  assert.equal(filters.program, 'all')
})

test('applyRecordFilters: 기간·프로그램·검색·지역 필터', () => {
  const records = [
    rec({ id: 'a', date: '2026-05-10', region_code: 'south', organization_name: '가나초' }),
    rec({ id: 'b', date: '2026-08-01', region_code: 'north', program_type: 'sports_event', organization_name: '다라초' }),
  ]
  const base: any = { year: 2026, from: null, to: null, region: null, program: 'all', q: '', page: 1, pageSize: 30 }
  assert.equal(applyRecordFilters(records, { ...base, from: '2026-06-01' }).length, 1)
  assert.equal(applyRecordFilters(records, { ...base, program: 'sports_event' }).length, 1)
  assert.equal(applyRecordFilters(records, { ...base, q: '가나' }).length, 1)
  assert.equal(applyRecordFilters(records, { ...base, region: 'north' }).length, 1)
  assert.equal(applyRecordFilters(records, { ...base, year: 2025 }).length, 0)
})

test('sortByDateDesc + paginate', () => {
  const records = [rec({ id: 'a', date: '2026-01-01' }), rec({ id: 'b', date: '2026-09-01' })]
  assert.equal(sortByDateDesc(records)[0].id, 'b')
  const p = paginate([1, 2, 3, 4, 5], 2, 2)
  assert.deepEqual(p.items, [3, 4])
  assert.equal(p.total, 5)
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `node --test src/lib/performanceFilters.test.ts`
Expected: FAIL (module not found / 함수 미정의).

- [ ] **Step 4: `performanceFilters.ts` 구현**

```ts
import { resolveReservationRegionScope } from '@/lib/reservationManagementHelpers'
import type { PerformanceFilters, PerformanceProgram, PerformanceRecord } from '@/lib/performanceTypes'

const PROGRAMS: PerformanceProgram[] = ['sports_class', 'sports_event', 'experience_zone']
const DEFAULT_PAGE_SIZE = 30

function parseIntOr(value: string | null, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

export function parsePerformanceFilters(
  params: URLSearchParams,
  adminRole: string
): { filters: PerformanceFilters; error: { message: string } | null } {
  const scope = resolveReservationRegionScope(adminRole, params.get('region'))
  if (scope.error) {
    return {
      filters: {
        year: null, from: null, to: null, region: null, program: 'all', q: '', page: 1, pageSize: DEFAULT_PAGE_SIZE,
      },
      error: scope.error,
    }
  }

  const yearRaw = Number(params.get('year'))
  const programRaw = params.get('program')
  const program = (programRaw && PROGRAMS.includes(programRaw as PerformanceProgram))
    ? (programRaw as PerformanceProgram)
    : 'all'

  return {
    filters: {
      year: Number.isFinite(yearRaw) && yearRaw > 0 ? yearRaw : null,
      from: params.get('from') || null,
      to: params.get('to') || null,
      region: scope.regionCode,
      program,
      q: (params.get('q') || '').trim(),
      page: parseIntOr(params.get('page'), 1),
      pageSize: parseIntOr(params.get('pageSize'), DEFAULT_PAGE_SIZE),
    },
    error: null,
  }
}

export function applyRecordFilters(
  records: PerformanceRecord[],
  filters: PerformanceFilters
): PerformanceRecord[] {
  return records.filter((r) => {
    if (filters.year !== null && Number(r.date.slice(0, 4)) !== filters.year) return false
    if (filters.from && r.date < filters.from) return false
    if (filters.to && r.date > filters.to) return false
    if (filters.region && r.region_code !== filters.region) return false
    if (filters.program !== 'all' && r.program_type !== filters.program) return false
    if (filters.q && !r.organization_name.includes(filters.q)) return false
    return true
  })
}

export function sortByDateDesc(records: PerformanceRecord[]): PerformanceRecord[] {
  return [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; total: number; page: number; pageSize: number } {
  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `node --test src/lib/performanceFilters.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/performanceTypes.ts src/lib/performanceFilters.ts src/lib/performanceFilters.test.ts
git commit -m "feat(performance): add filter/scope helpers with tests"
```

---

## Task 3: 정규화 + override 병합 헬퍼

**Files:**
- Create: `src/lib/performanceRecords.ts`
- Test: `src/lib/performanceRecords.test.ts`

**Interfaces:**
- Consumes: `PerformanceRecord`, `OverrideRow` from `@/lib/performanceTypes`.
- Produces:
  - `combineGrades(grades: (string | null | undefined)[]): string | null` — 공백/중복 제거 후 `, ` 결합, 없으면 null.
  - `applyOverride(base: PerformanceRecord, override?: OverrideRow | null): PerformanceRecord | null` — override의 grade/participant_count는 non-null일 때만 대체, memo는 override row가 있으면 그 값 사용, `excluded=true`면 null 반환.
  - `normalizeSportsClassRow(row: SportsClassRow, override?: OverrideRow | null): PerformanceRecord | null`
  - `normalizeSportsEventRow(row: SportsEventRow, override?: OverrideRow | null): PerformanceRecord | null`
  - `normalizeExperienceRow(row: ExperienceRow): PerformanceRecord`
  - `overrideKey(sourceType: string, sourceId: string): string` — `` `${sourceType}:${sourceId}` ``
  - 입력 로우 타입 `SportsClassRow`, `SportsEventRow`, `ExperienceRow` (아래 구현에 정의).

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/lib/performanceRecords.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  combineGrades,
  applyOverride,
  normalizeSportsClassRow,
  normalizeSportsEventRow,
  normalizeExperienceRow,
  overrideKey,
} from '@/lib/performanceRecords'
import type { OverrideRow, PerformanceRecord } from '@/lib/performanceTypes'

test('combineGrades: 중복/공백 제거 후 결합, 없으면 null', () => {
  assert.equal(combineGrades(['3학년', '3학년', ' ', null, '5학년']), '3학년, 5학년')
  assert.equal(combineGrades([null, '', undefined]), null)
})

test('normalizeSportsClassRow: 슬롯 participant 합산 + grade 결합', () => {
  const row = {
    id: 'r1', date: '2026-05-10', region_id: 1,
    users: { organization_name: '가나초', cities: { name: '수원시', regions: { code: 'south' } } },
    reservation_slots: [
      { grade: '3학년', participant_count: 18 },
      { grade: '4학년', participant_count: 12 },
    ],
  }
  const rec = normalizeSportsClassRow(row as any, null)!
  assert.equal(rec.program_type, 'sports_class')
  assert.equal(rec.participant_count, 30)
  assert.equal(rec.grade, '3학년, 4학년')
  assert.equal(rec.organization_name, '가나초')
  assert.equal(rec.city_name, '수원시')
  assert.equal(rec.region_code, 'south')
  assert.equal(rec.id, 'sports_class:r1')
})

test('applyOverride: participant/grade/memo 대체, excluded면 null', () => {
  const base: PerformanceRecord = {
    id: 'sports_class:r1', program_type: 'sports_class', date: '2026-05-10',
    organization_name: '가나초', city_name: '수원시', region_id: 1, region_code: 'south',
    grade: '3학년', participant_count: 30, memo: null, source_type: 'sports_class', source_id: 'r1',
  }
  const ov: OverrideRow = {
    source_type: 'sports_class', source_id: 'r1', grade: '3,4학년',
    participant_count: 28, memo: '킥볼', excluded: false,
  }
  const merged = applyOverride(base, ov)!
  assert.equal(merged.participant_count, 28)
  assert.equal(merged.grade, '3,4학년')
  assert.equal(merged.memo, '킥볼')
  assert.equal(applyOverride(base, { ...ov, excluded: true }), null)
  // participant_count null이면 원본 유지
  assert.equal(applyOverride(base, { ...ov, participant_count: null })!.participant_count, 30)
})

test('normalizeSportsEventRow: total_count 사용, grade는 null', () => {
  const row = {
    id: 'a1', total_count: 40, applicant_org_name: '다라복지관', region_id: 2,
    event_dates: { event_date: '2026-06-01' },
    regions: { code: 'north' },
  }
  const rec = normalizeSportsEventRow(row as any, null)!
  assert.equal(rec.program_type, 'sports_event')
  assert.equal(rec.date, '2026-06-01')
  assert.equal(rec.participant_count, 40)
  assert.equal(rec.grade, null)
  assert.equal(rec.region_code, 'north')
})

test('normalizeExperienceRow: 입력값 그대로', () => {
  const row = {
    id: 'e1', date: '2026-07-01', organization_name: '체험단', region_id: 1,
    grade: null, participant_count: 55, memo: '축구',
    regions: { code: 'south' }, cities: { name: '성남시' },
  }
  const rec = normalizeExperienceRow(row as any)
  assert.equal(rec.program_type, 'experience_zone')
  assert.equal(rec.participant_count, 55)
  assert.equal(rec.memo, '축구')
  assert.equal(rec.city_name, '성남시')
})

test('overrideKey', () => {
  assert.equal(overrideKey('sports_class', 'r1'), 'sports_class:r1')
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test src/lib/performanceRecords.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: `performanceRecords.ts` 구현**

```ts
import type { OverrideRow, PerformanceRecord } from '@/lib/performanceTypes'

export interface SportsClassRow {
  id: string
  date: string
  region_id: number | null
  users: {
    organization_name: string
    cities: { name: string | null; regions: { code: string | null } | null } | null
  } | null
  reservation_slots: { grade: string | null; participant_count: number | null }[] | null
}

export interface SportsEventRow {
  id: string
  total_count: number | null
  applicant_org_name: string | null
  region_id: number | null
  event_dates: { event_date: string } | null
  regions: { code: string | null } | null
}

export interface ExperienceRow {
  id: string
  date: string
  organization_name: string
  region_id: number | null
  grade: string | null
  participant_count: number | null
  memo: string | null
  regions: { code: string | null } | null
  cities: { name: string | null } | null
}

export function overrideKey(sourceType: string, sourceId: string): string {
  return `${sourceType}:${sourceId}`
}

export function combineGrades(grades: (string | null | undefined)[]): string | null {
  const cleaned = grades
    .map((g) => (g ?? '').trim())
    .filter((g) => g.length > 0)
  const unique = [...new Set(cleaned)]
  return unique.length > 0 ? unique.join(', ') : null
}

function asRegionCode(code: string | null | undefined): 'south' | 'north' | null {
  return code === 'south' || code === 'north' ? code : null
}

export function applyOverride(
  base: PerformanceRecord,
  override?: OverrideRow | null
): PerformanceRecord | null {
  if (!override) return base
  if (override.excluded) return null
  return {
    ...base,
    grade: override.grade != null ? override.grade : base.grade,
    participant_count: override.participant_count != null ? override.participant_count : base.participant_count,
    memo: override.memo != null ? override.memo : base.memo,
  }
}

export function normalizeSportsClassRow(
  row: SportsClassRow,
  override?: OverrideRow | null
): PerformanceRecord | null {
  const slots = row.reservation_slots ?? []
  const base: PerformanceRecord = {
    id: overrideKey('sports_class', row.id),
    program_type: 'sports_class',
    date: row.date,
    organization_name: row.users?.organization_name ?? '(알 수 없음)',
    city_name: row.users?.cities?.name ?? null,
    region_id: row.region_id ?? null,
    region_code: asRegionCode(row.users?.cities?.regions?.code),
    grade: combineGrades(slots.map((s) => s.grade)),
    participant_count: slots.reduce((sum, s) => sum + (s.participant_count ?? 0), 0),
    memo: null,
    source_type: 'sports_class',
    source_id: row.id,
  }
  return applyOverride(base, override)
}

export function normalizeSportsEventRow(
  row: SportsEventRow,
  override?: OverrideRow | null
): PerformanceRecord | null {
  const base: PerformanceRecord = {
    id: overrideKey('sports_event', row.id),
    program_type: 'sports_event',
    date: row.event_dates?.event_date ?? '',
    organization_name: row.applicant_org_name ?? '(알 수 없음)',
    city_name: null,
    region_id: row.region_id ?? null,
    region_code: asRegionCode(row.regions?.code),
    grade: null,
    participant_count: row.total_count ?? 0,
    memo: null,
    source_type: 'sports_event',
    source_id: row.id,
  }
  return applyOverride(base, override)
}

export function normalizeExperienceRow(row: ExperienceRow): PerformanceRecord {
  return {
    id: overrideKey('experience_zone', row.id),
    program_type: 'experience_zone',
    date: row.date,
    organization_name: row.organization_name,
    city_name: row.cities?.name ?? null,
    region_id: row.region_id ?? null,
    region_code: asRegionCode(row.regions?.code),
    grade: row.grade ?? null,
    participant_count: row.participant_count ?? 0,
    memo: row.memo ?? null,
    source_type: 'experience_zone',
    source_id: row.id,
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test src/lib/performanceRecords.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/performanceRecords.ts src/lib/performanceRecords.test.ts
git commit -m "feat(performance): add record normalization + override merge helpers with tests"
```

---

## Task 4: 집계 헬퍼

**Files:**
- Create: `src/lib/performanceAggregate.ts`
- Test: `src/lib/performanceAggregate.test.ts`

**Interfaces:**
- Consumes: `PerformanceRecord`, `PerformanceSummary`, `PerformanceProgram` from `@/lib/performanceTypes`.
- Produces: `aggregatePerformance(records: PerformanceRecord[], year: number | null): PerformanceSummary` — `monthly`는 길이 12 배열(1~12월 참여인원 합; year가 null이면 전체 레코드, non-null이면 해당 연도 레코드만).

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/lib/performanceAggregate.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import { aggregatePerformance } from '@/lib/performanceAggregate'
import type { PerformanceRecord } from '@/lib/performanceTypes'

function rec(p: Partial<PerformanceRecord>): PerformanceRecord {
  return {
    id: 'x', program_type: 'sports_class', date: '2026-05-10',
    organization_name: 'o', city_name: null, region_id: 1, region_code: 'south',
    grade: null, participant_count: 10, memo: null,
    source_type: 'sports_class', source_id: 'x', ...p,
  }
}

test('aggregatePerformance: 프로그램별 회/명 + 총계 + 월별', () => {
  const records = [
    rec({ program_type: 'sports_class', date: '2026-05-01', participant_count: 30 }),
    rec({ program_type: 'sports_class', date: '2026-05-20', participant_count: 20 }),
    rec({ program_type: 'sports_event', date: '2026-06-01', participant_count: 40 }),
    rec({ program_type: 'experience_zone', date: '2026-08-01', participant_count: 15 }),
  ]
  const s = aggregatePerformance(records, 2026)
  assert.equal(s.totalCount, 4)
  assert.equal(s.totalParticipants, 105)
  assert.deepEqual(s.byProgram.sports_class, { count: 2, participants: 50 })
  assert.deepEqual(s.byProgram.sports_event, { count: 1, participants: 40 })
  assert.deepEqual(s.byProgram.experience_zone, { count: 1, participants: 15 })
  assert.equal(s.monthly[4], 50) // 5월(index 4)
  assert.equal(s.monthly[5], 40) // 6월
  assert.equal(s.monthly[7], 15) // 8월
})

test('aggregatePerformance: year 필터가 월별 시리즈를 제한', () => {
  const records = [
    rec({ date: '2025-05-01', participant_count: 100 }),
    rec({ date: '2026-05-01', participant_count: 30 }),
  ]
  const s = aggregatePerformance(records, 2026)
  assert.equal(s.monthly[4], 30)
})

test('aggregatePerformance: 빈 배열', () => {
  const s = aggregatePerformance([], 2026)
  assert.equal(s.totalCount, 0)
  assert.equal(s.totalParticipants, 0)
  assert.equal(s.monthly.length, 12)
  assert.equal(s.monthly.reduce((a, b) => a + b, 0), 0)
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test src/lib/performanceAggregate.test.ts`
Expected: FAIL.

- [ ] **Step 3: `performanceAggregate.ts` 구현**

```ts
import type { PerformanceProgram, PerformanceRecord, PerformanceSummary } from '@/lib/performanceTypes'

const PROGRAMS: PerformanceProgram[] = ['sports_class', 'sports_event', 'experience_zone']

export function aggregatePerformance(
  records: PerformanceRecord[],
  year: number | null
): PerformanceSummary {
  const byProgram = {
    sports_class: { count: 0, participants: 0 },
    sports_event: { count: 0, participants: 0 },
    experience_zone: { count: 0, participants: 0 },
  } as Record<PerformanceProgram, { count: number; participants: number }>

  const monthly = new Array(12).fill(0) as number[]
  let totalCount = 0
  let totalParticipants = 0

  for (const r of records) {
    const bucket = byProgram[r.program_type]
    if (!bucket) continue
    bucket.count += 1
    bucket.participants += r.participant_count
    totalCount += 1
    totalParticipants += r.participant_count

    if (year === null || Number(r.date.slice(0, 4)) === year) {
      const monthIdx = Number(r.date.slice(5, 7)) - 1
      if (monthIdx >= 0 && monthIdx < 12) monthly[monthIdx] += r.participant_count
    }
  }

  return { totalCount, totalParticipants, byProgram, monthly }
}

export const PERFORMANCE_PROGRAMS = PROGRAMS
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test src/lib/performanceAggregate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/performanceAggregate.ts src/lib/performanceAggregate.test.ts
git commit -m "feat(performance): add aggregation helper with tests"
```

---

## Task 5: 서버 조회/변경 계층

**Files:**
- Create: `src/lib/performanceServer.ts`

**Interfaces:**
- Consumes: 정규화/필터/집계 헬퍼, `resolveReservationRegionScope`, service role Supabase 클라이언트.
- Produces:
  - `getPerformanceRecords(adminRole: string, filters: PerformanceFilters): Promise<{ data: { records: PerformanceRecord[]; total: number } | null; error: { message: string } | null }>`
  - `getAllPerformanceRecords(adminRole: string, filters: PerformanceFilters): Promise<{ data: PerformanceRecord[] | null; error: ... }>` (페이지네이션 전 전체 — export/summary용)
  - `getPerformanceSummary(adminRole, filters): Promise<{ data: PerformanceSummary | null; error }>`
  - `createExperienceRecord(adminId, adminRole, input): Promise<{ data; error }>`
  - `updateExperienceRecord(adminRole, id, input): Promise<{ data; error }>`
  - `deleteExperienceRecord(adminRole, id): Promise<{ data; error }>`
  - `upsertPerformanceOverride(adminId, adminRole, sourceType, sourceId, fields): Promise<{ data; error }>`

> **참고:** 이 파일은 Supabase 의존 glue 코드로 `node:test` 단위 테스트 대상이 아니다(순수 로직은 Task 2~4에서 검증됨). 검증은 빌드 + Task 7~10의 라우트 수동 테스트로 수행한다.

- [ ] **Step 1: 파일 골격 + region 코드→id 매핑 로더**

`src/lib/reservationSettingsServer.ts`의 `supabaseAdmin` 생성 패턴과 동일하게 service role 클라이언트를 만든다. 지역 스코핑은 `region_code`(south/north)를 기준으로 필터(`.eq('...regions.code', regionCode)`) — 예약 서버 방식과 동일.

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { resolveReservationRegionScope } from '@/lib/reservationManagementHelpers'
import {
  applyRecordFilters, paginate, sortByDateDesc,
} from '@/lib/performanceFilters'
import {
  normalizeSportsClassRow, normalizeSportsEventRow, normalizeExperienceRow,
  overrideKey,
  type SportsClassRow, type SportsEventRow, type ExperienceRow,
} from '@/lib/performanceRecords'
import { aggregatePerformance } from '@/lib/performanceAggregate'
import type { OverrideRow, PerformanceFilters, PerformanceRecord } from '@/lib/performanceTypes'

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function loadRegionIdForCode(code: 'south' | 'north'): Promise<number | null> {
  const { data } = await supabaseAdmin.from('regions').select('id').eq('code', code).single()
  return data?.id ?? null
}
```

- [ ] **Step 2: override 로더 + 세 소스 로더 + 병합**

```ts
async function loadOverrides(): Promise<Map<string, OverrideRow>> {
  const { data } = await supabaseAdmin
    .from('performance_overrides')
    .select('source_type, source_id, grade, participant_count, memo, excluded')
  const map = new Map<string, OverrideRow>()
  for (const o of data ?? []) {
    map.set(overrideKey(o.source_type, o.source_id), o as OverrideRow)
  }
  return map
}

async function loadSportsClassRecords(
  regionCode: 'south' | 'north' | null,
  overrides: Map<string, OverrideRow>
): Promise<PerformanceRecord[]> {
  let query = supabaseAdmin
    .from('reservations')
    .select(`
      id, date, region_id, status,
      users!inner ( organization_name, cities ( name, regions ( code ) ) ),
      reservation_slots ( grade, participant_count )
    `)
    .eq('status', 'approved')
  if (regionCode) query = query.eq('users.cities.regions.code', regionCode)
  const { data } = await query
  return (data ?? [])
    .map((row) => normalizeSportsClassRow(row as unknown as SportsClassRow, overrides.get(overrideKey('sports_class', (row as any).id))))
    .filter((r): r is PerformanceRecord => r !== null)
}

async function loadSportsEventRecords(
  regionCode: 'south' | 'north' | null,
  overrides: Map<string, OverrideRow>
): Promise<PerformanceRecord[]> {
  let query = supabaseAdmin
    .from('event_applications')
    .select(`
      id, total_count, applicant_org_name, region_id, status,
      event_dates ( event_date ),
      regions ( code )
    `)
    .eq('status', 'selected')
  if (regionCode) query = query.eq('regions.code', regionCode)
  const { data } = await query
  return (data ?? [])
    .map((row) => normalizeSportsEventRow(row as unknown as SportsEventRow, overrides.get(overrideKey('sports_event', (row as any).id))))
    .filter((r): r is PerformanceRecord => r !== null && r.date !== '')
}

async function loadExperienceRecords(
  regionCode: 'south' | 'north' | null
): Promise<PerformanceRecord[]> {
  let query = supabaseAdmin
    .from('experience_zone_records')
    .select(`
      id, date, organization_name, region_id, grade, participant_count, memo,
      regions ( code ), cities ( name )
    `)
  if (regionCode) query = query.eq('regions.code', regionCode)
  const { data } = await query
  return (data ?? []).map((row) => normalizeExperienceRow(row as unknown as ExperienceRow))
}
```

> **주의(nested filter):** PostgREST에서 `.eq('users.cities.regions.code', ...)`는 `users!inner`가 있어야 실제 필터로 작동한다(예약 서버 코드와 동일 관례). event/experience의 `regions`도 지역관리자 조회 시 `!inner`가 필요하면 `regions!inner ( code )`로 바꾼다. 구현 중 지역 스코핑이 안 걸리면 해당 조인을 `!inner`로 조정할 것.

- [ ] **Step 3: 집계/목록/전체 함수**

```ts
async function loadAllRecords(regionCode: 'south' | 'north' | null): Promise<PerformanceRecord[]> {
  const overrides = await loadOverrides()
  const [cls, evt, exp] = await Promise.all([
    loadSportsClassRecords(regionCode, overrides),
    loadSportsEventRecords(regionCode, overrides),
    loadExperienceRecords(regionCode),
  ])
  return [...cls, ...evt, ...exp]
}

export async function getAllPerformanceRecords(adminRole: string, filters: PerformanceFilters) {
  const scope = resolveReservationRegionScope(adminRole, filters.region)
  if (scope.error) return { data: null, error: scope.error }
  try {
    const all = await loadAllRecords(scope.regionCode)
    return { data: sortByDateDesc(applyRecordFilters(all, filters)), error: null }
  } catch (error) {
    return { data: null, error: { message: '실적 데이터를 불러오는 중 오류가 발생했습니다.' } }
  }
}

export async function getPerformanceRecords(adminRole: string, filters: PerformanceFilters) {
  const result = await getAllPerformanceRecords(adminRole, filters)
  if (result.error || !result.data) return { data: null, error: result.error }
  const paged = paginate(result.data, filters.page, filters.pageSize)
  return { data: { records: paged.items, total: paged.total }, error: null }
}

export async function getPerformanceSummary(adminRole: string, filters: PerformanceFilters) {
  const result = await getAllPerformanceRecords(adminRole, filters)
  if (result.error || !result.data) return { data: null, error: result.error }
  return { data: aggregatePerformance(result.data, filters.year), error: null }
}
```

- [ ] **Step 4: 체험존 CRUD + override upsert (지역 강제 포함)**

```ts
export interface ExperienceInput {
  date: string
  organization_name: string
  region_id: number | null
  city_id: number | null
  grade: string | null
  participant_count: number
  memo: string | null
}

async function assertRegionAllowed(adminRole: string, regionId: number | null): Promise<{ message: string } | null> {
  if (adminRole === 'super') return null
  if (adminRole !== 'south' && adminRole !== 'north') return { message: '관리자 권한이 없습니다.' }
  const ownId = await loadRegionIdForCode(adminRole)
  if (regionId !== null && ownId !== null && regionId !== ownId) {
    return { message: '해당 지역 데이터에 접근할 권한이 없습니다.' }
  }
  return null
}

export async function createExperienceRecord(adminId: string, adminRole: string, input: ExperienceInput) {
  // 지역관리자는 region_id를 자기 지역으로 강제
  let regionId = input.region_id
  if (adminRole === 'south' || adminRole === 'north') {
    regionId = await loadRegionIdForCode(adminRole)
  }
  const { data, error } = await supabaseAdmin
    .from('experience_zone_records')
    .insert({ ...input, region_id: regionId, created_by: adminId })
    .select()
    .single()
  if (error) return { data: null, error: { message: '체험존 실적 저장에 실패했습니다.' } }
  return { data, error: null }
}

async function loadExperienceRegionId(id: string): Promise<number | null | undefined> {
  const { data } = await supabaseAdmin.from('experience_zone_records').select('region_id').eq('id', id).single()
  return data ? data.region_id : undefined // undefined = not found
}

export async function updateExperienceRecord(adminRole: string, id: string, input: Partial<ExperienceInput>) {
  const existingRegion = await loadExperienceRegionId(id)
  if (existingRegion === undefined) return { data: null, error: { message: '실적을 찾을 수 없습니다.' } }
  const guard = await assertRegionAllowed(adminRole, existingRegion ?? null)
  if (guard) return { data: null, error: guard }
  const { data, error } = await supabaseAdmin
    .from('experience_zone_records')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) return { data: null, error: { message: '체험존 실적 수정에 실패했습니다.' } }
  return { data, error: null }
}

export async function deleteExperienceRecord(adminRole: string, id: string) {
  const existingRegion = await loadExperienceRegionId(id)
  if (existingRegion === undefined) return { data: null, error: { message: '실적을 찾을 수 없습니다.' } }
  const guard = await assertRegionAllowed(adminRole, existingRegion ?? null)
  if (guard) return { data: null, error: guard }
  const { error } = await supabaseAdmin.from('experience_zone_records').delete().eq('id', id)
  if (error) return { data: null, error: { message: '체험존 실적 삭제에 실패했습니다.' } }
  return { data: { id }, error: null }
}

export interface OverrideFields {
  grade: string | null
  participant_count: number | null
  memo: string | null
  excluded: boolean
}

export async function upsertPerformanceOverride(
  adminId: string,
  adminRole: string,
  sourceType: 'sports_class' | 'sports_event',
  sourceId: string,
  fields: OverrideFields
) {
  // 지역관리자 권한 검증: 대상 레코드가 자기 지역인지 확인
  if (adminRole === 'south' || adminRole === 'north') {
    const ownAll = await getAllPerformanceRecords(adminRole, {
      year: null, from: null, to: null, region: adminRole, program: 'all', q: '', page: 1, pageSize: 100000,
    })
    const found = ownAll.data?.some((r) => r.source_type === sourceType && r.source_id === sourceId)
    if (!found) return { data: null, error: { message: '해당 지역 데이터에 접근할 권한이 없습니다.' } }
  }
  // 모든 필드가 비어 있으면 override 삭제(원복)
  const isEmpty = fields.grade == null && fields.participant_count == null && (fields.memo == null || fields.memo === '') && !fields.excluded
  if (isEmpty) {
    await supabaseAdmin.from('performance_overrides').delete().eq('source_type', sourceType).eq('source_id', sourceId)
    return { data: { cleared: true }, error: null }
  }
  const { data, error } = await supabaseAdmin
    .from('performance_overrides')
    .upsert(
      { source_type: sourceType, source_id: sourceId, ...fields, updated_by: adminId, updated_at: new Date().toISOString() },
      { onConflict: 'source_type,source_id' }
    )
    .select()
    .single()
  if (error) return { data: null, error: { message: '실적 수정에 실패했습니다.' } }
  return { data, error: null }
}
```

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: 신규 파일 관련 타입/컴파일 에러 없음. (기존 무관 경고는 무시)

- [ ] **Step 6: Commit**

```bash
git add src/lib/performanceServer.ts
git commit -m "feat(performance): add server data layer (records/summary/experience/override)"
```

---

## Task 6: GET 라우트 (summary, records)

**Files:**
- Create: `src/app/api/admin/performance/summary/route.ts`
- Create: `src/app/api/admin/performance/records/route.ts`

**Interfaces:**
- Consumes: `validateApiRequest`, `isAdmin` from `@/lib/auth`; `parsePerformanceFilters`; `getPerformanceSummary`, `getPerformanceRecords`.

- [ ] **Step 1: 공통 admin 검증 헬퍼는 라우트별 인라인(예약 라우트 패턴)으로 작성**

`summary/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, validateApiRequest } from '@/lib/auth'
import { parsePerformanceFilters } from '@/lib/performanceFilters'
import { getPerformanceSummary } from '@/lib/performanceServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiRequest(request)
    if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { filters, error } = parsePerformanceFilters(request.nextUrl.searchParams, auth.user.role)
    if (error) return NextResponse.json({ error }, { status: 403 })
    const result = await getPerformanceSummary(auth.user.role, filters)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('실적 요약 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '실적 요약을 불러오는 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: `records/route.ts` 작성 (동일 패턴, `getPerformanceRecords` 사용, 반환 `{ data: { records, total } }`)**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, validateApiRequest } from '@/lib/auth'
import { parsePerformanceFilters } from '@/lib/performanceFilters'
import { getPerformanceRecords } from '@/lib/performanceServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiRequest(request)
    if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { filters, error } = parsePerformanceFilters(request.nextUrl.searchParams, auth.user.role)
    if (error) return NextResponse.json({ error }, { status: 403 })
    const result = await getPerformanceRecords(auth.user.role, filters)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('실적 목록 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '실적 목록을 불러오는 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: 빌드 + 수동 확인**

Run: `npm run build`
그 후 seeded 환경에서 관리자 로그인 쿠키로:
`GET /api/admin/performance/summary?year=2026` → `{ data: { totalCount, totalParticipants, byProgram, monthly } }` 200 확인.
`GET /api/admin/performance/records?year=2026&page=1` → `{ data: { records: [...], total } }` 확인.
미인증 요청은 401 확인.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/performance/summary/route.ts src/app/api/admin/performance/records/route.ts
git commit -m "feat(performance): add summary + records GET routes"
```

---

## Task 7: 변경 라우트 (체험존 CRUD, override)

**Files:**
- Create: `src/app/api/admin/performance/experience/route.ts` (POST)
- Create: `src/app/api/admin/performance/experience/[id]/route.ts` (PATCH, DELETE)
- Create: `src/app/api/admin/performance/override/route.ts` (PATCH)

**Interfaces:**
- Consumes: `createExperienceRecord`, `updateExperienceRecord`, `deleteExperienceRecord`, `upsertPerformanceOverride`.

- [ ] **Step 1: `experience/route.ts` (POST) — 입력 검증 후 생성**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, validateApiRequest } from '@/lib/auth'
import { createExperienceRecord, type ExperienceInput } from '@/lib/performanceServer'
import { getErrorMessage } from '@/lib/requestUtils'

function parseInput(body: any): { input: ExperienceInput | null; message: string | null } {
  const date = typeof body?.date === 'string' ? body.date : ''
  const organization_name = typeof body?.organization_name === 'string' ? body.organization_name.trim() : ''
  if (!date || !organization_name) return { input: null, message: '날짜와 단체명은 필수입니다.' }
  const count = Number(body?.participant_count)
  return {
    input: {
      date,
      organization_name,
      region_id: body?.region_id != null ? Number(body.region_id) : null,
      city_id: body?.city_id != null ? Number(body.city_id) : null,
      grade: typeof body?.grade === 'string' && body.grade.trim() ? body.grade.trim() : null,
      participant_count: Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0,
      memo: typeof body?.memo === 'string' && body.memo.trim() ? body.memo.trim() : null,
    },
    message: null,
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validateApiRequest(request)
    if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { input, message } = parseInput(body)
    if (!input) return NextResponse.json({ error: { message } }, { status: 400 })
    const result = await createExperienceRecord(auth.user.id, auth.user.role, input)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('체험존 실적 생성 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '체험존 실적 저장 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: `experience/[id]/route.ts` (PATCH, DELETE)**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, validateApiRequest } from '@/lib/auth'
import { updateExperienceRecord, deleteExperienceRecord } from '@/lib/performanceServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await validateApiRequest(request)
    if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const body = await request.json()
    const patch: any = {}
    if (typeof body?.date === 'string') patch.date = body.date
    if (typeof body?.organization_name === 'string') patch.organization_name = body.organization_name.trim()
    if ('region_id' in body) patch.region_id = body.region_id != null ? Number(body.region_id) : null
    if ('city_id' in body) patch.city_id = body.city_id != null ? Number(body.city_id) : null
    if ('grade' in body) patch.grade = body.grade?.trim() || null
    if ('participant_count' in body) patch.participant_count = Math.max(0, Math.floor(Number(body.participant_count) || 0))
    if ('memo' in body) patch.memo = body.memo?.trim() || null
    const result = await updateExperienceRecord(auth.user.role, id, patch)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('체험존 실적 수정 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '체험존 실적 수정 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await validateApiRequest(request)
    if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const result = await deleteExperienceRecord(auth.user.role, id)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('체험존 실적 삭제 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '체험존 실적 삭제 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
```

> **참고:** Next.js 15에서 동적 라우트 `params`는 Promise다(`await params`). 기존 `[id]` 라우트가 있으면 그 시그니처를 따를 것.

- [ ] **Step 3: `override/route.ts` (PATCH)**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, validateApiRequest } from '@/lib/auth'
import { upsertPerformanceOverride, type OverrideFields } from '@/lib/performanceServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function PATCH(request: NextRequest) {
  try {
    const auth = await validateApiRequest(request)
    if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const sourceType = body?.source_type
    const sourceId = typeof body?.source_id === 'string' ? body.source_id : ''
    if ((sourceType !== 'sports_class' && sourceType !== 'sports_event') || !sourceId) {
      return NextResponse.json({ error: { message: 'source_type/source_id가 올바르지 않습니다.' } }, { status: 400 })
    }
    const fields: OverrideFields = {
      grade: typeof body?.grade === 'string' && body.grade.trim() ? body.grade.trim() : null,
      participant_count: body?.participant_count != null && body.participant_count !== ''
        ? Math.max(0, Math.floor(Number(body.participant_count)))
        : null,
      memo: typeof body?.memo === 'string' && body.memo.trim() ? body.memo.trim() : null,
      excluded: body?.excluded === true,
    }
    const result = await upsertPerformanceOverride(auth.user.id, auth.user.role, sourceType, sourceId, fields)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('실적 override API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '실적 수정 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: 빌드 + 수동 확인**

Run: `npm run build`
seeded 환경에서: 체험존 POST → 목록에 반영, PATCH/DELETE 동작, override PATCH 후 `records`에서 값 변경/제외 반영 확인. 지역관리자 계정으로 타 지역 대상 override/삭제 시 403 확인.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/performance/experience src/app/api/admin/performance/override
git commit -m "feat(performance): add experience CRUD + override mutation routes"
```

---

## Task 8: Excel 내보내기 라우트

**Files:**
- Create: `src/app/api/admin/performance/export/route.ts`

**Interfaces:**
- Consumes: `parsePerformanceFilters`, `getAllPerformanceRecords`, `ExcelJS`.

- [ ] **Step 1: 라우트 작성 (필터 적용된 전체 레코드를 xlsx로 스트리밍)**

```ts
import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { isAdmin, validateApiRequest } from '@/lib/auth'
import { parsePerformanceFilters } from '@/lib/performanceFilters'
import { getAllPerformanceRecords } from '@/lib/performanceServer'
import { getErrorMessage } from '@/lib/requestUtils'

const PROGRAM_LABEL: Record<string, string> = {
  sports_class: '스포츠교실',
  sports_event: '스포츠이벤트',
  experience_zone: '스포츠체험존',
}

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiRequest(request)
    if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { filters, error } = parsePerformanceFilters(request.nextUrl.searchParams, auth.user.role)
    if (error) return NextResponse.json({ error }, { status: 403 })
    const result = await getAllPerformanceRecords(auth.user.role, filters)
    if (result.error || !result.data) {
      return NextResponse.json({ error: result.error ?? { message: '데이터 없음' } }, { status: 400 })
    }

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('실적')
    ws.columns = [
      { header: '날짜', key: 'date', width: 14 },
      { header: '단체명', key: 'organization_name', width: 24 },
      { header: '시/군', key: 'city_name', width: 12 },
      { header: '지역', key: 'region', width: 8 },
      { header: '프로그램', key: 'program', width: 14 },
      { header: '학년', key: 'grade', width: 12 },
      { header: '총인원', key: 'participant_count', width: 10 },
      { header: '메모', key: 'memo', width: 30 },
    ]
    for (const r of result.data) {
      ws.addRow({
        date: r.date,
        organization_name: r.organization_name,
        city_name: r.city_name ?? '',
        region: r.region_code === 'south' ? '남부' : r.region_code === 'north' ? '북부' : '',
        program: PROGRAM_LABEL[r.program_type] ?? r.program_type,
        grade: r.grade ?? '',
        participant_count: r.participant_count,
        memo: r.memo ?? '',
      })
    }
    ws.getRow(1).font = { bold: true }

    const buffer = await wb.xlsx.writeBuffer()
    const filename = `performance_${filters.year ?? 'all'}.xlsx`
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('실적 내보내기 API 오류:', error)
    return NextResponse.json(
      { error: { message: getErrorMessage(error, '실적 내보내기 중 오류가 발생했습니다.') } },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: 빌드 + 수동 확인**

Run: `npm run build`
브라우저에서 `GET /api/admin/performance/export?year=2026` → xlsx 다운로드, 컬럼/값 정상 확인.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/performance/export/route.ts
git commit -m "feat(performance): add Excel export route"
```

---

## Task 9: 네비게이션 탭

**Files:**
- Modify: `src/components/AdminNavigation.tsx`

**Interfaces:**
- Consumes: 기존 `navItems` 배열 패턴.

- [ ] **Step 1: lucide 아이콘 import에 `BarChart3` 추가**

`import { ... , Trophy } from 'lucide-react'` 줄에 `BarChart3` 추가.

- [ ] **Step 2: `navItems`에 실적관리 항목 추가 (스포츠이벤트와 예약 관리 사이)**

```tsx
    {
      href: '/admin/performance',
      label: '실적관리',
      icon: BarChart3,
      roles: ['super', 'south', 'north']
    },
```

- [ ] **Step 3: 활성 상태 처리 확인**

`isActive`는 `pathname === item.href`라 `/admin/performance/records`에서는 상위 탭이 활성으로 안 뜬다. 실적관리 탭을 하위 페이지에서도 활성 표시하려면 해당 항목만 `pathname.startsWith('/admin/performance')`로 판정하도록 조건 보완(선택):

```tsx
                const isActive = item.href === '/admin/performance'
                  ? pathname.startsWith('/admin/performance')
                  : pathname === item.href
```

- [ ] **Step 4: 빌드 + 육안 확인**

Run: `npm run build`
관리자 페이지에서 실적관리 탭이 보이고 클릭 시 `/admin/performance`로 이동하는지 확인.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminNavigation.tsx
git commit -m "feat(performance): add 실적관리 nav tab"
```

---

## Task 10: 대시보드 페이지

**Files:**
- Create: `src/app/admin/performance/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/performance/summary`, `AdminNavigation`, `Spinner`, `buildCookieFirstJsonRequestInit` from `@/lib/clientAuthHeaders`, `PerformanceSummary` type.

- [ ] **Step 1: 페이지 골격 + 인증 가드 + 필터 상태**

`'use client'`. `localStorage.getItem('adminInfo')`로 role 확인(없으면 `/auth/login` 리다이렉트). 상태: `year`(기본 현재 연도), `region`('all'|'south'|'north'; 지역관리자는 자기 지역 고정·비활성), `from`, `to`, `summary`, `loading`. 지역관리자 여부는 `adminInfo.role`.

- [ ] **Step 2: summary fetch**

```tsx
const params = new URLSearchParams()
params.set('year', String(year))
if (region !== 'all') params.set('region', region)
if (from) params.set('from', from)
if (to) params.set('to', to)
const res = await fetch(`/api/admin/performance/summary?${params}`, buildCookieFirstJsonRequestInit())
const json = await res.json()
if (res.ok) setSummary(json.data as PerformanceSummary)
```

`year/region/from/to` 변경 시 재요청(useEffect 의존성).

- [ ] **Step 3: 필터 바 UI (연도 칩 2025~2030 + 지역 토글 + 기간 + 초기화)**

기존 admin 톤: `bg-white rounded-xl shadow-sm p-4/6`, 선택 칩 `bg-blue-600 text-white`, 비선택 `bg-gray-100 text-gray-700`. 지역관리자는 지역 토글을 자기 지역만 표시하거나 `disabled`.

- [ ] **Step 4: 요약 카드 2개 + 프로그램별 펼침**

- 카드1 `총 실적 횟수` = `summary.totalCount` (`회`). 클릭 시 `expanded` 토글 → `스포츠교실 {byProgram.sports_class.count}회 {..participants}명 / 스포츠체험존 ... / 스포츠이벤트 ...` 표시.
- 카드2 `총 참여인원` = `summary.totalParticipants` (`명`).
- 아이콘: `Calendar`, `Users2` (lucide). 등록 단체수·홍보 카드는 만들지 않는다.

- [ ] **Step 5: 월별 참여인원 막대그래프 (인라인 SVG)**

`summary.monthly`(길이 12)로 막대 렌더. 최대값 기준 높이 스케일, 1~12월 라벨, 최댓값 막대에 수치 표기. 외부 차트 라이브러리 사용 금지. 카드 컨테이너 `bg-white rounded-xl shadow-sm p-6`, 막대 `fill-blue-500`. 가로 스크롤 필요 시 `overflow-x-auto`.

- [ ] **Step 6: 상세 페이지 링크 버튼**

"실적 상세 조회" 버튼 → `/admin/performance/records`로 이동(현재 필터를 쿼리로 전달: `?year=&region=&from=&to=`).

- [ ] **Step 7: 빌드 + 육안 확인**

Run: `npm run build`
`/admin/performance` 진입 → 요약 카드/그래프 렌더, 연도·지역·기간 변경 시 갱신, 카드 클릭 시 프로그램별 펼침 확인. 지역관리자 계정은 자기 지역만.

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/performance/page.tsx
git commit -m "feat(performance): add dashboard page"
```

---

## Task 11: 실적 조회 페이지 + 모달

**Files:**
- Create: `src/app/admin/performance/records/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/performance/records`, `POST/PATCH/DELETE /api/admin/performance/experience`, `PATCH /api/admin/performance/override`, `GET /api/admin/performance/export`, `AdminNavigation`, `ModalOverlay`, `Spinner`, `buildCookieFirstJsonRequestInit`, `PerformanceRecord` type.

- [ ] **Step 1: 페이지 골격 + 인증 가드 + 필터/페이지 상태**

`'use client'`. 초기 필터는 URL 쿼리(`useSearchParams`, `Suspense`로 감싼다 — 기존 reservations 페이지 패턴)에서 읽어 대시보드에서 넘어온 값 반영. 상태: `year, region, from, to, program('all'|3종), q, page`, `records`, `total`, `loading`.

- [ ] **Step 2: records fetch (필터/페이지 반영)**

```tsx
const params = new URLSearchParams()
params.set('year', String(year))
if (region !== 'all') params.set('region', region)
if (program !== 'all') params.set('program', program)
if (from) params.set('from', from)
if (to) params.set('to', to)
if (q) params.set('q', q)
params.set('page', String(page))
const res = await fetch(`/api/admin/performance/records?${params}`, buildCookieFirstJsonRequestInit())
const json = await res.json()
if (res.ok) { setRecords(json.data.records); setTotal(json.data.total) }
```

- [ ] **Step 3: 필터 바 + 표 렌더**

필터: 연도 select, 검색 input(단체명), 지역 select(지역관리자는 고정), 시작~종료일, 프로그램 select(전체/스포츠교실/스포츠체험존/스포츠이벤트), 전체 초기화 버튼. 표 컬럼: 날짜·단체명·시/군·지역(뱃지)·프로그램·학년·총인원·메모·작업. 지역 뱃지: 남부 `bg-blue-100 text-blue-700`, 북부 `bg-green-100 text-green-700`. 프로그램 라벨 매핑(`sports_class→스포츠교실` 등).

- [ ] **Step 4: 체험존 추가 버튼 + 입력 모달**

"체험존 실적 추가" 버튼(`bg-blue-600`) → `ModalOverlay`(`closeOnBackdrop={false}`) 폼: 날짜*, 단체명*, 지역(select; 지역관리자는 고정), 시/군(선택), 학년(선택), 총인원*, 메모. 저장 시 `POST /api/admin/performance/experience` → 성공하면 목록 새로고침. (시/군 목록은 `cities` — 필요하면 `/api/...` 또는 기존 city 로딩 방식 재사용; 최소 구현은 시/군 생략 가능하나 지역 select는 필수.)

- [ ] **Step 5: 행 수정 모달 (프로그램별 분기)**

연필 아이콘 클릭 → `editing` 레코드 상태.
- `program_type === 'experience_zone'`: 전체 필드 수정(PATCH `experience/[id]`) + 삭제 버튼(DELETE).
- `sports_class`/`sports_event`: 학년·총인원·메모 입력 + `실적 제외` 체크박스 → `PATCH /api/admin/performance/override`(`source_type=program_type, source_id`). 저장 후 목록 새로고침. (원본 예약은 수정/삭제하지 않음을 안내 문구로 표기.)

- [ ] **Step 6: Excel 다운로드 버튼 + 페이지네이션**

다운로드 버튼 → 현재 필터 쿼리로 `window.location.href = '/api/admin/performance/export?...'` 또는 fetch→blob 다운로드. `총 {total}건 중 {records.length}건 표시` + 이전/다음 페이지(페이지당 30).

- [ ] **Step 7: 빌드 + 수동 E2E 확인**

Run: `npm run build`
`/admin/performance/records`에서: 필터 동작, 체험존 추가/수정/삭제, 교실·이벤트 행 override 수정·제외 반영, Excel 다운로드, 페이지네이션 확인. 지역관리자 계정은 자기 지역만·타 지역 수정 불가 확인.

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/performance/records/page.tsx
git commit -m "feat(performance): add records page with add/edit modals and export"
```

---

## Task 12: 전체 검증 + 스키마 적용 안내

**Files:** (없음 — 통합 검증)

- [ ] **Step 1: 전체 테스트**

Run: `node --test src/lib/performanceFilters.test.ts src/lib/performanceRecords.test.ts src/lib/performanceAggregate.test.ts`
Expected: 전부 PASS.

- [ ] **Step 2: 프로덕션 빌드**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 3: 스키마 적용 확인**

`performance-schema.sql`을 Supabase SQL editor에서 실행했는지 확인(미실행 시 API가 빈 결과/에러). `npm run gen:types` 실행 가능하면 재생성해 인라인 타입과 대조(선택).

- [ ] **Step 4: 지역 스코핑 스팟체크**

super/ south / north 각 계정으로 대시보드·조회 페이지 접근해 데이터 범위가 올바른지 확인. 지역관리자의 타 지역 override/체험존 수정이 403인지 확인.

- [ ] **Step 5: (선택) CLAUDE.md API 라우트 목록에 실적 라우트 추가**

`## API Routes` 섹션의 Admin 항목에 `/api/admin/performance/*` 추가.

- [ ] **Step 6: Commit (문서 갱신 시)**

```bash
git add CLAUDE.md
git commit -m "docs: note performance management API routes"
```

---

## Self-Review 결과

**Spec 커버리지:** 데이터모델(신규 테이블 2개·override 병합) → Task 1,3,5 / 라이브 union → Task 5 / summary·records·experience·override·export API → Task 6~8 / 대시보드(요약카드 2개·프로그램별 펼침·월별 그래프) → Task 10 / 실적조회(필터·표·추가/수정/삭제·Excel·페이지네이션) → Task 11 / 지역 스코핑 → Task 2,5,7,11,12 / 네비 → Task 9. 성별·예산·홍보·등록단체수·CSV 업로드 제외 준수. 학년 nullable 준수.

**Placeholder 스캔:** 모든 코드 스텝에 실제 코드 포함. "적절한 에러 처리" 류 없음. 시/군 select는 "최소 구현 시 생략 가능"으로 명시(모호성 아닌 선택지).

**타입 일관성:** `PerformanceRecord`/`OverrideRow`/`PerformanceFilters`/`PerformanceSummary`는 `performanceTypes.ts`(Task 2)에서 정의하고 이후 태스크가 참조. 함수명 `getAllPerformanceRecords`/`getPerformanceRecords`/`getPerformanceSummary`/`upsertPerformanceOverride`/`createExperienceRecord` 등 Task 5 정의와 Task 6~8 소비가 일치. 프로그램 리터럴 3종·지역 리터럴 2종 verbatim 통일.
