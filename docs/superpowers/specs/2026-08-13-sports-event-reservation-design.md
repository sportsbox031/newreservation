# 스포츠이벤트 예약 시스템 설계 (Sports Event Reservation)

- 작성일: 2026-08-13
- 상태: 설계 확정 (구현 대기)
- 관련 시스템: 기존 "스포츠교실" 예약 시스템(재사용 대상)

## 1. 개요 (Overview)

경기도체육회 스포츠박스 예약 시스템에 **스포츠이벤트 예약** 기능을 추가한다.
기존 스포츠교실과 달리 **선정제(관리자 수동 선정)**, **서류 제출**, **이벤트별 대상
지역 지정**, **하루 예약 제한 없음**을 특징으로 한다.

로그인/계정, 첨부파일 업로드, HTML 에디터, 지역 권한 헬퍼 등 기존 자산은 최대한
재사용하되, **데이터 모델은 스포츠교실과 완전히 분리**하여 기존 예약 로직(월4일·일2타임
제한, tier 게이팅, 동시성 RPC)을 오염시키지 않는다.

## 2. 확정된 요구사항 (Decisions)

| 항목 | 결정 |
|---|---|
| 일정 구조 | 관리자가 **특정 날짜 여러 개** 지정 → 사용자가 **1개** 선택 |
| 날짜 세분화 | **날짜(date)만** (시간 구분 없음) |
| 지역 범위 | **이벤트마다 대상 지역 선택**(전체/남부/북부), 공지사항 `target_type` 패턴 |
| 선정 방식 | **관리자가 수동으로 선정/탈락** 결정 |
| 서류 제출 시점 | **신청 직후부터 항상 가능** |
| 알림 | **앱 내 알림만** (알림톡/Aligo 제외, 추후 확장 여지) |
| 중복 신청 | **이벤트당 1회** (취소 후 재신청 허용) |
| 정원 | **없음** (관리자 수동 선정으로 조절) |
| 신청 취소 | **선정 전까지 사용자 취소 가능** |
| 데이터 모델 | 스포츠교실과 **분리된 전용 테이블** 신설 |
| 자동 스케줄 | **읽기시점 보정** 우선 + Vercel **무료 daily cron**로 컬럼 정합성 반영 |
| 파일 형식 | pdf, hwp, hwpx, jpg, jpeg, png (개당 5MB, `fileValidation.ts` 재사용) |
| 개수 제한 | 서류양식 최대 5개 / 서류제출 최대 10개 |

## 3. 구현 단계 (Phases)

각 Phase는 독립적으로 동작·검증 가능하도록 구성한다.

1. **Phase 1 — 관리자 이벤트 관리(CRUD)**: 이벤트 생성/수정/삭제(이벤트명·대표이미지·
   HTML설명·영상URL·일정 날짜들·서류양식파일), 예약 시작/종료 **수동 토글**, 지역
   target + 지역관리자 권한 스코프.
2. **Phase 2 — 사용자 이벤트 페이지**: 모집중 이벤트 캐러셀 → 상세(HTML 렌더) → 신청
   폼(달력 날짜 1개, 계정정보 자동입력, 학생수+인솔자수→전체인원, 신청완료 알림+폼
   자동닫힘) → 내 예약(내역·선정 전 취소).
3. **Phase 3 — 서류 + 선정**: 사용자 서류 제출(업로드), 관리자 선정/탈락, 관리자 서류
   다운로드 페이지(이벤트별→단체별 그룹핑).
4. **Phase 4 — 자동 스케줄러**: `reservation_start_at/end_at` 기준 모집 자동 시작·종료
   (읽기시점 계산 + daily cron 정합성 반영).

## 4. 데이터 모델 (Data Model)

기존 컨벤션 준수: 모든 테이블 `gen_random_uuid()` PK, `created_at`/`updated_at` 포함,
service-role API 라우트에서만 쓰기. 스키마 SQL 파일 추가 후 `npm run gen:types`로
`database.types.ts` 재생성, `src/types/database.ts`에 좁힌 union 타입 + `export type` alias 추가.

### 4.1 `events` — 이벤트 본체

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `title` | text NOT NULL | 이벤트명 |
| `description` | text | 본문 (HTML 또는 텍스트) |
| `content_type` | text NOT NULL default `'html'` CHECK IN (`'html'`,`'text'`) | RichTextEditor 재사용 |
| `thumbnail_path` | text | 대표이미지 (`event-images` public 버킷 경로) |
| `video_url` | text | 영상 URL |
| `target_type` | text NOT NULL default `'all'` CHECK IN (`'all'`,`'region'`) | 대상 지역 방식 |
| `target_region_id` | int NULL → regions(id) | `target_type='region'`일 때 지역 |
| `is_open` | boolean NOT NULL default false | 모집중 여부(수동 토글 + cron 반영) |
| `reservation_start_at` | timestamptz NULL | 자동 시작 시각(스케줄) |
| `reservation_end_at` | timestamptz NULL | 자동 종료 시각(스케줄) |
| `author_id` | uuid → admins(id) | 작성 관리자(소유권 체크) |
| `created_at` / `updated_at` | timestamptz | |

### 4.2 `event_dates` — 관리자 지정 일정 날짜 (사용자가 1개 선택)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `event_id` | uuid → events(id) ON DELETE CASCADE | |
| `event_date` | date NOT NULL | |
| `label` | text NULL | 부가 설명(선택, 예 "오전반") |
| `sort_order` | int default 0 | 표시 순서 |

- 인덱스: `(event_id)`

### 4.3 `event_form_files` — 서류양식파일 (관리자 업로드 → 사용자 다운로드)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `event_id` | uuid → events(id) ON DELETE CASCADE | |
| `file_name` | text | 원본 파일명 |
| `file_size` | int CHECK ≤ 5242880 | |
| `file_type` | text | MIME |
| `storage_path` | text | `event-files` 버킷: `templates/{eventId}/…` |
| `uploaded_at` | timestamptz | |

- 대표이미지는 별도 파일이 아니라 `events.thumbnail_path`에 저장.

### 4.4 `event_applications` — 신청

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `event_id` | uuid → events(id) ON DELETE CASCADE | |
| `user_id` | uuid → users(id) | |
| `event_date_id` | uuid → event_dates(id) | 사용자가 선택한 날짜 |
| `student_count` | int NOT NULL default 0 | 참여학생수 |
| `leader_count` | int NOT NULL default 0 | 인솔자수 |
| `total_count` | int GENERATED ALWAYS AS (`student_count + leader_count`) STORED | 전체인원 |
| `applicant_org_name` | text | 신청 시점 단체명 스냅샷 |
| `applicant_manager_name` | text | 담당자 스냅샷 |
| `applicant_phone` | text | 연락처 스냅샷 |
| `region_id` | int → regions(id) | 신청 단체 지역(필터용) |
| `status` | text NOT NULL default `'applied'` CHECK IN (`'applied'`,`'selected'`,`'rejected'`,`'cancelled'`) | |
| `created_at` / `updated_at` | timestamptz | |

- **중복 방지**: `UNIQUE(event_id, user_id) WHERE status <> 'cancelled'` (부분 유니크 인덱스).
  이벤트당 1회, 취소 후 재신청 허용.
- **스냅샷 근거**: 계정 정보 변경 후에도 신청·서류 기록이 신청 당시 값으로 보존. 화면
  표시는 자동입력, 저장은 스냅샷.

### 4.5 `event_submissions` — 서류 제출 파일 (사용자 업로드 → 관리자 다운로드)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `application_id` | uuid → event_applications(id) ON DELETE CASCADE | |
| `file_name` | text | |
| `file_size` | int CHECK ≤ 5242880 | |
| `file_type` | text | |
| `storage_path` | text | `event-files` 버킷: `submissions/{applicationId}/…` |
| `uploaded_at` | timestamptz | |

- 신청건당 최대 10개.

## 5. 스토리지 & 파일 검증 (Storage)

- **`event-images`** (public 버킷): 대표이미지. `popup-images` 패턴(자동생성 public,
  `getPublicUrl`)으로 캐러셀/상세에서 즉시 표시.
- **`event-files`** (private 버킷): 서류양식파일(`templates/{eventId}/…`) + 서류제출
  (`submissions/{applicationId}/…`) 공용. 다운로드는 **서명 URL(1시간)** 로 원본 파일명
  유지. `announcement-attachments` 패턴.
- **파일 검증**: `src/lib/fileValidation.ts` 재사용. pdf/jpg/jpeg/png는 MIME+확장자,
  **hwp/hwpx는 확장자 기반 검증**(한글 버전 무관). 개당 5MB. `sanitizeFileName`으로
  ASCII-safe object key 생성.
- **UI 검증 일원화**: `FileUploadManager.tsx`가 자체 확장자 목록을 하드코딩하는 divergence가
  있으므로, 이벤트에서는 `fileValidation.ts`를 단일 소스로 삼아 `accept`/`allowedTypes`를 전달.

## 6. API 라우트 (API Routes)

모든 admin 라우트 스켈레톤: `validateApiRequest` → `isAdmin` → 지역 스코프
(`resolveReservationRegionScope`) + 소유권(`author_id`, 비-super는 본인 작성분만) →
service-role 쿼리. 오류는 한국어 `{ error: { message } }`.

### 6.1 관리자

| 라우트 | 메서드 | 역할 |
|---|---|---|
| `/api/admin/events` | GET / POST / PUT?id= / DELETE?id= | 이벤트 CRUD. `event_dates`는 payload 배열로 포함해 생성·수정 시 통째 교체. 지역관리자는 대상 지역이 본인 지역으로 강제 |
| `/api/admin/events/image` | POST | 대표이미지 → `event-images`(public). `/api/admin/popups/image` 미러 |
| `/api/admin/events/files` | POST / DELETE?id=&path= | 서류양식파일 → `event-files`(private). announcements/attachments 미러 |
| `/api/admin/events/status` | PATCH?id= | 예약 시작/종료 수동 토글(`is_open`) |
| `/api/admin/events/applications` | GET?event_id= / PATCH?id= | 신청자 목록 + 선정/탈락(`status`) |
| `/api/admin/events/submissions` | GET?event_id= / GET?path= | 이벤트별 제출 서류 목록 + 서명 URL 다운로드 |

### 6.2 사용자 (`validateUserApiRequest`)

| 라우트 | 메서드 | 역할 |
|---|---|---|
| `/api/events` | GET / GET?id= | 모집중 목록(캐러셀): `effectiveOpen=true AND (target_type='all' OR target_region_id=내지역)`. 상세는 본인 신청 이력이 있으면 종료 후에도 열람 가능 |
| `/api/events/applications` | POST / GET / DELETE?id= | 신청 / 내 예약 목록 / 취소(본인 `applied`만) |
| `/api/events/submissions` | POST / DELETE?id= / GET?path= | 서류 업로드(본인 신청건, 최대 10) / 삭제 / 본인 파일 서명 URL |
| `/api/events/files/download` | GET?id= | 서류양식파일 서명 URL 다운로드 |

### 6.3 신청 POST 서버 검증 순서

1. 이벤트 존재 & `effectiveOpen`(모집중) 확인
2. 대상 지역 매칭(`target_type='all'` 또는 `target_region_id=사용자 지역`)
3. 중복 신청 차단(부분 유니크)
4. 선택 날짜(`event_date_id`)가 해당 이벤트의 `event_dates`에 속하는지 검증
5. 단체명·담당자·연락처·지역을 세션/`users` 행에서 읽어 **스냅샷 저장**

## 7. 자동 스케줄러 (Scheduling)

Vercel **무료 플랜**(cron 최소 granularity = 하루 1회)을 전제로, **읽기시점 보정**을
정확도의 주 메커니즘으로 삼는다.

- **effectiveOpen(모집중) 계산 규칙** (읽기시점):
  - 스케줄(`reservation_start_at`/`reservation_end_at`)이 설정된 경우 → **스케줄 우선**:
    `start_at <= now < end_at`이면 open, 아니면 closed.
  - 스케줄이 없는 경우 → 수동 `is_open` 값 사용.
- **수동 버튼**: 스케줄이 없을 때 유효(`is_open` 토글). 스케줄 설정 시 자동 모드로 전환.
  즉시 종료가 필요하면 스케줄을 지우고 수동 종료하거나 `end_at`을 현재로 설정.
- **cron** `/api/cron/event-scheduler` (`CRON_SECRET` 보호, `vercel.json` 등록, 기존
  `daily-notifications` 패턴): 하루 1회 계산된 상태를 `is_open` 컬럼에 반영해 **관리자
  목록 표시/정합성**을 유지. 사용자 노출 정확도는 읽기시점 계산이 담당하므로 cron 지연이
  사용자 경험에 영향 없음.

## 8. UI

### 8.1 사용자 UI

- **`/events` (스포츠이벤트 메인)** — 스포츠교실 로그인 재사용(`useSessionCheck`)
  - 모집중 이벤트 **캐러셀**(대표이미지 + 이벤트명). 신규 경량 캐러셀 컴포넌트.
  - 우측 상단 **내 예약** 버튼.
- **`/events/[id]` (상세)**
  - 대표이미지 · 영상 임베드(있으면) · **HTML 설명 가독성 렌더**(`sanitizeHtml`) · 일정
    안내 · 서류양식파일 다운로드.
  - **신청하기** 버튼 → 신청 폼 모달.
- **신청 폼 모달**
  - 달력(`react-calendar`)에서 관리자 지정 날짜만 선택 가능(1개).
  - 단체명·담당자·연락처: 계정정보 자동입력(읽기전용).
  - 참여학생수 + 인솔자수 입력 → 전체인원 자동 합산 표시.
  - 제출 → `"신청이 완료되었습니다. 선정 발표를 기다려주세요."` 알림 + 폼 자동 닫힘.
- **내 예약 모달**
  - 신청 내역(이벤트명·선택날짜·상태: 신청/선정/탈락/취소).
  - 항목 클릭 → 상세 + **서류 제출하기**(업로드 + 제출 파일 목록) + 선정 전 **신청 취소**.

### 8.2 관리자 UI

- **`/admin/events` (목록/관리)** — `AdminNavigation`에 "스포츠이벤트" 추가. super=전체,
  지역관리자=관리 범위.
  - 목록 테이블: 이벤트명 · 대상지역 · 모집상태 · 일정 수 · 신청 수.
  - 생성/수정 폼: 이벤트명 · 대표이미지 업로드 · **RichTextEditor(HTML+양방향 미리보기)**
    · 영상 URL · 일정 날짜 여러 개 추가 · 서류양식파일 업로드(최대 5).
  - 예약 시작/종료 토글 + 자동 스케줄 설정(start/end 시각).
- **`/admin/events/[id]` (신청·서류 관리)**
  - 신청자 목록(단체명·담당자·연락처·선택날짜·전체인원·상태) + **선정/탈락** 액션.
  - **서류 다운로드**: 단체별 그룹핑, 각 제출 파일 서명 URL 다운로드.

### 8.3 재사용 컴포넌트

`RichTextEditor`, `FileUploadManager`, `AttachmentList`, `react-calendar`,
`useSessionCheck`, `AdminNavigation`.

## 9. 권한 & 지역 스코프 (Authorization)

- 관리자 인증: `src/lib/auth.ts` `validateApiRequest` → `isAdmin`.
- 지역 스코프: `resolveReservationRegionScope(adminRole, requestedRegionCode)` 재사용.
  - super: 모든 지역(또는 전체) 대상 가능.
  - south/north: 대상 지역이 본인 지역으로 강제, 타 지역 요청 시 오류.
- 소유권: 비-super 관리자는 본인 `author_id` 이벤트만 수정/삭제(공지사항/팝업 패턴).
- 사용자 인증: `validateUserApiRequest`. 신청 폼의 단체/담당/연락처는 사용자가 입력하지
  않고 서버가 세션 신뢰값으로 주입.

## 10. 테스트 전략 (Testing)

기존 컨벤션(`node:test`, 라이브러리 옆 `*.test.ts`)을 따른다. 순수 로직은 `src/lib`로
추출해 단위 테스트한다.

- `effectiveOpen` 계산(스케줄 우선/수동 fallback, 경계값) — 순수 함수 + 테스트.
- 신청 검증(모집중/지역매칭/중복/날짜소속) 헬퍼 — 순수 함수 + 테스트.
- 전체인원 합산, 지역 스코프 해석 재사용 헬퍼 — 테스트.
- 파일 검증은 기존 `fileValidation.ts` 테스트로 커버(형식 확인).
- 실행: `node --test <파일>` (단일), `node --test`(전체).

## 11. 비목표 (Out of Scope)

- 알림톡/SMS(Aligo) 연동 — 이번 범위 제외(앱 내 알림만).
- 정원/선착순 자동 마감 — 없음(수동 선정).
- 스포츠교실 예약과의 통합(월/일 제한 공유) — 분리 유지.
- 분 단위 정확 cron — 무료 플랜 제약으로 읽기시점 보정으로 대체.

## 12. 열린 항목 (Follow-ups)

- 캐러셀 UX 세부(자동 슬라이드 주기, 모바일 스와이프)는 구현 시 확정.
- 영상 URL 임베드 방식(YouTube/Vimeo iframe 변환 규칙)은 구현 시 확정.
- 이벤트 종료 후 사용자 상세 접근 범위(신청 이력 있는 사용자만)는 구현 시 재확인.
