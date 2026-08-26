# 실적관리(Performance Management) 설계

- 작성일: 2026-08-25
- 브랜치: feature/sports-event-reservation
- 관련: 원본 참고 사이트 https://result.ggsportsbox.or.kr (경기도체육회 스포츠박스 실적/예산 관리)

## 1. 목적

사용자들이 예약한 내용을 **누적 실적**으로 관리하는 관리자 기능. 세 프로그램(스포츠교실, 스포츠체험존, 스포츠이벤트)의 실적을 한 곳에서 집계·조회·수정한다. 관리자 페이지에 탭 1개(대시보드) + 상세 조회 페이지 1개를 추가한다.

원본 참고 사이트의 "대시보드 / 실적 조회 / 실적 입력" 구조를 참고하되, 예산·홍보·성별·CSV 일괄업로드는 제외하고 우리 프로젝트 디자인으로 통일한다.

## 2. 확정된 결정 사항

| 항목 | 결정 |
|---|---|
| 성별(남성/여성) 구분 | **제외** — 총 참여인원만 사용 |
| 예산 관리 | **제외** — 실적만 |
| 접근 권한 | `super`=전체, `south`/`north`=자기 지역만 |
| 내보내기/업로드 | **Excel 다운로드만** (CSV 일괄 업로드 제외) |
| 예약 연동 방식 | **실시간 연동** + 수정분은 **override 별도 저장** |
| 홍보(홍보 횟수) | **제외** |
| 요약 카드 | `총 실적 횟수`, `총 참여인원` 2개만 (등록 단체수 카드 제외) |
| 학년(grade) | 어디서도 **필수 아님(nullable)**. 교실=슬롯 자동, 체험존=선택 입력, 이벤트=비움 |

## 3. 데이터 모델

세 소스를 **하나의 정규화된 "실적 레코드"로 라이브 union**하여 조회/집계한다. 교실·이벤트는 원본 예약 데이터를 실시간 반영하므로 예약이 취소·수정되면 실적도 자동으로 따라 변한다. 관리자가 수정한 값(메모/학년/인원)은 override 테이블에 저장하여 union 시 우선 적용한다.

### 3.1 정규화된 실적 레코드(개념 스키마)

```
PerformanceRecord {
  id: string            // 합성 키: `${source_type}:${source_id}` (체험존은 `experience_zone:${uuid}`)
  program_type: 'sports_class' | 'sports_event' | 'experience_zone'
  date: string          // YYYY-MM-DD
  organization_name: string
  city_name: string | null
  region_id: number | null
  region_label: '남부' | '북부' | null
  grade: string | null        // 선택
  participant_count: number
  memo: string | null
  source_type: 'sports_class' | 'sports_event' | 'experience_zone'
  source_id: string           // reservations.id / event_applications.id / experience_zone_records.id
  editable: boolean           // 항상 true (수정 가능)
}
```

### 3.2 소스별 매핑

**스포츠교실 `sports_class`**
- 소스: `reservations`(status=`approved`) ⋈ `reservation_slots` ⋈ `users` ⋈ `cities` ⋈ `regions`
- 1 예약 = 1 실적 레코드 (org가 하루 방문한 단위)
- date = `reservations.date`, organization_name = `users.organization_name`, city = `cities.name`, region = `reservations.region_id`(없으면 `cities`→`regions`)
- participant_count = 해당 예약 슬롯들의 `participant_count` 합
- grade = 슬롯 `grade`들을 결합(예: `3학년, 5학년`); 중복 제거
- override 적용: `performance_overrides`(source_type=`sports_class`, source_id=reservation.id)

**스포츠이벤트 `sports_event`**
- 소스: `event_applications`(status=`selected`) ⋈ `event_dates`(날짜) ⋈ `regions`
- date = `event_dates.event_date` (event_date_id 없으면 해당 event의 대표 날짜 폴백)
- organization_name = `applicant_org_name` (없으면 `users.organization_name`)
- participant_count = `total_count` (= student_count + leader_count)
- grade = null (이벤트는 학년 없음)
- override 적용: source_type=`sports_event`, source_id=application.id

**스포츠체험존 `experience_zone`**
- 소스: 신규 `experience_zone_records` (전량 수기)
- 모든 필드 입력값 그대로 사용

### 3.3 신규 테이블

```sql
-- 스포츠체험존 실적 (수기 입력)
create table if not exists public.experience_zone_records (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  organization_name text not null,
  region_id integer references public.regions(id),
  city_id integer references public.cities(id),
  grade text,                       -- 선택
  participant_count integer not null default 0 check (participant_count >= 0),
  memo text,
  created_by uuid references public.admins(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_experience_zone_records_date on public.experience_zone_records(date);
create index if not exists idx_experience_zone_records_region on public.experience_zone_records(region_id);

-- 교실/이벤트 실적 수정 override
create table if not exists public.performance_overrides (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('sports_class','sports_event')),
  source_id uuid not null,
  grade text,                       -- null이면 원본 사용
  participant_count integer check (participant_count is null or participant_count >= 0),
  memo text,
  excluded boolean not null default false,   -- true면 집계/목록에서 제외
  updated_by uuid references public.admins(id),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);
create index if not exists idx_performance_overrides_lookup on public.performance_overrides(source_type, source_id);
```

override 병합 규칙(union 시): `grade`, `participant_count`는 `COALESCE(override, 원본)`; `memo`는 override 있으면 override; `excluded=true`면 레코드 자체 제외.

RLS/권한: 기존 admin 라우트와 동일하게 **API 라우트에서 service role + 지역 스코핑**으로 통제(테이블 RLS는 기존 관례 따름).

## 4. API 계층

기존 패턴 준수: 서버 라우트에서 `getAuthTokenFromRequest` + admin 검증 + 지역 스코핑, service role key 사용. 반환 형식 `{ data, error }`.

| 라우트 | 메서드 | 설명 |
|---|---|---|
| `/api/admin/performance/summary` | GET | 대시보드 집계. 쿼리: `year, from, to, region`. 반환: 총 실적 횟수, 프로그램별 `{ count, participants }`, 총 참여인원, 월별 참여인원 시리즈(1~12월) |
| `/api/admin/performance/records` | GET | 상세 목록(union). 필터: `year, q(검색), region, from, to, program`. 페이지네이션(`page`, `pageSize`=30) |
| `/api/admin/performance/experience` | POST | 체험존 실적 생성 |
| `/api/admin/performance/experience/[id]` | PATCH, DELETE | 체험존 실적 수정/삭제 |
| `/api/admin/performance/override` | PATCH | 교실/이벤트 레코드 수정(override upsert). 모든 override 필드가 비면 override 행 삭제(원복) |
| `/api/admin/performance/export` | GET | 현재 필터 기준 union 결과를 ExcelJS로 다운로드 |

**지역 스코핑:** `south`/`north` 관리자는 `region` 파라미터 무시하고 자기 지역으로 강제. `super`는 전체/남부/북부 선택 가능.

### 4.1 testable-helper 분리 (lib + 테스트)

- `src/lib/performanceRecords.ts` — 소스 로우 → 정규화 `PerformanceRecord` 변환, override 병합, 슬롯 grade 결합/participant 합산. `+ .test.ts`
- `src/lib/performanceAggregate.ts` — 레코드 배열 → 요약(프로그램별 회/명, 총계, 월별 시리즈). `+ .test.ts`
- `src/lib/performanceFilters.ts` — 쿼리 파라미터 파싱/검증(year/from/to/region/program/page), 지역 스코핑 강제 규칙. `+ .test.ts`
- `src/lib/performanceServer.ts` — Supabase 조회 + 위 헬퍼 조합(서버 전용, service role)

## 5. 페이지 & UI

프로젝트 admin 디자인으로 통일: `AdminNavigation`, lucide 아이콘, Tailwind(white 카드 · `rounded-xl` · `shadow-sm` · `blue-600` 강조 · `gray-50` 배경), `ModalOverlay` · `Spinner` 재사용. **원본 사이트의 보라 그라데이션은 사용하지 않는다.**

### 5.1 네비게이션
`AdminNavigation`에 `실적관리` 탭 추가 — icon `BarChart3`(lucide), href `/admin/performance`, roles `['super','south','north']`. (기존 `스포츠이벤트`/`예약 관리` 사이 적절한 위치)

### 5.2 `/admin/performance` — 대시보드
- 필터 바: 연도 칩(2025~2030) · 지역 토글(전체/남부/북부; 지역관리자는 자기지역 고정 표시) · 시작일~종료일 · 초기화
- 요약 카드 2개:
  - **총 실적 횟수** (3개 프로그램 합) — 클릭 시 프로그램별 `스포츠교실 N회 M명 / 스포츠체험존 N회 M명 / 스포츠이벤트 N회 M명` 펼침
  - **총 참여인원**
- 월별 참여인원 막대그래프: 인라인 SVG/CSS 막대(외부 차트 라이브러리 없음). 선택 연도 1~12월.

### 5.3 `/admin/performance/records` — 실적 조회
- 필터: 연도 · 검색(단체명) · 지역 · 시작~종료일 · 프로그램(전체/교실/체험존/이벤트) · 전체 초기화
- 표 컬럼: 날짜 · 단체명 · 시/군 · 지역(뱃지) · 프로그램 · 학년 · 총인원 · 메모 · 작업(수정/삭제)
- `체험존 실적 추가` 버튼 → 입력 모달(날짜*, 단체명*, 지역, 시/군, 학년(선택), 총인원*, 메모)
- 행별 수정: 연필 → 수정 모달
  - 체험존: 전체 필드 수정/삭제
  - 교실·이벤트: 학년·총인원·메모 override 수정, `실적 제외` 토글. 삭제 대신 제외 처리(원본 예약은 건드리지 않음)
- Excel 다운로드 버튼 (현재 필터 기준)
- 페이지당 30건 페이지네이션 · `총 N건 중 M건 표시`

## 6. 접근 제어

- 두 페이지 모두 `adminInfo` 확인 + 서버 라우트에서 admin 세션 검증
- `super`: 전체 지역, 지역 토글 사용 가능
- `south`/`north`: 자기 지역 데이터만, 지역 파라미터 서버에서 강제 고정
- 체험존 생성/수정 시 지역관리자는 자기 지역으로만 입력 가능하도록 서버 검증

## 7. 테스트

- lib 헬퍼별 `node:test` 기반 `*.test.ts` co-located (기존 관례, `.ts` 확장자 import 유지)
- 커버 대상: 슬롯 participant 합산·grade 결합, override 병합(COALESCE·excluded), 이벤트 total_count 매핑, 월별 시리즈 집계, 지역 스코핑 강제, 필터 파라미터 검증

## 8. 구현 단계

1. SQL 스키마(`experience_zone_records`, `performance_overrides`) + `database.types.ts`/`src/types/database.ts` 타입 추가
2. lib 순수 헬퍼 + 테스트 (`performanceRecords`, `performanceAggregate`, `performanceFilters`)
3. `performanceServer.ts` + API 라우트(summary/records/experience/override/export)
4. 대시보드 페이지 `/admin/performance`
5. 실적 조회 페이지 `/admin/performance/records` + 추가/수정 모달 + Excel
6. `AdminNavigation` 탭 추가 + 지역 스코핑 E2E 확인

## 9. 미해결/추후

- 스포츠이벤트 기능은 hotfix에는 아직 없음(현재 브랜치에만 존재). 실적 union의 이벤트 소스는 이 브랜치 기준으로 구현하며, 병합 대상 브랜치 확정 시 재확인.
- 일괄 CSV 업로드, 예산 관리, 만족도확인용 다운로드는 이번 범위에서 제외(추후 확장 여지).
