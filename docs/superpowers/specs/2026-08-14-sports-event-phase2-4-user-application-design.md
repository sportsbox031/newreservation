# 스포츠이벤트 Phase 2+3+4 설계 — 사용자 신청 · 관리자 신청관리 · 자동 스케줄러

- 작성일: 2026-08-14
- 상태: 설계 확정 (구현 대기)
- 선행: `docs/superpowers/specs/2026-08-13-sports-event-reservation-design.md` (원 설계, Phase 1 완료)
- 변경점: **이벤트에서 지역 구분 완전 제거**(`events.target_type`/`target_region_id` 컬럼 DROP 완료) 이후의 Phase 2~4 구현 설계
- 작업 브랜치: `feature/sports-event-reservation`

## 1. 개요 (Overview)

Phase 1(관리자 이벤트 CRUD)에 이어, 사용자가 이벤트를 조회·신청하고 서류를 제출하는 흐름(Phase 2·3)과
관리자가 이벤트별 신청자를 관리·선정하고 제출 서류를 다운로드하는 흐름(Phase 3), 그리고 모집 시작/종료를
자동화하는 스케줄러(Phase 4)를 구현한다.

핵심 특징(원 설계 유지): **선정제(관리자 수동 선정)**, **서류 제출**, **하루 예약 제한 없음**, **정원 없음**,
**이벤트당 1회 신청(취소 후 재신청 허용)**, **앱 내 상태 표시만(알림톡 제외)**.

**이번 설계에서 확정/변경된 결정:**
| 항목 | 결정 |
|---|---|
| 지역 구분 | **없음.** 모든 이벤트는 전역 대상. 사용자 목록/신청에서 지역 매칭·필터 없음 |
| 사용자 진입점 | 대시보드 헤더에 **"스포츠이벤트" 버튼** 추가 → `/events` |
| 선정 결과 전달 | **"내 신청내역"의 상태 표시만**(신청/선정/탈락/취소). 별도 알림 없음 |
| 자동 스케줄러 | **이번 범위에 포함**(Phase 4) |
| 관리자 신청자 목록의 지역 | **표시 안 함.** `event_applications.region_id`는 신청 시점 스냅샷으로 저장만 하고 화면 미표시·게이팅 미사용 |

## 2. 데이터 모델 (Data Model)

**스키마 변경 없음.** 필요한 테이블은 이미 존재한다.

- `event_applications` — 신청. 컬럼: `id`, `event_id`, `user_id`, `event_date_id`, `student_count`,
  `leader_count`, `total_count`(generated), `applicant_org_name`, `applicant_manager_name`,
  `applicant_phone`, `region_id`(스냅샷·미표시), `status`(`applied`/`selected`/`rejected`/`cancelled`),
  `created_at`, `updated_at`.
  - **중복 방지**: 부분 유니크 `uq_event_applications_once = UNIQUE(event_id, user_id) WHERE status <> 'cancelled'` (이미 적용됨).
- `event_submissions` — 서류 제출. 컬럼: `id`, `application_id`, `file_name`, `file_size`(≤5MB),
  `file_type`, `storage_path`, `uploaded_at`. 신청건당 최대 10개.

타입은 이미 `src/types/database.ts`에 `EventApplication`/`EventApplicationInsert`,
`EventSubmission` alias로 존재. 없으면 동일 패턴으로 추가한다.

## 3. 서버 로직 모듈 (테스트 가능한 헬퍼 + 서버)

레포 패턴(순수 로직은 `src/lib`로 추출, 라우트·컴포넌트는 얇게)을 따른다.

### 3.1 순수 헬퍼 (`*.test.ts` 동반)
- **`src/lib/eventApplicationHelpers.ts`**
  - `validateApplicationInput(input)` → 정규화 or 에러. 규칙: `student_count`/`leader_count`는 0 이상 정수,
    합계 ≥ 1, `event_date_id` 존재(문자열). (선택 날짜의 소속 검증은 DB 조회가 필요하므로 서버에서 수행)
  - `computeTotalCount(student, leader)` → number.
  - `canCancelApplication(status)` → boolean (`status === 'applied'`만 true).
- **`src/lib/eventScheduleHelpers.ts`**
  - `validateSchedule(start, end)` → 에러 or null. 둘 다 없으면 스케줄 미설정(OK), 하나만 있으면 에러,
    둘 다 있으면 `start < end` 강제.
  - `computeEffectiveOpen`(이미 `src/lib/eventReservationStatus.ts`에 존재) 재사용.

### 3.2 서버 (service-role)
- **`src/lib/eventApplicationServer.ts`**
  - 사용자: `createApplicationOnServer`(모집중·중복·날짜소속 검증 + 스냅샷 저장),
    `listMyApplicationsOnServer(userId)`, `cancelApplicationOnServer(id, userId)`(본인 `applied`만).
  - 관리자: `listApplicationsForEventOnServer(eventId)`(이벤트별 신청자 + 선택날짜·제출수),
    `setApplicationStatusOnServer(id, status)`(`selected`/`rejected`, 되돌리기 허용).
- **`src/lib/eventSubmissionServer.ts`**
  - 사용자: `uploadSubmissionOnServer`(본인 신청건, ≤10, `event-files` private
    `submissions/{applicationId}/…`), `deleteSubmissionOnServer(id, userId)`, `listMySubmissionsOnServer(applicationId, userId)`.
  - 관리자: `listSubmissionsForEventOnServer(eventId)`, `signedUrlForSubmission(path)`(1시간).

## 4. API 라우트

지역 필터·스코프 없음(이벤트는 지역 무관). 오류는 한국어 `{ error: { message } }`.

### 4.1 사용자 (`validateUserApiRequest`)
| 라우트 | 메서드 | 역할 |
|---|---|---|
| `/api/events` | GET / GET?id= | 모집중(`effectiveOpen=true`) 이벤트 전체 목록 / 상세(본인 신청이력 있으면 종료 후에도 열람) |
| `/api/events/applications` | POST / GET / DELETE?id= | 신청 / 내 신청내역 / 취소(본인 `applied`만) |
| `/api/events/submissions` | POST / DELETE?id= / GET?path= | 서류 업로드(본인 신청건, ≤10) / 삭제 / 본인 파일 서명URL |
| `/api/events/files/download` | GET?id= | 서류양식파일 서명URL(모집중 또는 신청이력 있는 사용자) |

**신청 POST 서버 검증 순서**(지역매칭 제거):
1. 이벤트 존재 & `computeEffectiveOpen`(모집중) 확인
2. 중복 신청 차단(부분 유니크 위반 시 사용자 친화 메시지)
3. 선택 `event_date_id`가 해당 이벤트의 `event_dates`에 속하는지 검증
4. 단체명·담당자·연락처·지역을 세션/`users` 행에서 읽어 **스냅샷 저장**(사용자 입력 신뢰 안 함)

### 4.2 관리자 (`validateApiRequest` + `isAdmin`)
| 라우트 | 메서드 | 역할 |
|---|---|---|
| `/api/admin/events/applications` | GET?event_id= / PATCH?id= | 신청자 목록 / 선정·탈락(`status`) |
| `/api/admin/events/submissions` | GET?event_id= / GET?path= | 이벤트별 제출 서류 목록 / 서명URL 다운로드 |

- 이벤트는 지역 무관이므로 관리자 소유권·지역 스코프 게이팅 없음(Phase 1에서 이미 제거됨). 인증된 관리자면 모두 접근.

## 5. 사용자 UI

- **대시보드 헤더**(`src/app/dashboard/page.tsx`): "내 예약" 옆에 **"스포츠이벤트"** 버튼 추가 → `router.push('/events')`.
- **`/events`** (신규): `useSessionCheck` 재사용. 모집중 이벤트 **캐러셀**(대표이미지 + 이벤트명, 신규 경량 컴포넌트),
  우측 상단 **"내 신청내역"** 버튼 → 모달.
- **`/events/[id]`** (신규): 대표이미지 · 영상 임베드(있으면) · **HTML 설명 렌더(`sanitizeHtml`)** · 일정 안내 ·
  서류양식파일 다운로드 · **"신청하기"** 버튼 → 신청 폼 모달.
- **신청 폼 모달**: `react-calendar`로 관리자 지정 날짜만 선택(1개), 단체명·담당자·연락처 자동입력(읽기전용),
  참여학생수+인솔자수 → 전체인원 자동 합산, 제출 시 `"신청이 완료되었습니다. 선정 발표를 기다려주세요."` + 폼 자동 닫힘.
- **내 신청내역 모달**: 이벤트명·선택날짜·상태(신청/선정/탈락/취소). 항목 클릭 → 상세 + **서류 제출하기**(업로드 + 제출 파일 목록) + 선정 전 **신청 취소**.

## 6. 관리자 UI

- **`/admin/events`**(기존 수정): 목록에 **신청 수** 컬럼 + 행별 **"신청관리"** 링크(→ `/admin/events/[id]`).
  생성/수정 폼에 **자동 스케줄(모집 시작/종료 일시)** 입력 추가(Phase 4).
- **`/admin/events/[id]`**(신규): 신청자 목록(단체명·담당자·연락처·선택날짜·전체인원·상태) + **선정/탈락** 액션 +
  신청자별 **제출 서류 다운로드**(서명URL). 지역 컬럼 없음.

## 7. Phase 4 — 자동 스케줄러

- 관리자 폼에 `reservation_start_at`/`reservation_end_at`(datetime-local) 입력 → `createEventOnServer`/
  `updateEventOnServer`에서 저장, `validateEventInput`을 스케줄 필드까지 확장(`validateSchedule` 사용).
  스케줄이 설정되면 수동 토글은 서버에서 차단(이미 구현됨, `status/route.ts`).
- **사용자 노출 정확도**는 읽기시점 계산(`computeEffectiveOpen`)이 담당 — cron 지연이 사용자 경험에 영향 없음.
- **`GET /api/cron/event-scheduler`**: `CRON_SECRET` 보호(기존 `daily-notifications` 패턴), `vercel.json`에 하루 1회 등록.
  스케줄이 설정된 이벤트의 `is_open` 컬럼을 계산값으로 정합성 반영(관리자 목록 표시 일관성). 사용자 정확도는 읽기시점이 보장.

## 8. 스토리지 & 파일 검증

- **`event-files`** (private 버킷, 기존): 서류제출은 `submissions/{applicationId}/…`. 다운로드는 **서명URL(1시간)**,
  원본 파일명 유지. 첫 업로드 시 버킷 자동 생성(기존 패턴).
- **파일 검증**: `src/lib/fileValidation.ts` 재사용 — pdf/jpg/jpeg/png(MIME+확장자), hwp/hwpx(확장자), 개당 5MB,
  `sanitizeFileName`. 개수 상한: 서류제출 신청건당 10개.

## 9. 권한

- 사용자 인증: `validateUserApiRequest`. 신청 폼의 단체/담당/연락처/지역은 사용자 입력이 아니라 **서버가 세션 신뢰값으로 주입(스냅샷)**.
- 관리자 인증: `validateApiRequest` → `isAdmin`. 이벤트 지역 스코프·소유권 게이팅 없음(지역 제거됨).
- 사용자 서류/취소는 **본인 신청건**만(서버에서 `user_id`/`application_id` 소유권 확인).

## 10. 테스트 전략

기존 컨벤션(`node:test`, 라이브러리 옆 `*.test.ts`, import는 `.ts` 확장자).
- `validateApplicationInput` / `computeTotalCount` / `canCancelApplication` — 순수 함수 + 테스트.
- `validateSchedule` — 경계값(둘다없음/하나만/역전) 테스트.
- `computeEffectiveOpen` — 기존 테스트 유지.
- 완료 후 실제 앱 end-to-end 검증(사용자 신청→서류→관리자 선정→다운로드, 스케줄 자동 open/close).

## 11. 비목표 (Out of Scope)

- 알림톡/SMS(Aligo) — 앱 내 상태 표시만.
- 정원/선착순 자동 마감 — 없음(수동 선정).
- 스포츠교실 예약(월/일 제한, tier, 동시성 RPC)과의 통합 — 분리 유지, 코드 무변경.
- 분 단위 정확 cron — Vercel 무료 플랜 제약으로 읽기시점 보정으로 대체.

## 12. 구현 순서 제안 (implementation plan 대상)

1. 순수 헬퍼(`eventApplicationHelpers`, `eventScheduleHelpers`) + 테스트.
2. 사용자 신청 서버·API(`/api/events`, `/api/events/applications`) + 스냅샷 검증.
3. 사용자 UI(`/events`, `/events/[id]`, 신청 폼 모달, 내 신청내역 모달, 대시보드 진입 버튼).
4. 서류 제출 서버·API(`/api/events/submissions`, `/api/events/files/download`) + 내 신청내역 업로드 UI.
5. 관리자 신청관리 API(`/api/admin/events/applications`, `/submissions`) + `/admin/events/[id]` 페이지 + 목록 신청수·링크.
6. Phase 4: 관리자 폼 스케줄 입력 + `validateEventInput` 확장 + `/api/cron/event-scheduler` + `vercel.json`.
7. 전체 실제 앱 검증.
