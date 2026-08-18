# 스포츠이벤트 Phase 3 (서류 제출 + 관리자 신청관리) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 본인 신청건에 서류를 제출(업로드/삭제/조회)하고 서류양식을 다운로드하며, 관리자가 이벤트별 신청자를 관리(선정/탈락, 되돌리기 가능)하고 제출 서류를 서명URL로 다운로드할 수 있게 한다.

**Architecture:** 순수 로직(제출 가능 여부·선정상태 유효성)은 `src/lib/*.ts` + `node:test`. service-role 서버 로직은 `eventSubmissionServer.ts`(사용자+관리자 서류)와 `eventAdminApplicationServer.ts`(관리자 신청관리)로 분리. private `event-files` 버킷 다운로드는 서버 API가 소유권 확인 후 `createSignedUrl`(1시간, 원본 파일명) 발급. UI는 Phase 2의 내 신청내역 모달 확장 + 신규 관리자 `/admin/events/[id]` 페이지. 이벤트는 지역 무관.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Supabase(service-role), `node:test`, 기존 `fileValidation.ts` / `FileUploadManager` 재사용.

**Spec:** `docs/superpowers/specs/2026-08-14-sports-event-phase2-4-user-application-design.md` (§4.5, §6, §8.1/8.2, §13)

## Global Constraints

- 스포츠교실 예약/대시보드/공지 코드와 공유 헬퍼(`resolveReservationRegionScope`, `regions`/`cities`)는 **수정 금지**(읽기만).
- 이벤트는 **지역 구분 없음**. 관리자 신청관리에 지역 컬럼·필터 없음.
- 모든 서버 쓰기/스토리지 접근은 service-role API 라우트에서만. 오류 형식 `{ error: { message } }`(한국어).
- 서류 제출/삭제는 서버에서 **`application.user_id` 소유권 확인** + 신청 상태가 **`cancelled`가 아닐 때만** 허용(`canSubmit`).
- 관리자 선정/탈락은 **되돌리기 가능**(applied↔selected↔rejected), 허용값은 `isValidSelectionStatus`.
- 서류 제출 파일: `fileValidation.ts` 재사용(pdf/hwp/hwpx/jpg/jpeg/png, 개당 5MB), 신청건당 **최대 10개**. 버킷 `event-files`(private) 경로 `submissions/{applicationId}/{ts}_{safeName}`.
- 다운로드는 **서명URL(3600초)**, 소유권/접근권 확인 후 발급. zip 일괄 다운로드 없음(YAGNI).
- 테스트: 순수 헬퍼는 라이브러리 옆 `*.test.ts` + `node --test`, import는 `.ts` 확장자.

---

## 기존 코드 참조 (구현 전 읽을 것)

- `src/app/api/admin/events/files/route.ts` — Phase 1 서류양식 업로드/삭제 라우트. `event-files` 버킷 자동생성, `validateFileMetadata`/`validateAttachmentCount`/`sanitizeFileName`, `createClient(supabaseUrl, serviceKey)` 패턴. **미러 대상.**
- `src/lib/supabase.ts:1848` `getAttachmentDownloadUrl` — `createSignedUrl(path, 3600, { download: fileName })` 패턴.
- `src/lib/fileValidation.ts` — `validateFileMetadata(name, size, type)`, `validateAttachmentCount(count, maxCount)`, `sanitizeFileName(name)`.
- `src/lib/eventApplicationServer.ts` — Phase 2. `ServerResult<T>` 타입 정의(`{ data, error, status? }`)를 export함. 재사용.
- `src/lib/auth.ts` — `validateApiRequest`+`isAdmin`(관리자), `validateUserApiRequest`(사용자, `authResult.user.id`).
- `src/components/MyApplicationsModal.tsx` — Phase 2 내 신청내역 모달(확장 대상).
- `src/components/FileUploadManager.tsx` — 첨부 업로드 UI(`files`, `onChange`, `maxFiles`, `maxFileSize` props). `FileAttachment` 타입.
- `src/app/admin/events/page.tsx` — 관리자 이벤트 목록(신청수·신청관리 링크 추가 대상). `EventRow`에 `event_dates`/`event_form_files` 있음.
- `src/app/events/[id]/page.tsx` — 사용자 이벤트 상세(서류양식 다운로드 링크 추가 대상). `event.event_form_files` 배열 존재.
- `src/lib/requestUtils.ts` — `getErrorMessage`, `withTimeout`.

---

### Task 1: 서류/선정 순수 헬퍼

**Files:**
- Create: `src/lib/eventSubmissionHelpers.ts`
- Test: `src/lib/eventSubmissionHelpers.test.ts`

**Interfaces:**
- Produces:
  - `canSubmit(status: string): boolean` — `status !== 'cancelled'`
  - `isValidSelectionStatus(status: string): boolean` — `['applied','selected','rejected'].includes(status)`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// src/lib/eventSubmissionHelpers.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'

import { canSubmit, isValidSelectionStatus } from './eventSubmissionHelpers.ts'

test('취소가 아니면 제출 가능', () => {
  assert.equal(canSubmit('applied'), true)
  assert.equal(canSubmit('selected'), true)
  assert.equal(canSubmit('rejected'), true)
  assert.equal(canSubmit('cancelled'), false)
})

test('선정 상태 유효값', () => {
  assert.equal(isValidSelectionStatus('applied'), true)
  assert.equal(isValidSelectionStatus('selected'), true)
  assert.equal(isValidSelectionStatus('rejected'), true)
  assert.equal(isValidSelectionStatus('cancelled'), false)
  assert.equal(isValidSelectionStatus('unknown'), false)
})
```

- [ ] **Step 2: 실패 확인**

Run: `node --test src/lib/eventSubmissionHelpers.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

```typescript
// src/lib/eventSubmissionHelpers.ts
export function canSubmit(status: string): boolean {
  return status !== 'cancelled'
}

export function isValidSelectionStatus(status: string): boolean {
  return status === 'applied' || status === 'selected' || status === 'rejected'
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test src/lib/eventSubmissionHelpers.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/eventSubmissionHelpers.ts src/lib/eventSubmissionHelpers.test.ts
git commit -m "feat(events): add submission/selection pure helpers (TDD)"
```

---

### Task 2: 서류 제출 서버 (사용자 업로드/삭제/조회 + 관리자 조회 + 서명URL)

**Files:**
- Create: `src/lib/eventSubmissionServer.ts`

**Interfaces:**
- Consumes: `canSubmit` (Task 1), `ServerResult` (from `@/lib/eventApplicationServer`), `validateFileMetadata`/`validateAttachmentCount`/`sanitizeFileName` (`@/lib/fileValidation`).
- Produces:
  - `type SubmissionRow = { id: string; application_id: string; file_name: string; file_size: number; file_type: string; storage_path: string; uploaded_at: string }`
  - `uploadSubmissionOnServer(applicationId: string, userId: string, file: File): Promise<ServerResult<SubmissionRow>>`
  - `deleteSubmissionOnServer(id: string, userId: string): Promise<ServerResult<{ id: string }>>`
  - `listMySubmissionsOnServer(applicationId: string, userId: string): Promise<ServerResult<SubmissionRow[]>>`
  - `listSubmissionsForEventOnServer(eventId: string): Promise<ServerResult<AdminSubmissionGroup[]>>` where `AdminSubmissionGroup = { application_id: string; org_name: string; manager_name: string | null; phone: string | null; status: string; submissions: SubmissionRow[] }`
  - `signedUrlForOwnSubmissionOnServer(id: string, userId: string): Promise<ServerResult<{ url: string }>>`
  - `signedUrlForSubmissionOnServer(id: string): Promise<ServerResult<{ url: string }>>` (admin)

**설명:** `event-files` private 버킷. 사용자 함수는 신청건 소유권(`application.user_id === userId`)을 항상 확인하고, 업로드는 `canSubmit(status)` + 개수(<10) 검증. 다운로드는 소유권 확인 후 `createSignedUrl(path, 3600, { download: file_name })`.

- [ ] **Step 1: 구현 작성**

```typescript
// src/lib/eventSubmissionServer.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import { canSubmit } from '@/lib/eventSubmissionHelpers'
import { validateFileMetadata, validateAttachmentCount, sanitizeFileName } from '@/lib/fileValidation'
import type { ServerResult } from '@/lib/eventApplicationServer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
const T = 8000
const BUCKET = 'event-files'
const MAX_SUBMISSIONS = 10

export type SubmissionRow = {
  id: string
  application_id: string
  file_name: string
  file_size: number
  file_type: string
  storage_path: string
  uploaded_at: string
}
export type AdminSubmissionGroup = {
  application_id: string
  org_name: string
  manager_name: string | null
  phone: string | null
  status: string
  submissions: SubmissionRow[]
}

// 신청건을 소유한 사용자인지 + 상태를 확인해 반환
async function loadOwnedApplication(applicationId: string, userId: string): Promise<{ status: string } | null> {
  const { data } = await withTimeout(
    supabaseAdmin.from('event_applications').select('id, user_id, status').eq('id', applicationId).maybeSingle(),
    T, '신청 정보를 확인하는 중 시간이 초과되었습니다.'
  )
  if (!data || data.user_id !== userId) return null
  return { status: data.status }
}

export async function uploadSubmissionOnServer(applicationId: string, userId: string, file: File): Promise<ServerResult<SubmissionRow>> {
  try {
    const app = await loadOwnedApplication(applicationId, userId)
    if (!app) return { data: null, error: { message: '본인 신청건에만 서류를 제출할 수 있습니다.' }, status: 403 }
    if (!canSubmit(app.status)) return { data: null, error: { message: '취소된 신청건에는 서류를 제출할 수 없습니다.' }, status: 400 }

    const { data: existing, error: cErr } = await withTimeout(
      supabaseAdmin.from('event_submissions').select('id').eq('application_id', applicationId),
      T, '제출 서류 개수를 확인하는 중 시간이 초과되었습니다.'
    )
    if (cErr) return { data: null, error: { message: '제출 서류 개수를 확인할 수 없습니다.' }, status: 500 }
    const countCheck = validateAttachmentCount(existing?.length || 0, MAX_SUBMISSIONS)
    if (!countCheck.valid) return { data: null, error: { message: countCheck.error || '제출 개수를 초과했습니다.' }, status: 400 }

    const fileCheck = validateFileMetadata(file.name, file.size, file.type)
    if (!fileCheck.valid) return { data: null, error: { message: fileCheck.error || '허용되지 않는 파일입니다.' }, status: 400 }

    const timestamp = Date.now()
    const filePath = `submissions/${applicationId}/${timestamp}_${sanitizeFileName(file.name)}`

    let uploadErr = (await supabaseAdmin.storage.from(BUCKET).upload(filePath, file, { cacheControl: '3600', upsert: false })).error
    if (uploadErr && /bucket.*not.*found/i.test(uploadErr.message || '')) {
      const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET, { public: false })
      if (createErr) return { data: null, error: { message: '파일 저장소를 준비할 수 없습니다.' }, status: 500 }
      uploadErr = (await supabaseAdmin.storage.from(BUCKET).upload(filePath, file, { cacheControl: '3600', upsert: false })).error
    }
    if (uploadErr) return { data: null, error: { message: '파일 업로드에 실패했습니다.' }, status: 500 }

    const { data: row, error: insErr } = await withTimeout(
      supabaseAdmin.from('event_submissions').insert([{
        application_id: applicationId, file_name: file.name, file_size: file.size, file_type: file.type, storage_path: filePath,
      }]).select().single(),
      T, '서류 정보를 저장하는 중 시간이 초과되었습니다.'
    )
    if (insErr || !row) {
      await supabaseAdmin.storage.from(BUCKET).remove([filePath])
      return { data: null, error: { message: '서류를 등록할 수 없습니다.' }, status: 400 }
    }
    return { data: row as SubmissionRow, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '서류 제출 중 오류가 발생했습니다.') }, status: 500 }
  }
}

async function loadOwnedSubmission(id: string, userId: string): Promise<SubmissionRow | null> {
  const { data } = await withTimeout(
    supabaseAdmin.from('event_submissions').select('*, event_applications!inner(user_id)').eq('id', id).maybeSingle(),
    T, '서류 정보를 확인하는 중 시간이 초과되었습니다.'
  )
  if (!data) return null
  const owner = (data as Record<string, unknown>).event_applications as { user_id?: string } | null
  if (!owner || owner.user_id !== userId) return null
  const { event_applications, ...row } = data as Record<string, unknown>
  void event_applications
  return row as SubmissionRow
}

export async function deleteSubmissionOnServer(id: string, userId: string): Promise<ServerResult<{ id: string }>> {
  try {
    const sub = await loadOwnedSubmission(id, userId)
    if (!sub) return { data: null, error: { message: '본인 제출 서류만 삭제할 수 있습니다.' }, status: 403 }
    await supabaseAdmin.storage.from(BUCKET).remove([sub.storage_path])
    const { error } = await withTimeout(
      supabaseAdmin.from('event_submissions').delete().eq('id', id), T, '서류 삭제 중 시간이 초과되었습니다.'
    )
    if (error) return { data: null, error: { message: getErrorMessage(error, '서류 삭제에 실패했습니다.') }, status: 400 }
    return { data: { id }, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '서류 삭제 중 오류가 발생했습니다.') }, status: 500 }
  }
}

export async function listMySubmissionsOnServer(applicationId: string, userId: string): Promise<ServerResult<SubmissionRow[]>> {
  try {
    const app = await loadOwnedApplication(applicationId, userId)
    if (!app) return { data: null, error: { message: '본인 신청건만 조회할 수 있습니다.' }, status: 403 }
    const { data, error } = await withTimeout(
      supabaseAdmin.from('event_submissions').select('*').eq('application_id', applicationId).order('uploaded_at', { ascending: true }),
      T, '제출 서류를 불러오는 중 시간이 초과되었습니다.'
    )
    if (error) return { data: null, error: { message: getErrorMessage(error, '제출 서류를 불러오는데 실패했습니다.') }, status: 400 }
    return { data: (data ?? []) as SubmissionRow[], error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '제출 서류 조회 중 오류가 발생했습니다.') }, status: 500 }
  }
}

export async function signedUrlForOwnSubmissionOnServer(id: string, userId: string): Promise<ServerResult<{ url: string }>> {
  try {
    const sub = await loadOwnedSubmission(id, userId)
    if (!sub) return { data: null, error: { message: '본인 제출 서류만 다운로드할 수 있습니다.' }, status: 403 }
    return await signUrl(sub.storage_path, sub.file_name)
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '다운로드 링크 생성 중 오류가 발생했습니다.') }, status: 500 }
  }
}

export async function signedUrlForSubmissionOnServer(id: string): Promise<ServerResult<{ url: string }>> {
  try {
    const { data } = await withTimeout(
      supabaseAdmin.from('event_submissions').select('storage_path, file_name').eq('id', id).maybeSingle(),
      T, '서류 정보를 확인하는 중 시간이 초과되었습니다.'
    )
    if (!data) return { data: null, error: { message: '서류를 찾을 수 없습니다.' }, status: 404 }
    return await signUrl(data.storage_path, data.file_name)
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '다운로드 링크 생성 중 오류가 발생했습니다.') }, status: 500 }
  }
}

async function signUrl(path: string, fileName: string): Promise<ServerResult<{ url: string }>> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 3600, { download: fileName })
  if (error || !data?.signedUrl) return { data: null, error: { message: '다운로드 링크를 생성할 수 없습니다.' }, status: 400 }
  return { data: { url: data.signedUrl }, error: null }
}

export async function listSubmissionsForEventOnServer(eventId: string): Promise<ServerResult<AdminSubmissionGroup[]>> {
  try {
    const { data: apps, error } = await withTimeout(
      supabaseAdmin.from('event_applications')
        .select('id, applicant_org_name, applicant_manager_name, applicant_phone, status, event_submissions(*)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true }),
      T, '신청/서류를 불러오는 중 시간이 초과되었습니다.'
    )
    if (error) return { data: null, error: { message: getErrorMessage(error, '서류 목록을 불러오는데 실패했습니다.') }, status: 400 }
    const groups: AdminSubmissionGroup[] = (apps ?? []).map((a: Record<string, unknown>) => ({
      application_id: a.id as string,
      org_name: (a.applicant_org_name as string) ?? '(단체명 없음)',
      manager_name: (a.applicant_manager_name as string) ?? null,
      phone: (a.applicant_phone as string) ?? null,
      status: a.status as string,
      submissions: ((a.event_submissions as SubmissionRow[]) ?? []),
    }))
    return { data: groups, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '서류 목록 조회 중 오류가 발생했습니다.') }, status: 500 }
  }
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: `0`. (관계 select 타입이 어긋나면 이미 `Record<string, unknown>` 캐스팅으로 방어함 — 캐스팅 유지.)

- [ ] **Step 3: 커밋**

```bash
git add src/lib/eventSubmissionServer.ts
git commit -m "feat(events): add submission server (user upload/delete/list, admin list, signed URLs)"
```

---

### Task 3: 사용자 서류 제출 API 라우트

**Files:**
- Create: `src/app/api/events/submissions/route.ts`

**Interfaces:**
- Consumes: `validateUserApiRequest`, Task 2 functions.
- Produces: `POST` (multipart: `application_id`, `file`) → `{ data: SubmissionRow }`; `GET ?application_id=` → `{ data: SubmissionRow[] }`; `GET ?download_id=` → `{ data: { url } }`; `DELETE ?id=` → `{ data: { id } }`.

- [ ] **Step 1: 구현 작성**

```typescript
// src/app/api/events/submissions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateUserApiRequest } from '@/lib/auth'
import {
  uploadSubmissionOnServer,
  deleteSubmissionOnServer,
  listMySubmissionsOnServer,
  signedUrlForOwnSubmissionOnServer,
} from '@/lib/eventSubmissionServer'
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
    const form = await request.formData()
    const applicationId = form.get('application_id')
    const file = form.get('file')
    if (typeof applicationId !== 'string' || !applicationId) return NextResponse.json({ error: { message: '신청 정보가 필요합니다.' } }, { status: 400 })
    if (!(file instanceof File)) return NextResponse.json({ error: { message: '업로드할 파일이 없습니다.' } }, { status: 400 })
    const result = await uploadSubmissionOnServer(applicationId, u.user.id, file)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '서류 제출 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const u = await requireUser(request)
  if (!u.ok) return u.response
  try {
    const sp = new URL(request.url).searchParams
    const downloadId = sp.get('download_id')
    if (downloadId) {
      const result = await signedUrlForOwnSubmissionOnServer(downloadId, u.user.id)
      if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
      return NextResponse.json({ data: result.data })
    }
    const applicationId = sp.get('application_id')
    if (!applicationId) return NextResponse.json({ error: { message: 'application_id가 필요합니다.' } }, { status: 400 })
    const result = await listMySubmissionsOnServer(applicationId, u.user.id)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '서류 조회 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const u = await requireUser(request)
  if (!u.ok) return u.response
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: { message: 'ID가 필요합니다.' } }, { status: 400 })
    const result = await deleteSubmissionOnServer(id, u.user.id)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '서류 삭제 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}
```

- [ ] **Step 2: 타입체크** → `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` = `0`
- [ ] **Step 3: 커밋**

```bash
git add src/app/api/events/submissions/route.ts
git commit -m "feat(events): add /api/events/submissions (upload, list, download, delete)"
```

---

### Task 4: 서류양식 사용자 다운로드 API + 서버 함수

**Files:**
- Modify: `src/lib/eventUserServer.ts` (Phase 2 파일에 함수 추가)
- Create: `src/app/api/events/files/download/route.ts`

**Interfaces:**
- Consumes: `validateUserApiRequest`, `computeEffectiveOpen`.
- Produces (in `eventUserServer.ts`): `signedUrlForFormFileOnServer(formFileId: string, userId: string, nowIso: string): Promise<{ data: { url: string } | null; error: { message: string } | null; status?: number }>`
- Produces (route): `GET /api/events/files/download?id=<formFileId>` → `{ data: { url } }`.

**설명:** 서류양식(`event_form_files`)은 이벤트가 모집중이거나 사용자가 그 이벤트에 신청 이력이 있으면 다운로드 허용.

- [ ] **Step 1: `eventUserServer.ts`에 함수 추가**

`src/lib/eventUserServer.ts` 맨 아래에 추가(파일 상단 import에 이미 있는 `supabaseAdmin`, `withTimeout`, `getErrorMessage`, `computeEffectiveOpen` 재사용):

```typescript
export async function signedUrlForFormFileOnServer(
  formFileId: string,
  userId: string,
  nowIso: string
): Promise<{ data: { url: string } | null; error: { message: string } | null; status?: number }> {
  try {
    const { data: ff } = await withTimeout(
      supabaseAdmin.from('event_form_files').select('event_id, file_name, storage_path').eq('id', formFileId).maybeSingle(),
      QUERY_TIMEOUT_MS, '서류양식 정보를 확인하는 중 시간이 초과되었습니다.'
    )
    if (!ff) return { data: null, error: { message: '서류양식을 찾을 수 없습니다.' }, status: 404 }

    const { data: ev } = await withTimeout(
      supabaseAdmin.from('events').select('is_open, reservation_start_at, reservation_end_at').eq('id', ff.event_id).maybeSingle(),
      QUERY_TIMEOUT_MS, '이벤트 정보를 확인하는 중 시간이 초과되었습니다.'
    )
    let allowed = ev ? computeEffectiveOpen(ev, nowIso) : false
    if (!allowed) {
      const { data: app } = await withTimeout(
        supabaseAdmin.from('event_applications').select('id').eq('event_id', ff.event_id).eq('user_id', userId).limit(1),
        QUERY_TIMEOUT_MS, '신청 이력을 확인하는 중 시간이 초과되었습니다.'
      )
      allowed = Boolean(app && app.length > 0)
    }
    if (!allowed) return { data: null, error: { message: '다운로드 권한이 없습니다.' }, status: 403 }

    const { data: signed, error } = await supabaseAdmin.storage.from('event-files').createSignedUrl(ff.storage_path, 3600, { download: ff.file_name })
    if (error || !signed?.signedUrl) return { data: null, error: { message: '다운로드 링크를 생성할 수 없습니다.' }, status: 400 }
    return { data: { url: signed.signedUrl }, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '다운로드 처리 중 오류가 발생했습니다.') }, status: 500 }
  }
}
```

`QUERY_TIMEOUT_MS`가 이 파일에 이미 상수로 있으면 재사용, 없으면 상단에 `const QUERY_TIMEOUT_MS = 8000`이 이미 선언돼 있음(Phase 2 Task 2에서 `withTimeout(..., QUERY_TIMEOUT_MS, ...)`로 씀). 확인 후 사용.

- [ ] **Step 2: 라우트 작성**

```typescript
// src/app/api/events/files/download/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateUserApiRequest } from '@/lib/auth'
import { signedUrlForFormFileOnServer } from '@/lib/eventUserServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function GET(request: NextRequest) {
  const auth = await validateUserApiRequest(request)
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json({ error: { message: auth.error || '로그인이 필요합니다.' } }, { status: 401 })
  }
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: { message: 'ID가 필요합니다.' } }, { status: 400 })
    const result = await signedUrlForFormFileOnServer(id, auth.user.id, new Date().toISOString())
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '다운로드 처리 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}
```

- [ ] **Step 3: 타입체크** → `0`
- [ ] **Step 4: 커밋**

```bash
git add src/lib/eventUserServer.ts src/app/api/events/files/download/route.ts
git commit -m "feat(events): add form-file signed-URL download for users"
```

---

### Task 5: 관리자 신청관리 서버

**Files:**
- Create: `src/lib/eventAdminApplicationServer.ts`

**Interfaces:**
- Consumes: `isValidSelectionStatus` (Task 1), `ServerResult` (`@/lib/eventApplicationServer`).
- Produces:
  - `type AdminApplicationRow = { id: string; org_name: string; manager_name: string | null; phone: string | null; event_date: string | null; total_count: number; status: string; submission_count: number; created_at: string }`
  - `listApplicationsForEventOnServer(eventId: string): Promise<ServerResult<AdminApplicationRow[]>>`
  - `setApplicationStatusOnServer(id: string, status: string): Promise<ServerResult<{ id: string; status: string }>>`

- [ ] **Step 1: 구현 작성**

```typescript
// src/lib/eventAdminApplicationServer.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { getErrorMessage, withTimeout } from '@/lib/requestUtils'
import { isValidSelectionStatus } from '@/lib/eventSubmissionHelpers'
import type { ServerResult } from '@/lib/eventApplicationServer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
const T = 8000

export type AdminApplicationRow = {
  id: string
  org_name: string
  manager_name: string | null
  phone: string | null
  event_date: string | null
  total_count: number
  status: string
  submission_count: number
  created_at: string
}

export async function listApplicationsForEventOnServer(eventId: string): Promise<ServerResult<AdminApplicationRow[]>> {
  try {
    const { data, error } = await withTimeout(
      supabaseAdmin.from('event_applications')
        .select('id, applicant_org_name, applicant_manager_name, applicant_phone, total_count, status, created_at, event_dates(event_date), event_submissions(id)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true }),
      T, '신청자 목록을 불러오는 중 시간이 초과되었습니다.'
    )
    if (error) return { data: null, error: { message: getErrorMessage(error, '신청자 목록을 불러오는데 실패했습니다.') }, status: 400 }
    const rows: AdminApplicationRow[] = (data ?? []).map((a: Record<string, unknown>) => {
      const ed = a.event_dates as { event_date?: string } | null
      const subs = (a.event_submissions as unknown[]) ?? []
      return {
        id: a.id as string,
        org_name: (a.applicant_org_name as string) ?? '(단체명 없음)',
        manager_name: (a.applicant_manager_name as string) ?? null,
        phone: (a.applicant_phone as string) ?? null,
        event_date: ed?.event_date ?? null,
        total_count: (a.total_count as number) ?? 0,
        status: a.status as string,
        submission_count: subs.length,
        created_at: a.created_at as string,
      }
    })
    return { data: rows, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '신청자 목록 조회 중 오류가 발생했습니다.') }, status: 500 }
  }
}

export async function setApplicationStatusOnServer(id: string, status: string): Promise<ServerResult<{ id: string; status: string }>> {
  try {
    if (!isValidSelectionStatus(status)) {
      return { data: null, error: { message: '허용되지 않는 상태입니다.' }, status: 400 }
    }
    const { data: existing } = await withTimeout(
      supabaseAdmin.from('event_applications').select('id, status').eq('id', id).maybeSingle(),
      T, '신청 정보를 불러오는 중 시간이 초과되었습니다.'
    )
    if (!existing) return { data: null, error: { message: '신청 내역을 찾을 수 없습니다.' }, status: 404 }
    if (existing.status === 'cancelled') {
      return { data: null, error: { message: '취소된 신청은 상태를 변경할 수 없습니다.' }, status: 400 }
    }
    const { error } = await withTimeout(
      supabaseAdmin.from('event_applications').update({ status, updated_at: new Date().toISOString() }).eq('id', id),
      T, '상태 변경 중 시간이 초과되었습니다.'
    )
    if (error) return { data: null, error: { message: getErrorMessage(error, '상태 변경에 실패했습니다.') }, status: 400 }
    return { data: { id, status }, error: null }
  } catch (e) {
    return { data: null, error: { message: getErrorMessage(e, '상태 변경 중 오류가 발생했습니다.') }, status: 500 }
  }
}
```

- [ ] **Step 2: 타입체크** → `0`
- [ ] **Step 3: 커밋**

```bash
git add src/lib/eventAdminApplicationServer.ts
git commit -m "feat(events): add admin application management server (list, set status)"
```

---

### Task 6: 관리자 신청관리 API 라우트

**Files:**
- Create: `src/app/api/admin/events/applications/route.ts`

**Interfaces:**
- Consumes: `validateApiRequest`+`isAdmin`, Task 5 functions.
- Produces: `GET ?event_id=` → `{ data: AdminApplicationRow[] }`; `PATCH ?id=` body `{ status }` → `{ data: { id, status } }`.

- [ ] **Step 1: 구현 작성**

```typescript
// src/app/api/admin/events/applications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateApiRequest, isAdmin } from '@/lib/auth'
import { listApplicationsForEventOnServer, setApplicationStatusOnServer } from '@/lib/eventAdminApplicationServer'
import { getErrorMessage } from '@/lib/requestUtils'

async function requireAdmin(request: NextRequest) {
  const auth = await validateApiRequest(request)
  if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
    return { ok: false as const, response: NextResponse.json({ error: { message: auth.error || '권한이 없습니다.' } }, { status: 401 }) }
  }
  return { ok: true as const }
}

export async function GET(request: NextRequest) {
  const a = await requireAdmin(request)
  if (!a.ok) return a.response
  try {
    const eventId = new URL(request.url).searchParams.get('event_id')
    if (!eventId) return NextResponse.json({ error: { message: 'event_id가 필요합니다.' } }, { status: 400 })
    const result = await listApplicationsForEventOnServer(eventId)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '신청자 목록 조회 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const a = await requireAdmin(request)
  if (!a.ok) return a.response
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: { message: 'ID가 필요합니다.' } }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    if (typeof body?.status !== 'string') return NextResponse.json({ error: { message: 'status 값이 필요합니다.' } }, { status: 400 })
    const result = await setApplicationStatusOnServer(id, body.status)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '상태 변경 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}
```

- [ ] **Step 2: 타입체크** → `0`
- [ ] **Step 3: 커밋**

```bash
git add src/app/api/admin/events/applications/route.ts
git commit -m "feat(events): add /api/admin/events/applications (list, set status)"
```

---

### Task 7: 관리자 제출 서류 API 라우트

**Files:**
- Create: `src/app/api/admin/events/submissions/route.ts`

**Interfaces:**
- Consumes: `validateApiRequest`+`isAdmin`, `listSubmissionsForEventOnServer`/`signedUrlForSubmissionOnServer` (Task 2).
- Produces: `GET ?event_id=` → `{ data: AdminSubmissionGroup[] }`; `GET ?download_id=` → `{ data: { url } }`.

- [ ] **Step 1: 구현 작성**

```typescript
// src/app/api/admin/events/submissions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateApiRequest, isAdmin } from '@/lib/auth'
import { listSubmissionsForEventOnServer, signedUrlForSubmissionOnServer } from '@/lib/eventSubmissionServer'
import { getErrorMessage } from '@/lib/requestUtils'

export async function GET(request: NextRequest) {
  const auth = await validateApiRequest(request)
  if (!auth.authenticated || !auth.user || !isAdmin(auth.user)) {
    return NextResponse.json({ error: { message: auth.error || '권한이 없습니다.' } }, { status: 401 })
  }
  try {
    const sp = new URL(request.url).searchParams
    const downloadId = sp.get('download_id')
    if (downloadId) {
      const result = await signedUrlForSubmissionOnServer(downloadId)
      if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
      return NextResponse.json({ data: result.data })
    }
    const eventId = sp.get('event_id')
    if (!eventId) return NextResponse.json({ error: { message: 'event_id가 필요합니다.' } }, { status: 400 })
    const result = await listSubmissionsForEventOnServer(eventId)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ data: result.data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: { message: getErrorMessage(e, '서류 조회 중 오류가 발생했습니다.') } }, { status: 500 })
  }
}
```

- [ ] **Step 2: 타입체크** → `0`
- [ ] **Step 3: 커밋**

```bash
git add src/app/api/admin/events/submissions/route.ts
git commit -m "feat(events): add /api/admin/events/submissions (grouped list, signed URL)"
```

---

### Task 8: 내 신청내역 모달 — 서류 제출 UI

**Files:**
- Modify: `src/components/MyApplicationsModal.tsx`

**Interfaces:**
- Consumes: `POST/GET/DELETE /api/events/submissions`, `GET /api/events/submissions?download_id=`.

**설명:** 각 신청 항목에 "서류 제출" 영역을 추가한다. `status !== 'cancelled'`인 항목에만 표시. 파일 선택 시 업로드(POST multipart), 목록 표시(GET `?application_id=`), 삭제(DELETE `?id=`), 다운로드(GET `?download_id=` → 반환 url을 새 탭). 신규 라이브러리 없이 `<input type="file">` 사용.

- [ ] **Step 1: 신청 항목에 서류 제출 섹션 추가**

Phase 2의 `MyApplicationsModal.tsx`에서 각 신청 항목(`apps.map(a => ...)`) 내부, 취소 버튼 블록 근처에 아래를 추가한다. 컴포넌트 상단에 `Paperclip`, `Download`, `Trash2` 아이콘을 lucide-react import에 추가하고, 항목별 제출 목록 상태를 관리하는 하위 컴포넌트를 파일 하단에 정의한다.

파일 하단(export default 함수 밖)에 하위 컴포넌트 추가:

```tsx
interface SubmissionItem { id: string; file_name: string; file_size: number }

function SubmissionSection({ applicationId }: { applicationId: string }) {
  const [subs, setSubs] = useState<SubmissionItem[]>([])
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const res = await fetch(`/api/events/submissions?application_id=${applicationId}`, { credentials: 'include', headers: buildCookieFirstClientHeaders() })
    const json = await res.json().catch(() => null)
    if (res.ok) setSubs(json?.data || [])
  }
  useEffect(() => { load() }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('application_id', applicationId)
      fd.append('file', file)
      const res = await fetch('/api/events/submissions', { method: 'POST', credentials: 'include', body: fd })
      const json = await res.json().catch(() => null)
      if (!res.ok) { alert(json?.error?.message || '업로드에 실패했습니다.'); return }
      load()
    } finally { setBusy(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 서류를 삭제하시겠습니까?')) return
    const res = await fetch(`/api/events/submissions?id=${id}`, { method: 'DELETE', credentials: 'include', headers: buildCookieFirstClientHeaders() })
    const json = await res.json().catch(() => null)
    if (!res.ok) { alert(json?.error?.message || '삭제에 실패했습니다.'); return }
    load()
  }

  const handleDownload = async (id: string) => {
    const res = await fetch(`/api/events/submissions?download_id=${id}`, { credentials: 'include', headers: buildCookieFirstClientHeaders() })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.data?.url) { alert(json?.error?.message || '다운로드 링크를 생성할 수 없습니다.'); return }
    window.open(json.data.url, '_blank')
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <p className="text-xs font-medium text-gray-500 mb-2">제출 서류 ({subs.length}/10)</p>
      <ul className="space-y-1 mb-2">
        {subs.map(s => (
          <li key={s.id} className="flex items-center justify-between text-sm">
            <button onClick={() => handleDownload(s.id)} className="flex items-center gap-1 text-blue-600 hover:underline">
              <Download className="w-3.5 h-3.5" />{s.file_name}
            </button>
            <button aria-label="삭제" onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-600">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <label className="inline-flex items-center gap-1 text-sm text-blue-600 cursor-pointer hover:underline">
        <Paperclip className="w-3.5 h-3.5" />
        {busy ? '업로드 중...' : '서류 추가'}
        <input type="file" className="hidden" disabled={busy || subs.length >= 10}
          accept=".pdf,.hwp,.hwpx,.jpg,.jpeg,.png" onChange={handleUpload} />
      </label>
    </div>
  )
}
```

- [ ] **Step 2: 항목에서 조건부 렌더**

취소 버튼 렌더 블록 아래(같은 `border rounded-lg p-4` 항목 div 안)에 추가:

```tsx
{a.status !== 'cancelled' && <SubmissionSection applicationId={a.id} />}
```

그리고 파일 상단 import 수정:
```tsx
import { useEffect, useState } from 'react'
import { X, Paperclip, Download, Trash2 } from 'lucide-react'
```
(기존 `X`만 import돼 있으면 나머지를 추가. `useEffect`/`useState`가 이미 import돼 있으면 유지.)

- [ ] **Step 3: 타입체크** → `0`
- [ ] **Step 4: 커밋**

```bash
git add src/components/MyApplicationsModal.tsx
git commit -m "feat(events): add submission upload/list/delete to my-applications modal"
```

---

### Task 9: 이벤트 상세 — 서류양식 다운로드

**Files:**
- Modify: `src/app/events/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/events/files/download?id=`. `event.event_form_files` (상세 응답에 포함됨).

**설명:** 상세 페이지의 일정 섹션 아래에, 이벤트에 서류양식파일이 있으면 다운로드 목록을 렌더. 클릭 시 서명URL을 받아 새 탭으로 연다.

- [ ] **Step 1: EventDetail 인터페이스에 event_form_files 추가 + 다운로드 UI**

`EventDetail` 인터페이스에 필드 추가:
```tsx
  event_form_files?: { id: string; file_name: string }[]
```

일정 섹션(`<h3>일정</h3>...` 블록) 다음에 추가:
```tsx
{event.event_form_files && event.event_form_files.length > 0 && (
  <div>
    <h3 className="font-semibold text-gray-900 mb-2">서류양식</h3>
    <ul className="space-y-1 text-sm">
      {event.event_form_files.map(f => (
        <li key={f.id}>
          <button
            onClick={async () => {
              const res = await fetch(`/api/events/files/download?id=${f.id}`, { credentials: 'include', headers: buildCookieFirstClientHeaders() })
              const json = await res.json().catch(() => null)
              if (!res.ok || !json?.data?.url) { alert(json?.error?.message || '다운로드 링크를 생성할 수 없습니다.'); return }
              window.open(json.data.url, '_blank')
            }}
            className="text-blue-600 hover:underline"
          >
            {f.file_name}
          </button>
        </li>
      ))}
    </ul>
  </div>
)}
```

(파일 상단에 `buildCookieFirstClientHeaders`가 Phase 2에서 이미 import돼 있음 — 재사용.)

- [ ] **Step 2: 타입체크** → `0`
- [ ] **Step 3: 커밋**

```bash
git add src/app/events/[id]/page.tsx
git commit -m "feat(events): add form-file download links to event detail"
```

---

### Task 10: 관리자 신청관리 페이지 `/admin/events/[id]`

**Files:**
- Create: `src/app/admin/events/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/events/applications?event_id=`, `PATCH /api/admin/events/applications?id=`, `GET /api/admin/events/submissions?event_id=`, `GET /api/admin/events/submissions?download_id=`.

**설명:** 관리자 페이지. 상단에 신청자 목록(단체·담당·연락처·선택날짜·전체인원·상태·제출수) + 선정/탈락/미정 버튼(reversible). 하단에 이벤트별 제출 서류를 단체별로 묶어 개별 다운로드. 인증은 localStorage `adminInfo`(기존 관리자 페이지 패턴) + 서버 라우트가 실제 권한 검증.

- [ ] **Step 1: 페이지 작성**

```tsx
// src/app/admin/events/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import AdminNavigation from '@/components/AdminNavigation'
import { buildCookieFirstClientHeaders } from '@/lib/clientAuthHeaders'

interface AppRow { id: string; org_name: string; manager_name: string | null; phone: string | null; event_date: string | null; total_count: number; status: string; submission_count: number }
interface SubGroup { application_id: string; org_name: string; status: string; submissions: { id: string; file_name: string }[] }

const STATUS_LABEL: Record<string, string> = { applied: '신청', selected: '선정', rejected: '탈락', cancelled: '취소' }

export default function AdminEventApplicationsPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = String(params?.id || '')
  const [adminInfo, setAdminInfo] = useState<{ role?: string } | null>(null)
  const [apps, setApps] = useState<AppRow[]>([])
  const [groups, setGroups] = useState<SubGroup[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [ar, sr] = await Promise.all([
        fetch(`/api/admin/events/applications?event_id=${eventId}`, { credentials: 'include', headers: buildCookieFirstClientHeaders() }),
        fetch(`/api/admin/events/submissions?event_id=${eventId}`, { credentials: 'include', headers: buildCookieFirstClientHeaders() }),
      ])
      const aj = await ar.json().catch(() => null)
      const sj = await sr.json().catch(() => null)
      if (ar.ok) setApps(aj?.data || [])
      if (sr.ok) setGroups(sj?.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('adminInfo') : null
    if (!raw) { router.push('/auth/login'); return }
    try { setAdminInfo(JSON.parse(raw)) } catch { /* noop */ }
    load()
  }, [eventId, router])

  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/events/applications?id=${id}`, {
      method: 'PATCH', credentials: 'include', headers: buildCookieFirstClientHeaders(), body: JSON.stringify({ status }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) { alert(json?.error?.message || '상태 변경에 실패했습니다.'); return }
    load()
  }

  const download = async (submissionId: string) => {
    const res = await fetch(`/api/admin/events/submissions?download_id=${submissionId}`, { credentials: 'include', headers: buildCookieFirstClientHeaders() })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.data?.url) { alert(json?.error?.message || '다운로드 링크를 생성할 수 없습니다.'); return }
    window.open(json.data.url, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation adminRole={adminInfo?.role} />
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <button onClick={() => router.push('/admin/events')} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> 이벤트 목록
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">신청 관리</h1>

        {loading ? (
          <p className="text-gray-500 py-12 text-center">불러오는 중...</p>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto mb-8">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['단체명', '담당자', '연락처', '선택날짜', '전체인원', '제출', '상태', '처리'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {apps.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-500">신청자가 없습니다.</td></tr>
                  ) : apps.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{a.org_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{a.manager_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{a.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{a.event_date || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{a.total_count}명</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{a.submission_count}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">{STATUS_LABEL[a.status] || a.status}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {a.status === 'cancelled' ? (
                          <span className="text-xs text-gray-400">취소됨</span>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => setStatus(a.id, 'selected')} disabled={a.status === 'selected'}
                              className="px-2 py-1 text-xs rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40">선정</button>
                            <button onClick={() => setStatus(a.id, 'rejected')} disabled={a.status === 'rejected'}
                              className="px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40">탈락</button>
                            <button onClick={() => setStatus(a.id, 'applied')} disabled={a.status === 'applied'}
                              className="px-2 py-1 text-xs rounded bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-40">미정</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-3">제출 서류</h2>
            <div className="space-y-4">
              {groups.filter(g => g.submissions.length > 0).length === 0 ? (
                <p className="text-gray-500">제출된 서류가 없습니다.</p>
              ) : groups.filter(g => g.submissions.length > 0).map(g => (
                <div key={g.application_id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="font-medium text-gray-900 mb-2">{g.org_name} <span className="text-xs text-gray-500">({STATUS_LABEL[g.status] || g.status})</span></p>
                  <ul className="space-y-1">
                    {g.submissions.map(s => (
                      <li key={s.id}>
                        <button onClick={() => download(s.id)} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                          <Download className="w-3.5 h-3.5" />{s.file_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 타입체크** → `0`
- [ ] **Step 3: 커밋**

```bash
git add src/app/admin/events/[id]/page.tsx
git commit -m "feat(events): add admin event application management page"
```

---

### Task 11: 관리자 이벤트 목록 — 신청 수 + 신청관리 링크

**Files:**
- Modify: `src/app/admin/events/page.tsx`

**Interfaces:**
- Consumes: `useRouter` (이미 있음). `EventRow`에 신청 수를 표시하려면 목록 API가 카운트를 제공해야 함 — 현재 `/api/admin/events` GET은 카운트를 반환하지 않으므로, **신청 수 표시는 각 행에서 `/api/admin/events/applications?event_id=` 길이로 계산하지 않고**, 목록 로드시 응답에 이미 있는 값이 없으면 컬럼을 "관리" 링크로 대체한다. 아래 Step 1은 링크만 추가(신청 수는 상세 페이지에서 확인). 

**설명:** YAGNI — 목록 GET에 카운트 조인을 추가하는 것은 서버 변경이 필요하므로, 이 태스크는 각 이벤트 행에 "신청관리" 링크(→ `/admin/events/[id]`)만 추가한다. 신청 수는 상세 페이지 상단 테이블 행 수로 확인 가능.

- [ ] **Step 1: 관리 열에 신청관리 링크 추가**

`src/app/admin/events/page.tsx`의 행 액션(관리 `<td>`의 `flex items-center gap-1` div) 안, 토글 버튼 뒤에 추가한다. 상단 lucide-react import에 `ClipboardList` 추가.

```tsx
<button
  onClick={() => router.push(`/admin/events/${event.id}`)}
  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
  title="신청관리"
>
  <ClipboardList className="w-4 h-4" />
</button>
```

`router`는 이미 `useRouter()`로 선언돼 있음(파일 상단 확인). 없으면 `const router = useRouter()` 추가.

- [ ] **Step 2: 타입체크** → `0`
- [ ] **Step 3: 커밋**

```bash
git add src/app/admin/events/page.tsx
git commit -m "feat(events): add application-management link to admin events list"
```

---

### Task 12: 실제 앱 end-to-end 검증

**Files:** (없음 — 실행/관측)

- [ ] **Step 1: 서류 제출 흐름**

`npm run dev` → 관리자로 이벤트 생성+모집 오픈, 서류양식파일 1개 첨부 → 사용자 로그인 → 상세에서 서류양식 다운로드 → 신청 → 내 신청내역에서 서류 2개 업로드/1개 삭제/다운로드 확인.

- [ ] **Step 2: 관리자 신청관리 흐름**

관리자 `/admin/events` → 신청관리 링크 → `/admin/events/[id]`에서 신청자 목록·제출수 확인 → 선정→탈락→미정 토글(reversible) → 제출 서류 다운로드(서명URL) 확인.

- [ ] **Step 3: 가드 확인**

취소한 신청건은 업로드 불가, 타 사용자 서류 삭제/다운로드 불가(403), 미인증 401. `superpowers:verification-before-completion`으로 증거 기록.

---

## Self-Review (작성자 체크 완료)

- **스펙 커버리지:** §4.5 event_submissions → Task 2. §6.1 admin applications/submissions → Task 6·7. §6.2 user submissions/files-download → Task 3·4. §8.1 내 신청내역 서류제출 → Task 8. §8.2 admin [id] 페이지 → Task 10. §13 결정(canSubmit·isValidSelectionStatus·reversible·파일분리) → Task 1·2·5. 목록 신청관리 링크(§6/8.2) → Task 11.
- **플레이스홀더:** 없음(모든 코드 스텝에 실제 코드).
- **타입 일관성:** `ServerResult`(Phase 2 eventApplicationServer)를 Task 2·5에서 import·재사용. `SubmissionRow`(Task 2) → Task 3·8에서 사용. `AdminApplicationRow`(Task 5) → Task 6·10. `AdminSubmissionGroup`(Task 2) → Task 7·10. `download_id` 쿼리 파라미터 규약은 Task 3·7·8·10에서 일치.
- **주의:** 다운로드는 스펙의 `?path=` 대신 **`?download_id=`(레코드 id)** 로 구현해 서버가 소유권/존재를 확인 후 서명 — 스펙보다 안전한 의도적 편차(§6 문구보다 강화). Task 11은 목록 GET에 카운트 조인을 추가하지 않고 링크만 추가(YAGNI); 신청 수는 상세에서 확인.
