# Session Cookie Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자/관리자 세션을 `localStorage` 의존에서 `httpOnly + Secure + SameSite=Strict` 쿠키 중심 구조로 전환하되, 전환 기간 동안 기존 로그인/대시보드/관리자 기능이 깨지지 않게 유지한다.

**Architecture:** 서버 로그인 API가 세션 토큰을 JSON 응답뿐 아니라 쿠키로도 설정하고, 클라이언트는 우선 쿠키 기반 인증을 사용하되 짧은 병행 기간 동안 기존 `localStorage` 토큰을 fallback으로 읽는다. 세션 검증/로그아웃/API 인증은 공통 쿠키 파서 유틸을 통해 Bearer 헤더와 쿠키를 함께 지원한 뒤, 최종 단계에서 `localStorage` 저장을 제거한다.

**Tech Stack:** Next.js App Router route handlers, custom Supabase session tables, `NextResponse.cookies`, client-side React hooks, TypeScript, node:test

---

## File Structure

- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\lib\authServer.ts`
  로그인 응답에 필요한 쿠키 값, 만료시간, 옵션을 함께 내려줄 수 있게 서버 auth 로직 확장.
- Create: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\lib\authCookies.ts`
  사용자/관리자 세션 쿠키 이름, 설정 옵션, 읽기/삭제 헬퍼를 모으는 전용 유틸.
- Test: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\lib\authCookies.test.ts`
  쿠키 이름/우선순위/삭제 옵션 회귀 방지.
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\app\api\auth\user\login\route.ts`
  사용자 로그인 성공 시 `Set-Cookie` 추가.
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\app\api\auth\admin\login\route.ts`
  관리자 로그인 성공 시 `Set-Cookie` 추가.
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\app\api\auth\logout\route.ts`
  Bearer 헤더가 없더라도 쿠키 기반 로그아웃이 가능하게 하고, 응답에서 쿠키를 즉시 제거.
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\app\api\auth\session\route.ts`
  쿠키 기반 세션 검증/갱신을 허용.
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\lib\auth.ts`
  API 인증 시 Authorization 헤더 우선, 없으면 쿠키 fallback으로 읽도록 변경.
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\lib\authApiClient.ts`
  `credentials: 'include'`를 공통 적용하고, fallback 토큰이 있을 때만 Bearer 헤더를 붙이도록 변경.
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\hooks\useSessionCheck.ts`
  클라이언트가 `session_token`이 없어도 쿠키 세션으로 검증 가능하도록 전환. 병행 기간 동안 기존 localStorage fallback 유지.
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\app\auth\login\page.tsx`
  로그인 성공 시 사용자 정보는 유지하되 세션 토큰 localStorage 저장을 단계적으로 줄이는 병행 로직 반영.
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\components\AdminNavigation.tsx`
  관리자 로그아웃이 쿠키 세션까지 정리되는지 확인하고 필요 시 fallback 정리 보완.
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\docs\security\2026-03-22-rls-hardening-plan.md`
  Phase 7 진행 상태와 롤백 포인트를 문서에 기록.

## Chunk 1: Cookie Contract

### Task 1: 쿠키 명세와 테스트 고정

**Files:**
- Create: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\lib\authCookies.ts`
- Test: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\lib\authCookies.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('buildSessionCookieConfig returns secure cookie defaults for user sessions', () => {
  const result = buildSessionCookieConfig('user', 'token', '2026-03-23T00:00:00.000Z')
  assert.equal(result.name, 'sportsbox_user_session')
  assert.equal(result.options.httpOnly, true)
  assert.equal(result.options.sameSite, 'strict')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/authCookies.test.ts`
Expected: FAIL because cookie helper does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Implement cookie helpers for:
- user/admin cookie names
- secure options (`httpOnly`, `secure`, `sameSite`, `path`)
- expiration handling
- cookie clearing helpers

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/authCookies.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/authCookies.ts src/lib/authCookies.test.ts
git commit -m "feat: add session cookie helpers"
```

## Chunk 2: Server Login / Logout Bridge

### Task 2: 로그인 응답에서 쿠키를 함께 설정

**Files:**
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\lib\authServer.ts`
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\app\api\auth\user\login\route.ts`
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\app\api\auth\admin\login\route.ts`
- Test: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\lib\authRouteHelpers.test.ts`

- [ ] **Step 1: Write the failing test**

Add a route-level test or helper test that proves successful login now returns cookie metadata or sets cookie fields needed by route handlers.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/authRouteHelpers.test.ts`
Expected: FAIL for missing cookie contract.

- [ ] **Step 3: Write minimal implementation**

Implement:
- auth server result includes session token + expiry already present
- route handlers translate those into `response.cookies.set(...)`
- keep JSON response shape unchanged for compatibility

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/authRouteHelpers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/authServer.ts src/app/api/auth/user/login/route.ts src/app/api/auth/admin/login/route.ts src/lib/authRouteHelpers.test.ts
git commit -m "feat: set session cookies on login"
```

### Task 3: 로그아웃과 세션 갱신을 쿠키 기반으로 병행 지원

**Files:**
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\app\api\auth\logout\route.ts`
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\app\api\auth\session\route.ts`
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\lib\auth.ts`
- Test: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\lib\authCookies.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests for:
- cookie token extraction when Authorization header is absent
- logout clearing cookie metadata

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/authCookies.test.ts`
Expected: FAIL because cookie extraction/clearing behavior is not wired.

- [ ] **Step 3: Write minimal implementation**

Implement:
- `validateApiRequest` and user session routes read header first, cookie second
- logout route uses header token or cookie token
- logout response clears both user/admin session cookies

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/authCookies.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/logout/route.ts src/app/api/auth/session/route.ts src/lib/auth.ts src/lib/authCookies.test.ts
git commit -m "feat: support cookie-backed auth session routes"
```

## Chunk 3: Client Compatibility Layer

### Task 4: authApiClient를 쿠키 우선 구조로 전환

**Files:**
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\lib\authApiClient.ts`
- Test: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\lib\authCookies.test.ts`

- [ ] **Step 1: Write the failing test**

Add test coverage for request init generation:
- always include `credentials: 'include'`
- only attach Authorization header when fallback token is explicitly passed

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/authCookies.test.ts`
Expected: FAIL because request helper is header-only today.

- [ ] **Step 3: Write minimal implementation**

Implement:
- shared request helper with `credentials: 'include'`
- optional token parameter for fallback period
- existing return shape unchanged

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/authCookies.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/authApiClient.ts src/lib/authCookies.test.ts
git commit -m "refactor: send auth cookies with client requests"
```

### Task 5: useSessionCheck와 로그인 화면을 병행 전환

**Files:**
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\hooks\useSessionCheck.ts`
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\app\auth\login\page.tsx`
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\lib\sessionCache.ts`
- Test: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\src\lib\sessionCache.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests covering:
- session validation can proceed without `localStorage.session_token`
- validated-at cache key still works with cookie-era fallback identifier

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/sessionCache.test.ts`
Expected: FAIL because session cache assumes localStorage token exists.

- [ ] **Step 3: Write minimal implementation**

Implement:
- login success still stores `currentUser` / `adminInfo`
- token localStorage write becomes optional transitional fallback
- `useSessionCheck` first tries cookie session via `/api/auth/session`, then uses existing fallback token only if needed
- logout removes old localStorage token for cleanup

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/sessionCache.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSessionCheck.ts src/app/auth/login/page.tsx src/lib/sessionCache.ts src/lib/sessionCache.test.ts
git commit -m "feat: support cookie-first session checks"
```

## Chunk 4: Verification and Cutover

### Task 6: 수동 스모크 테스트와 문서 업데이트

**Files:**
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\docs\security\2026-03-22-rls-hardening-plan.md`
- Modify: `C:\Users\pkmlo\OneDrive\Desktop\sportsbox_new\docs\security\2026-03-22-phase7-session-cookie-plan.md`

- [ ] **Step 1: Run focused automated tests**

Run:
```bash
npx tsx --test src/lib/authCookies.test.ts src/lib/authRouteHelpers.test.ts src/lib/sessionCache.test.ts src/lib/authTimestamp.test.ts
npx tsc --noEmit --pretty false
```
Expected: PASS

- [ ] **Step 2: Run manual smoke tests on local server**

Verify:
- 사용자 로그인 → 대시보드 진입
- 브라우저 개발자도구에서 세션 쿠키 설정 확인
- 새 탭 열기 후 로그인 유지
- 로그아웃 후 쿠키 제거
- 관리자 로그인 → 관리자 진입 → 로그아웃

- [ ] **Step 3: Deploy in compatibility mode**

Keep fallback behavior temporarily:
- 쿠키 + localStorage 병행 읽기
- localStorage 쓰기는 최소화하되 완전 제거하지 않음

- [ ] **Step 4: Post-deploy verification**

Verify in production:
- 사용자 로그인/로그아웃
- 관리자 로그인/로그아웃
- `401` 폭증 여부
- 세션 관련 콘솔 에러 여부

- [ ] **Step 5: Final cleanup follow-up ticket**

Record a follow-up to remove fallback localStorage token writes after 1차 안정화 확인.

- [ ] **Step 6: Commit**

```bash
git add docs/security/2026-03-22-rls-hardening-plan.md docs/security/2026-03-22-phase7-session-cookie-plan.md
git commit -m "docs: add session cookie hardening rollout plan"
```
