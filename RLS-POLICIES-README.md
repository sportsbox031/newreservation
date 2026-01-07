# 스포츠박스 예약 시스템 - RLS 정책 가이드

## 📋 목차

1. [현재 상황](#현재-상황)
2. [제공 파일](#제공-파일)
3. [권장 설정](#권장-설정)
4. [보안 체크리스트](#보안-체크리스트)
5. [향후 마이그레이션](#향후-마이그레이션)

---

## 🔍 현재 상황

### 인증 시스템
- **커스텀 인증 사용**: Supabase Auth를 사용하지 않음
- **로그인 방식**: `organization_name` + `password` (btoa 해싱)
- **세션 관리**: 애플리케이션 레벨에서 관리

### 데이터베이스 접근
- **Anon Key 사용**: 클라이언트에서 Supabase Anon Key로 접근
- **RLS 상태**: 현재 비활성화 또는 "Service role full access" 정책
- **권한 관리**: 애플리케이션 코드에서 권한 체크

### 관리자 역할
- **Super Admin**: 모든 권한
- **South Admin**: 경기남부 지역만 관리
- **North Admin**: 경기북부 지역만 관리

---

## 📁 제공 파일

### 1. `disable-all-rls.sql` ⭐ **현재 사용 권장**
```sql
-- 목적: 모든 테이블의 RLS 비활성화
-- 사용 시기: 커스텀 인증 시스템 사용 중 (현재)
-- 보안: 애플리케이션 레벨에서 권한 관리 필수
```

**실행 방법**:
```bash
# Supabase Dashboard → SQL Editor에서 실행
# 또는 psql 클라이언트 사용
psql -h <HOST> -U postgres -d postgres -f disable-all-rls.sql
```

**특징**:
- ✅ 모든 RLS 정책 삭제
- ✅ 모든 테이블에서 RLS 비활성화
- ✅ 현재 시스템 구조에 최적화
- ✅ 실행 후 RLS 상태 확인 가능

### 2. `complete-rls-policies.sql` 📚 **참고용**
```sql
-- 목적: 완전한 RLS 정책 정의
-- 사용 시기: Supabase Auth 마이그레이션 후
-- 보안: auth.uid() 기반 정책
```

**내용**:
- **Part A**: 현재 구조에 맞는 RLS 비활성화 (실행 가능)
- **Part B**: 참고용 완전한 RLS 정책 (주석 처리됨)

**특징**:
- 📖 모든 테이블에 대한 완전한 정책 정의
- 📖 역할별(사용자/관리자) 권한 구분
- 📖 지역별(남부/북부) 권한 분리
- 📖 향후 마이그레이션 시 참고 자료

---

## ⚙️ 권장 설정

### 현재 시스템 (커스텀 인증)

#### 1단계: RLS 비활성화
```bash
# Supabase Dashboard → SQL Editor
disable-all-rls.sql 실행
```

#### 2단계: 애플리케이션 레벨 권한 체크
```typescript
// src/lib/supabase.ts에서 이미 구현됨

// 예: 회원 승인 시 관리자 권한 체크
export const memberAPI = {
  async updateMemberStatus(memberId: string, status: string, adminRole?: string) {
    // ✅ 관리자 권한 확인
    if (!adminRole) {
      return { data: null, error: { message: '권한이 없습니다.' } }
    }

    // ✅ 지역 관리자는 본인 지역만 관리
    if (adminRole === 'south' || adminRole === 'north') {
      // 사용자의 지역 확인 후 처리
      const { data: user } = await supabase
        .from('users')
        .select('city_id, cities(region_id)')
        .eq('id', memberId)
        .single()

      // 지역 검증...
    }

    // DB 업데이트
    const { data, error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', memberId)

    return { data, error }
  }
}
```

#### 3단계: API 엔드포인트 보호
```typescript
// src/app/api/admin/*/route.ts

export async function POST(request: Request) {
  // ✅ 인증 확인
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  // ✅ 관리자 권한 확인
  const adminId = extractAdminId(authHeader) // 세션에서 추출
  const admin = await getAdmin(adminId)
  if (!admin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  // ✅ 지역별 권한 확인 (필요 시)
  if (admin.role === 'south' || admin.role === 'north') {
    // 지역 검증...
  }

  // 처리...
}
```

---

## 🔒 보안 체크리스트

### 필수 사항 ✅

- [ ] **환경 변수 보호**
  ```env
  # .env.local (절대 커밋하지 않음)
  NEXT_PUBLIC_SUPABASE_URL=your_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # 서버 전용
  ```

- [ ] **API 키 노출 방지**
  - ✅ 클라이언트에서 Service Role Key 사용 금지
  - ✅ API Route에서만 Service Role Key 사용
  - ✅ 모든 민감한 작업은 서버 사이드에서 처리

- [ ] **세션 관리**
  - ✅ 세션 토큰 안전하게 저장 (httpOnly 쿠키 권장)
  - ✅ 세션 만료 시간 설정
  - ✅ 로그아웃 시 세션 무효화

- [ ] **입력 검증**
  - ✅ 모든 사용자 입력 검증 (Zod 사용 중)
  - ✅ SQL Injection 방지 (Supabase SDK 사용으로 안전)
  - ✅ XSS 방지 (React의 기본 이스케이핑)

- [ ] **권한 검증**
  - ✅ 모든 API 엔드포인트에서 인증 확인
  - ✅ 관리자 작업 시 역할 확인
  - ✅ 지역별 관리자는 본인 지역만 접근

### 권장 사항 💡

- [ ] **비밀번호 해싱 개선**
  ```typescript
  // 현재: btoa (Base64 인코딩 - 약함)
  const hash = btoa(password + 'salt')

  // 권장: bcrypt (강력한 해싱)
  import bcrypt from 'bcrypt'
  const hash = await bcrypt.hash(password, 10)
  ```

- [ ] **Rate Limiting 추가**
  ```typescript
  // 로그인 시도 제한
  // 예: 5분에 5회 실패 시 계정 잠금
  ```

- [ ] **로깅 및 모니터링**
  ```typescript
  // 중요 작업 로그 기록
  console.log('[ADMIN_ACTION]', { adminId, action, timestamp })
  ```

- [ ] **HTTPS 강제**
  ```typescript
  // Vercel에서 자동으로 처리됨
  ```

---

## 🚀 향후 마이그레이션

### Supabase Auth로 마이그레이션 시

#### 1단계: 데이터 마이그레이션
```sql
-- 기존 users 테이블 → Supabase auth.users
INSERT INTO auth.users (id, email, encrypted_password, ...)
SELECT id, email, password_hash, ...
FROM users;
```

#### 2단계: RLS 활성화
```bash
# complete-rls-policies.sql의 Part B 주석 해제 후 실행
```

#### 3단계: 애플리케이션 코드 수정
```typescript
// Before (커스텀 인증)
const { data } = await supabase
  .from('users')
  .select()
  .eq('organization_name', orgName)
  .single()

// After (Supabase Auth)
const { data } = await supabase.auth.signInWithPassword({
  email: orgName + '@sportsbox.com',
  password: password
})
```

#### 4단계: 테스트
- [ ] 로그인/로그아웃 테스트
- [ ] 권한별 데이터 접근 테스트
- [ ] RLS 정책 동작 확인

---

## 📊 데이터베이스 테이블별 권한 요약

| 테이블 | 사용자 | South/North Admin | Super Admin |
|--------|--------|-------------------|-------------|
| **users** | 본인 조회/수정 | 본인 지역 조회/수정 | 전체 조회/수정 |
| **reservations** | 본인 조회/생성/취소 | 본인 지역 조회/승인/취소 | 전체 조회/승인/취소 |
| **announcements** | 본인 지역 조회 | 본인 지역 관리 | 전체 관리 |
| **reservation_settings** | 조회만 | 본인 지역 수정 | 전체 수정 |
| **blocked_dates** | 조회만 | 본인 지역 수정 | 전체 수정 |
| **cities/regions** | 조회만 | 조회만 | 전체 관리 |
| **homepage_popups** | 활성화된 것만 | 전체 관리 | 전체 관리 |

---

## 💬 자주 묻는 질문

### Q1: RLS를 비활성화해도 안전한가요?
**A**: 애플리케이션 코드에서 권한 체크를 철저히 하면 안전합니다. 하지만 다음을 반드시 지켜야 합니다:
- Service Role Key를 절대 클라이언트에 노출하지 않기
- 모든 API 엔드포인트에서 인증 확인
- 민감한 작업은 서버 사이드에서만 처리

### Q2: 언제 RLS를 활성화해야 하나요?
**A**: Supabase Auth로 마이그레이션할 때 활성화하세요. 그 전까지는 비활성화 상태가 더 간단하고 효율적입니다.

### Q3: 현재 시스템의 보안 위험은?
**A**:
- ⚠️ **비밀번호 해싱**: btoa는 약한 인코딩 → bcrypt로 개선 권장
- ⚠️ **Service Role Key**: 안전하게 관리 필요
- ✅ **애플리케이션 권한 체크**: 현재 잘 구현되어 있음

### Q4: 프로덕션 배포 전 체크사항은?
**A**:
1. `disable-all-rls.sql` 실행하여 RLS 완전 비활성화
2. 환경 변수 안전하게 설정 (Vercel Secrets)
3. API 엔드포인트 권한 체크 확인
4. 비밀번호 해싱 개선 고려 (bcrypt)
5. Rate Limiting 추가 고려

---

## 📞 지원

문제가 발생하면:
1. Supabase Dashboard → SQL Editor에서 RLS 상태 확인
2. 애플리케이션 로그 확인
3. `disable-all-rls.sql` 재실행

---

**마지막 업데이트**: 2026-01-07
**버전**: 1.0.0
