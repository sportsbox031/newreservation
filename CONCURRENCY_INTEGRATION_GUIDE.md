# 동시 접속 제한 & 예약 동시성 제어 통합 가이드

## 🎯 구현된 기능

### 1️⃣ 동시 접속 제한 시스템
- **한 계정 = 한 세션**: 새 로그인 시 기존 세션 자동 종료
- **세션 토큰 관리**: UUID 기반 고유 세션 토큰 생성
- **자동 세션 만료**: 24시간 후 자동 만료, 활동 시 갱신
- **실시간 모니터링**: 5분마다 세션 상태 확인

### 2️⃣ 예약 정원 동시성 제어
- **원자적 예약 처리**: PostgreSQL 함수로 race condition 방지
- **실시간 정원 체크**: 예약 시도 시 즉시 정원 확인
- **트랜잭션 로그**: 모든 예약 시도 기록 및 추적
- **자동 마감 처리**: 정원 초과 시 즉시 마감 처리

## 🛠️ 구현된 컴포넌트

### 데이터베이스 스키마
- ✅ `user_sessions` - 세션 관리
- ✅ `daily_reservations_limit` - 일별 예약 정원
- ✅ `reservation_transactions` - 예약 트랜잭션 로그

### API 함수
- ✅ `sessionAPI` - 세션 관리 (검증, 갱신, 로그아웃)
- ✅ `reservationConcurrencyAPI` - 예약 동시성 제어
- ✅ `memberAPI.login` - 세션 토큰 포함 로그인

### 미들웨어
- ✅ `sessionCheck.ts` - 클라이언트 세션 검증 및 모니터링

## 🚀 통합 단계

### 1단계: 데이터베이스 스키마 적용
```sql
-- session-management-schema.sql 파일 실행
psql -f session-management-schema.sql
```

### 2단계: package.json 의존성 추가
```bash
npm install uuid
npm install @types/uuid --save-dev
```

### 3단계: 기존 예약 API 수정

기존 `reservationAPI.createReservationWithValidation` 함수를 다음과 같이 수정:

```typescript
// 기존 함수를 동시성 제어 버전으로 교체
async createReservationWithValidation(
  userId: string,
  regionId: number,
  date: string,
  timeSlot: string, // 새로운 파라미터
  slots: Array<{...}>
) {
  // 1. 세션 검증
  const sessionToken = localStorage.getItem('session_token')
  if (!sessionToken) {
    return { data: null, error: { message: '로그인이 필요합니다.' } }
  }

  const { data: sessionData } = await sessionAPI.validateSession(sessionToken)
  if (!sessionData) {
    return { data: null, error: { message: '세션이 만료되었습니다.' } }
  }

  // 2. 동시성 제어를 통한 예약 시도
  const { data: reservationResult, error: reservationError } = 
    await reservationConcurrencyAPI.tryReservation(userId, date, timeSlot)

  if (reservationError || !reservationResult.success) {
    return { 
      data: null, 
      error: { 
        message: reservationResult?.message || '예약 처리 중 오류가 발생했습니다.' 
      }
    }
  }

  // 3. 예약 성공 시 기존 로직 실행
  // (reservations, reservation_slots 테이블에 데이터 추가)
  // ...
}
```

### 4단계: 로그인 페이지 수정
✅ 이미 완료됨 - 세션 토큰 저장 로직 추가됨

### 5단계: 대시보드에 세션 모니터링 추가

```typescript
// dashboard/page.tsx
import { useSessionCheck } from '@/middleware/sessionCheck'

export default function Dashboard() {
  const { isAuthenticated, user, isLoading } = useSessionCheck()

  if (isLoading) return <div>로딩 중...</div>
  if (!isAuthenticated) return <div>인증되지 않은 접근입니다.</div>

  return (
    // 기존 대시보드 컴포넌트
  )
}
```

### 6단계: 예약 페이지 개선

```typescript
// 예약 시도 버튼 클릭 시
const handleReservation = async () => {
  const { data: capacityData } = await reservationConcurrencyAPI
    .getReservationCapacity(selectedDate, selectedTimeSlot)

  if (capacityData?.is_full) {
    alert(`선택하신 시간대는 예약이 마감되었습니다. (${capacityData.current_count}/${capacityData.max_capacity})`)
    return
  }

  // 예약 시도
  const result = await reservationAPI.createReservationWithValidation(
    user.id, regionId, selectedDate, selectedTimeSlot, slots
  )

  if (result.error) {
    alert(result.error.message)
  } else {
    alert('예약이 성공적으로 처리되었습니다!')
  }
}
```

## 🔧 관리자 기능

### 예약 정원 설정
```typescript
// 관리자가 일별 예약 정원 설정
await reservationConcurrencyAPI.setReservationCapacity(
  '2024-03-15', // 날짜
  '09:00-12:00', // 시간대
  5 // 최대 정원
)
```

### 실시간 예약 현황 조회
```typescript
// 특정 날짜의 모든 시간대 현황 조회
const { data } = await reservationConcurrencyAPI.getDailyReservationStatus('2024-03-15')
console.log(data) // 시간대별 현재 예약 수 / 최대 정원
```

## 📊 모니터링 및 로깅

### 1. 세션 모니터링
- 활성 세션 수 추적
- 다중 로그인 시도 감지
- 세션 만료 알림

### 2. 예약 트랜잭션 로깅
- 모든 예약 시도 기록
- 실패 원인 추적 (정원 초과, 시스템 오류 등)
- 예약 패턴 분석

### 3. 관리자 대시보드 데이터
```typescript
// 관리자용 통계 조회
const stats = await reservationConcurrencyAPI.getMonthlyReservationStats('2024-03')
// 월별 예약 현황, 인기 시간대, 정원 활용률 등
```

## ⚠️ 주의사항

### 보안
- 세션 토큰은 localStorage에 저장 (httpOnly 쿠키 권장하지만 Next.js 특성상 제한)
- 정기적인 세션 토큰 갱신 (24시간)
- XSS 공격 방지를 위한 입력 검증

### 성능
- 세션 검증은 5분마다만 실행 (너무 빈번한 체크 방지)
- 데이터베이스 연결 풀링 활용
- 예약 정원 조회 시 캐싱 고려

### 사용자 경험
- 세션 만료 시 명확한 안내 메시지
- 예약 마감 시 실시간 피드백
- 다중 로그인 감지 시 선택권 제공

## 🎯 테스트 시나리오

### 동시 접속 제한 테스트
1. 같은 계정으로 여러 브라우저에서 로그인 시도
2. 첫 번째 세션이 자동으로 종료되는지 확인
3. 세션 만료 알림이 정상 작동하는지 확인

### 예약 동시성 테스트
1. 여러 사용자가 동시에 같은 시간대 예약 시도
2. 정원(예: 2명) 초과 시 마감 처리되는지 확인
3. 마감 후 예약 시도 시 적절한 오류 메시지 표시

## 📚 추가 개선 사항

### 향후 개선 계획
- [ ] Redis를 활용한 세션 캐싱
- [ ] 실시간 알림 시스템 (WebSocket)
- [ ] 예약 대기열 시스템
- [ ] 세션 클러스터링 (다중 서버 환경)

이 가이드를 통해 안전하고 안정적인 예약 시스템을 구축할 수 있습니다! 🚀