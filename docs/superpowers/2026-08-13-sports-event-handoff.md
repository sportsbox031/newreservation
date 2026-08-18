# 스포츠이벤트 예약 — 작업 핸드오프 (2026-08-13)

내일 이어서 작업하기 위한 상태 요약 + 다음 할 일. 기획/설계/계획 문서는 아래를 함께 볼 것.

- 설계 스펙: `docs/superpowers/specs/2026-08-13-sports-event-reservation-design.md`
- Phase 1 구현 계획: `docs/superpowers/plans/2026-08-13-sports-event-phase1-admin-crud.md`
- SDD 진행 원장(로컬, git-ignored): `.superpowers/sdd/2026-08-13-sports-event-phase1-admin-crud/progress.md`
- 작업 브랜치: **`feature/sports-event-reservation`** (hotfix에서 분기)

---

## 1. 지금까지 완료한 것 (Phase 1 — 관리자 이벤트 CRUD)

전용 테이블 5개(스포츠교실과 분리) + 관리자 이벤트 관리 기능 구현. 서브에이전트 기반(SDD)으로 태스크별 구현→리뷰 진행.

### 커밋 순서 (feature/sports-event-reservation)
| 커밋 | 내용 | 리뷰 |
|---|---|---|
| `78b95bf` | 설계 스펙 문서 | — |
| `54b8fc3` | Phase 1 구현 계획 문서 | — |
| `01bc00d` | 이벤트 스키마 SQL (`sports-events-schema.sql`) | 컨트롤러 검증 |
| `b3aa6e1` | 이벤트 테이블 타입 (`src/types/database.ts` ExtendedPublic 확장) | ✅ 승인 |
| `68a25a5` | `computeEffectiveOpen` 모집상태 계산 헬퍼 (TDD 5/5) | ✅ 승인 |
| `082af34` | `validateEventInput` 입력 검증 헬퍼 (TDD 5/5) | ✅ 승인 |
| `88b2933` | 이벤트 CRUD 서버(`eventServer.ts`) + `/api/admin/events` 라우트 | ✅ 승인 |
| `4bcfdae` | 이미지 업로드 / 서류양식파일 / 예약 토글 라우트 3종 | ✅ 승인 |
| `45c8c83` | `thumbnail_path` 저장 배선(서버) | ✅ 승인 |
| `2396a4c` | 관리자 이벤트 관리 UI (`/admin/events`) + 네비/대시보드 카드 | ✅ 승인(Important 2건) |
| `95b9286` | Task 8 수정: 지역 잠금 하드닝 + 편집모드 기존 서류파일 목록/삭제 | ✅ 재리뷰 통과 |

**→ Phase 1(관리자 이벤트 CRUD) 전체 8개 태스크 구현·리뷰 완료.** 최종 브랜치 리뷰와 실제 구동 검증만 남음(아래 §2).

### 원격 Supabase
- **스키마는 이미 적용됨** (사용자가 SQL Editor에서 실행 완료). 테이블: `events`, `event_dates`, `event_form_files`, `event_applications`, `event_submissions` (+ 인덱스, 부분 유니크 `uq_event_applications_once`).
- 스토리지 버킷 `event-images`(public) / `event-files`(private)는 **첫 업로드 시 코드가 자동 생성**하도록 되어 있음 — 아직 실제로 생성/검증 안 됨(아래 검증 항목 참조).

### 구현 파일
- `src/lib/eventReservationStatus.ts` (+test) — `computeEffectiveOpen`
- `src/lib/eventAdminHelpers.ts` (+test) — `validateEventInput`
- `src/lib/eventServer.ts` — CRUD 서버 로직(service-role), `listEventsOnServer`가 `event_dates(*)`+`event_form_files(*)` 중첩
- `src/app/api/admin/events/route.ts` — GET/POST/PUT/DELETE
- `src/app/api/admin/events/image/route.ts` — 대표이미지 업로드(public)
- `src/app/api/admin/events/files/route.ts` — 서류양식파일 업로드/삭제(private)
- `src/app/api/admin/events/status/route.ts` — 예약 시작/종료 토글
- `src/app/admin/events/page.tsx` — 관리자 UI
- `src/components/AdminNavigation.tsx`, `src/app/admin/page.tsx` — 진입점 추가
- `src/types/database.ts` — 이벤트 타입 5종 + alias(`SportsEvent` 등)
- `src/lib/fileValidation.ts` — `validateAttachmentCount(count, maxCount=3)` 파라미터 추가(하위호환)

---

## 2. 내일 먼저 할 일 (Phase 1 마무리 — 병합 전)

1. **전체 브랜치 최종 리뷰(SDD final review)** — 가장 강한 모델로 `feature/sports-event-reservation` 전체 diff를 리뷰. `merge-base main HEAD .. HEAD`. 아래 "이월된 마이너"를 리뷰어에게 트리아지 대상으로 넘길 것. (SDD를 이어가려면 계획 파일 + 원장으로 재개.)
2. **실제 앱 구동 검증(`/verify` 또는 `/run`)** — 아직 라이브 서버로 end-to-end 미검증. 확인할 흐름:
   - 관리자 로그인(super / admin_south / admin_north) → `/admin/events`
   - 이벤트 생성: 대표이미지 업로드, HTML 설명(RichTextEditor 미리보기), 영상 URL, 일정 날짜 여러 개, 서류양식파일(pdf/hwp/hwpx/jpg/png), 대상 지역
   - 목록 표시(모집상태/일정 수), 수정(기존 서류파일 목록/삭제 포함), 예약 시작/종료 토글, 삭제
   - 지역관리자가 타 지역/전체 이벤트를 만들 수 없는지(서버 403 + UI 잠금)
   - **버킷 자동 생성**이 실제로 동작하는지(안 되면 Supabase 대시보드에서 `event-images` public / `event-files` private 수동 생성)
4. 최종 리뷰 클린 후 `superpowers:finishing-a-development-branch`로 병합 방식 결정.

### 이월된 마이너(최종 리뷰에서 트리아지)
- `eventServer.ts` 업데이트 시 일정 교체가 비원자적(삭제 후 삽입, events 행 롤백 없음) — 계획대로, 일시적 불변식 위반만.
- `files/route.ts` DELETE가 `id`↔`path` 일치 미검증(공지 첨부에서 상속된 약점).
- 5개 파일 상한 count-then-insert TOCTOU(상속).
- `image/route.ts`·`files/route.ts`가 `createClient<Database>` 제네릭 미사용(미러 스타일).
- `status/route.ts` 잘못된 body에서 `request.json()` throw → 400 대신 500.
- `admin/events/page.tsx`의 `adminInfo: any`(기존 관리자 페이지 공통 패턴).
- Task 3 happy-path 테스트에 assertion 몇 개 보강 여지.
- **`files/route.ts` DELETE에 소유권/지역 스코프 없음** — 인증된 관리자면 id+path로 타 지역 이벤트의 서류양식파일 삭제 가능(상속 패턴). Phase 3에서 서류 관리 라우트 손볼 때 함께 하드닝 권장.

---

## 3. Phase 2~4 (다음 스펙/계획 대상) — 스펙 §3 참조

각 Phase는 독립적으로 동작·검증 가능. 데이터 모델(테이블)은 **이미 전부 생성돼 있음**.

### Phase 2 — 사용자 이벤트 페이지
- 라우트: `GET /api/events`(모집중 목록=캐러셀; `effectiveOpen && (target_type='all' OR 내지역)`), `GET /api/events?id=`(상세), `POST/GET/DELETE /api/events/applications`(신청/내 예약/취소).
- `computeEffectiveOpen` 재사용해 읽기시점 모집상태 보정.
- 페이지: `/events`(캐러셀 + 내 예약), `/events/[id]`(상세: HTML 렌더 `sanitizeHtml`, 영상 임베드, 서류양식 다운로드, 신청 폼 모달).
- 신청 폼: `react-calendar`로 관리자 지정 날짜 1개 선택, 단체명/담당자/연락처 자동입력(서버 세션 스냅샷), 참여학생수+인솔자수→전체인원, "신청이 완료되었습니다. 선정 발표를 기다려주세요." 알림 + 폼 자동 닫힘.
- 내 예약: 상태(신청/선정/탈락/취소), 선정 전 취소.
- 중복 방지는 부분 유니크(`uq_event_applications_once`)로 이미 DB 강제.

### Phase 3 — 서류 제출 + 선정
- 사용자: `POST/DELETE /api/events/submissions`(본인 신청건 서류 업로드, 최대 10, `event-files` private `submissions/{applicationId}/…`), 내 예약 상세에 "서류 제출하기".
- 관리자: `GET/PATCH /api/admin/events/applications`(신청자 목록 + 선정/탈락), `GET /api/admin/events/submissions`(이벤트별→단체별 그룹핑 + 서명 URL 다운로드).
- 관리자 페이지 `/admin/events/[id]`(신청·서류 관리).

### Phase 4 — 자동 스케줄러 (Vercel 무료 = daily cron 한계)
- 읽기시점 보정이 이미 `computeEffectiveOpen`에 있음 → `/api/events` 목록·관리자 표시에 이 계산을 연결(스케줄 설정 시 우선).
- `GET /api/cron/event-scheduler`(`CRON_SECRET`, `vercel.json` 등록) — 하루 1회 `is_open` 컬럼 정합성 반영(정확도는 읽기시점이 담당).

---

## 4. 실행 중 내린 주요 결정(Rulings) — 참고

- 전용 테이블 신설(스포츠교실 예약 로직 오염 방지). 로그인/첨부/HTML에디터/지역헬퍼는 재사용.
- 지역: 이벤트마다 `target_type`(all/region). **지역관리자는 본인 지역만, '전체'는 super 전용**(서버 403 + UI 잠금).
- 타입: `gen:types`가 이 환경에서 불가(`SUPABASE_ACCESS_TOKEN`/Windows 따옴표 이슈) → 저장소 자체 패턴대로 `src/types/database.ts` `ExtendedPublic`에 수기 확장. 나중에 gen:types 성공해도 override는 병합됨.
- alias 이름 `SportsEvent`(전역 DOM `Event` 충돌 회피).
- 모집상태: 스케줄 설정 시 스케줄 우선, 없으면 수동 `is_open`. 스케줄+수동 동시 토글 금지(status 라우트 403).
- 알림톡(Aligo)은 이번 범위 제외(앱 내 알림만). 정원 없음(수동 선정). 하루 예약제한 없음.

---

## 5. 미커밋 상태 참고
- `.claude/settings.local.json`, `CLAUDE.md`(=/init 갱신분)이 아직 미커밋 상태로 남아 있음(이번 기능과 무관). 정리는 별도 판단.
