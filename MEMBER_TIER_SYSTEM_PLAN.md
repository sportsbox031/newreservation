# 회원 우선순위 예약 시스템 설계 문서

## 📋 개요

경기도체육회 스포츠박스 예약시스템에 **회원 티어 기반 일간차 예약 시스템**을 도입하여, 회원 등급에 따라 예약 시작 시간을 차등화하는 기능입니다.

### 🎯 목적
- 회원 등급별 차별화된 서비스 제공
- 예약 경쟁 완화 및 공정한 예약 기회 분배
- 관리자의 유연한 예약 정책 운영
- 회원 충성도 및 만족도 향상

### 💡 핵심 아이디어: 티어별 일간차 예약 티어 시스템

**기존**: 모든 사용자가 동일한 시점에 예약 시작
**개선**: 티어별로 예약 시작 날짜를를 차등화

```
📅 예약 오픈 스케줄 예시:
🥇 Priority → 9월 20일 09:00 예약 시작
🥈 Standard → 9월 21일 09:00 예약 시작  
```

---

## 🏗️ 시스템 아키텍처

### 데이터베이스 스키마 설계

#### 1. 새로운 테이블 추가

**`member_tiers` 테이블**
```sql
CREATE TABLE member_tiers (
  id SERIAL PRIMARY KEY,
  tier_name VARCHAR(50) NOT NULL UNIQUE,           -- Priority, Standard
  tier_level INTEGER NOT NULL,                     -- 1(최고) ~ 2(최저) 우선순위
  description TEXT,                                -- 티어 설명
  monthly_reservation_limit INTEGER DEFAULT 4,     -- 월 예약 한도
  daily_slot_limit INTEGER DEFAULT 2,              -- 일일 슬롯 한도
  advance_reservation_hours INTEGER DEFAULT 0,     -- 일반 오픈보다 몇 시간 먼저
  is_active BOOLEAN DEFAULT true,                  -- 활성 상태
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 기본 티어 데이터 삽입
INSERT INTO member_tiers (tier_name, tier_level, description, advance_reservation_hours) VALUES
('VIP', 1, 'VIP 회원 - 최우선 예약', 72),
('Premium', 2, '프리미엄 회원 - 우선 예약', 48),  
('Standard', 3, '일반 회원', 24),
('Basic', 4, '신규 회원', 0);
```

**`reservation_schedules` 테이블**
```sql
CREATE TABLE reservation_schedules (
  id SERIAL PRIMARY KEY,
  year_month VARCHAR(7) NOT NULL,                  -- YYYY-MM 형식
  tier_id INTEGER REFERENCES member_tiers(id),
  reservation_start_datetime TIMESTAMP NOT NULL,   -- 해당 티어 예약 시작 시간
  reservation_end_datetime TIMESTAMP,              -- 예약 종료 시간 (선택적)
  created_by VARCHAR(255),                         -- 설정한 관리자
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(year_month, tier_id)                      -- 월별 티어당 하나의 스케줄
);
```

#### 2. 기존 테이블 수정

**`users` 테이블에 컬럼 추가**
```sql
ALTER TABLE users ADD COLUMN tier_id INTEGER REFERENCES member_tiers(id);

-- 기본값으로 Standard 티어 설정
UPDATE users SET tier_id = (SELECT id FROM member_tiers WHERE tier_name = 'Standard');
```

---

## 🖥️ 관리자 인터페이스 설계

### 1. 회원 관리 페이지 개선

**기능 추가:**
- ✅ 회원 목록에 현재 티어 표시
- ✅ 개별 회원 티어 변경 (드롭다운)
- ✅ 다중 선택 일괄 티어 변경
- ✅ 티어별 회원 수 통계
- ✅ 티어별 필터링 및 검색

**UI 컴포넌트:**
```tsx
// 회원 목록 테이블에 티어 컬럼 추가
<td>
  <select 
    value={member.tier_id} 
    onChange={(e) => updateMemberTier(member.id, e.target.value)}
  >
    {tiers.map(tier => (
      <option key={tier.id} value={tier.id}>{tier.tier_name}</option>
    ))}
  </select>
</td>
```

### 2. 새로운 "티어 관리" 페이지 (`/admin/tiers`)

**주요 기능:**
- ✅ 티어 생성/편집/삭제
- ✅ 티어별 권한 및 한도 설정
- ✅ 티어 우선순위 조정 (드래그 앤 드롭)
- ✅ 티어별 회원 수 및 예약 통계

**페이지 구조:**
```
/admin/tiers
├── 티어 목록 카드 (생성/편집/삭제)
├── 티어 순서 변경 (드래그 앤 드롭)
├── 티어별 통계 차트
└── 티어 설정 모달
```

### 3. 예약 스케줄 설정 페이지 (`/admin/reservation-schedule`)

**주요 기능:**
- ✅ 월별 티어 예약 시간 설정
- ✅ 캘린더 UI로 직관적 설정
- ✅ 이전 월 설정 복사 (템플릿)
- ✅ 티어별 시각적 타임라인
- ✅ 대량 스케줄 설정 (분기별/연간)

**UI 구성:**
```
📅 2024년 3월 예약 스케줄 설정

🥇 VIP      [2024-02-25] [09:00] 시작
🥈 Premium  [2024-02-25] [14:00] 시작
🥉 Standard [2024-02-26] [09:00] 시작
⚪ Basic    [2024-02-27] [09:00] 시작

[이전 월 복사] [일괄 설정] [저장]
```

---

## 👥 사용자 경험 개선

### 1. 사용자 대시보드 개선

**추가 정보 표시:**
- 🎖️ 현재 회원 티어 배지
- ⏰ 다음 예약 오픈까지 카운트다운
- 📊 티어별 혜택 안내
- 📈 티어 승급 조건 및 진행상황

**대시보드 레이아웃:**
```tsx
<div className="tier-status-card">
  <div className="tier-badge">🥇 VIP 회원</div>
  <div className="next-reservation">
    <h3>다음 예약 오픈</h3>
    <div className="countdown">2일 14시간 30분 후</div>
  </div>
  <div className="tier-benefits">
    <h4>VIP 혜택</h4>
    <ul>
      <li>✅ 3일 먼저 예약 가능</li>
      <li>✅ 월 6회 예약 한도</li>
      <li>✅ 하루 3타임 예약 가능</li>
    </ul>
  </div>
</div>
```

### 2. 예약 페이지 개선

**기능 개선:**
- 🚫 예약 불가 시간대에도 달력 미리보기
- 🔔 예약 오픈 알림 설정 (이메일/SMS)
- ℹ️ 현재 티어의 예약 가능 시간 안내
- ⏰ 실시간 카운트다운 타이머

**예약 불가 상태 UI:**
```tsx
<div className="reservation-closed">
  <h2>🔒 아직 예약 시간이 아닙니다</h2>
  <div className="tier-info">
    <p>현재 티어: <span className="tier-badge">VIP</span></p>
    <p>예약 시작: 2024년 2월 25일 오전 9시</p>
  </div>
  <div className="countdown-timer">
    <div className="time-unit">
      <span className="number">2</span>
      <span className="label">일</span>
    </div>
    <div className="time-unit">
      <span className="number">14</span>
      <span className="label">시간</span>
    </div>
    <div className="time-unit">
      <span className="number">30</span>
      <span className="label">분</span>
    </div>
  </div>
  <button className="notify-btn">예약 오픈 알림 받기</button>
</div>
```

---

## 🔧 비즈니스 로직 구현

### 1. 예약 가능 여부 판단 알고리즘

```typescript
interface User {
  id: string;
  tier: {
    id: number;
    tier_name: string;
    tier_level: number;
    advance_reservation_hours: number;
  };
}

interface ReservationSchedule {
  tier_id: number;
  reservation_start_datetime: Date;
  reservation_end_datetime?: Date;
}

function canUserReserve(user: User, targetDate: Date): {
  canReserve: boolean;
  reason?: string;
  openTime?: Date;
} {
  const yearMonth = format(targetDate, 'yyyy-MM');
  
  // 1. 해당 월의 사용자 티어 예약 스케줄 조회
  const schedule = getReservationSchedule(yearMonth, user.tier.id);
  
  if (!schedule) {
    return {
      canReserve: false,
      reason: '해당 월의 예약 스케줄이 설정되지 않았습니다.'
    };
  }
  
  const now = new Date();
  const reservationStartTime = schedule.reservation_start_datetime;
  
  // 2. 현재 시간과 예약 시작 시간 비교
  if (now < reservationStartTime) {
    return {
      canReserve: false,
      reason: '아직 예약 시간이 아닙니다.',
      openTime: reservationStartTime
    };
  }
  
  // 3. 예약 종료 시간 체크 (설정된 경우)
  if (schedule.reservation_end_datetime && now > schedule.reservation_end_datetime) {
    return {
      canReserve: false,
      reason: '예약 기간이 종료되었습니다.'
    };
  }
  
  return { canReserve: true };
}
```

### 2. 예약 스케줄 관리 API

```typescript
// 월별 예약 스케줄 설정
export const scheduleAPI = {
  // 월별 스케줄 조회
  async getMonthlySchedule(yearMonth: string) {
    const { data, error } = await supabase
      .from('reservation_schedules')
      .select(`
        *,
        member_tiers(tier_name, tier_level)
      `)
      .eq('year_month', yearMonth)
      .order('member_tiers.tier_level');
    
    return { data, error };
  },
  
  // 스케줄 설정/업데이트
  async updateSchedule(schedules: Array<{
    year_month: string;
    tier_id: number;
    reservation_start_datetime: string;
    reservation_end_datetime?: string;
  }>) {
    const { data, error } = await supabase
      .from('reservation_schedules')
      .upsert(schedules, {
        onConflict: 'year_month,tier_id'
      });
    
    return { data, error };
  },
  
  // 이전 월 설정 복사
  async copyFromPreviousMonth(fromYearMonth: string, toYearMonth: string) {
    // 이전 월 스케줄 조회 후 새 월로 복사
    const { data: prevSchedules } = await this.getMonthlySchedule(fromYearMonth);
    
    if (prevSchedules) {
      const newSchedules = prevSchedules.map(schedule => ({
        ...schedule,
        year_month: toYearMonth,
        id: undefined // 새로운 레코드로 생성
      }));
      
      return this.updateSchedule(newSchedules);
    }
    
    return { data: null, error: { message: '이전 월 데이터를 찾을 수 없습니다.' } };
  }
};
```

### 3. 티어 관리 API

```typescript
export const tierAPI = {
  // 모든 티어 조회
  async getAllTiers() {
    const { data, error } = await supabase
      .from('member_tiers')
      .select('*')
      .order('tier_level');
    
    return { data, error };
  },
  
  // 티어 생성
  async createTier(tierData: {
    tier_name: string;
    tier_level: number;
    description?: string;
    monthly_reservation_limit?: number;
    daily_slot_limit?: number;
    advance_reservation_hours?: number;
  }) {
    const { data, error } = await supabase
      .from('member_tiers')
      .insert([tierData])
      .select();
    
    return { data, error };
  },
  
  // 회원 티어 변경
  async updateMemberTier(userId: string, tierId: number) {
    const { data, error } = await supabase
      .from('users')
      .update({ tier_id: tierId })
      .eq('id', userId);
    
    return { data, error };
  },
  
  // 회원 일괄 티어 변경
  async bulkUpdateMemberTiers(userIds: string[], tierId: number) {
    const { data, error } = await supabase
      .from('users')
      .update({ tier_id: tierId })
      .in('id', userIds);
    
    return { data, error };
  }
};
```

---

## 🚀 구현 단계별 로드맵

### Phase 1: MVP (최소 기능 제품) - 2주

**Week 1:**
- [ ] 데이터베이스 스키마 추가 (member_tiers, reservation_schedules)
- [ ] 기존 users 테이블에 tier_id 컬럼 추가
- [ ] 기본 티어 API 구현 (조회, 생성, 수정)
- [ ] 관리자 페이지에 회원 티어 설정 기능 추가

**Week 2:**
- [ ] 예약 가능 여부 판단 로직 구현
- [ ] 사용자 대시보드에 티어 정보 표시
- [ ] 예약 페이지에 시간차 예약 로직 적용
- [ ] 기본적인 카운트다운 UI 구현

**완료 기준:**
- ✅ 관리자가 회원 티어를 설정할 수 있음
- ✅ 티어별로 예약 시작 시간이 다르게 작동
- ✅ 사용자가 자신의 티어와 예약 시간을 확인할 수 있음

### Phase 2: 고급 기능 - 2주

**Week 3:**
- [ ] 티어 관리 전용 페이지 구현 (`/admin/tiers`)
- [ ] 예약 스케줄 설정 페이지 구현 (`/admin/reservation-schedule`)
- [ ] 월별 스케줄 설정 기능
- [ ] 이전 월 설정 복사 기능

**Week 4:**
- [ ] 관리자 통계 대시보드 (티어별 예약 현황)
- [ ] 사용자 예약 페이지 UI/UX 개선
- [ ] 실시간 카운트다운 타이머 구현
- [ ] 기본적인 알림 기능 (예약 오픈 안내)

**완료 기준:**
- ✅ 관리자가 월별로 티어 예약 시간을 설정할 수 있음
- ✅ 사용자에게 직관적인 예약 대기 화면 제공
- ✅ 관리자가 티어별 통계를 확인할 수 있음

### Phase 3: UX 개선 - 1주

**Week 5:**
- [ ] 이메일/SMS 알림 시스템 구현
- [ ] 모바일 반응형 UI 최적화
- [ ] 티어 승급 조건 표시 기능
- [ ] 성능 최적화 및 캐싱 적용

**완료 기준:**
- ✅ 모든 기능이 모바일에서 원활하게 작동
- ✅ 사용자가 예약 오픈 알림을 받을 수 있음
- ✅ 전체 시스템이 안정적으로 운영됨

---

## 🎁 추가 제안 기능 (향후 확장)

### 1. 동적 티어 승급 시스템
```typescript
interface TierUpgradeRule {
  from_tier_id: number;
  to_tier_id: number;
  conditions: {
    min_reservations?: number;        // 최소 예약 횟수
    max_cancellation_rate?: number;   // 최대 취소율
    min_membership_days?: number;     // 최소 가입일수
    admin_approval_required?: boolean; // 관리자 승인 필요
  };
}
```

### 2. 예약 대기열 시스템
- 원하는 시간대가 마감된 경우 대기열 등록
- 취소 발생 시 티어 순서대로 자동 배정
- 대기 순번 및 예상 배정 시간 안내

### 3. 고급 알림 시스템
- 웹 푸시 알림 (PWA)
- 카카오톡 알림 연동
- 개인별 알림 설정 (시간대, 빈도 조절)

### 4. 티어별 추가 혜택
```typescript
interface TierBenefit {
  tier_id: number;
  benefit_type: 'early_reservation' | 'extra_slots' | 'priority_support';
  benefit_value: number;
  description: string;
}
```

---

## 📊 예상 효과 및 KPI

### 긍정적 효과
1. **📈 회원 만족도 향상**: 차별화된 서비스로 회원별 만족도 증가
2. **⚡ 예약 경쟁 완화**: 시간차 오픈으로 서버 부하 분산
3. **🎯 회원 충성도 증가**: 티어 승급 동기 부여
4. **💰 수익 모델 확장**: VIP 서비스를 통한 추가 수익 창출

### 측정 지표 (KPI)
- **회원 만족도**: 설문조사 점수 (목표: 4.5/5.0)
- **예약 성공률**: 티어별 예약 성공률 비교
- **서버 성능**: 예약 오픈 시간대 응답속도 개선율
- **회원 활동도**: 월별 활성 사용자 수 증가율
- **취소율 개선**: 티어별 예약 취소율 비교

---

## ⚠️ 주의사항 및 리스크

### 기술적 리스크
1. **데이터베이스 마이그레이션**: 기존 데이터 무결성 보장
2. **성능 이슈**: 티어별 조건 조회 시 쿼리 최적화 필요
3. **시간대 처리**: 정확한 시간 계산 및 표시

### 운영 리스크
1. **공정성 논란**: 티어 배정 기준의 투명성 확보
2. **복잡성 증가**: 관리자 교육 및 사용자 안내 필요
3. **초기 혼란**: 새 시스템 적응기간 필요

### 완화 방안
- **충분한 테스트**: 단계별 배포 및 검증
- **명확한 안내**: 티어 시스템 가이드 제공
- **피드백 수집**: 사용자 의견을 통한 지속적 개선

---

## 📚 기술 스택 및 의존성

### 추가 필요 라이브러리
```json
{
  "dependencies": {
    "date-fns": "^2.30.0",           // 날짜 처리
    "react-countdown": "^2.3.5",     // 카운트다운 컴포넌트
    "react-beautiful-dnd": "^13.1.1", // 드래그 앤 드롭
    "recharts": "^2.8.0"             // 통계 차트
  }
}
```

### 환경 변수 추가
```env
# 알림 서비스 (선택사항)
NEXT_PUBLIC_NOTIFICATION_API_URL=
NOTIFICATION_API_KEY=

# 이메일 서비스 (선택사항)
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```

---

## 🎯 결론

이 **회원 티어 기반 시간차 예약 시스템**은 기존 스포츠박스 예약시스템의 기능을 크게 향상시킬 수 있는 체계적이고 확장 가능한 솔루션입니다.

**핵심 가치:**
- 🎖️ **차별화된 서비스**: 회원별 맞춤형 예약 경험
- ⚡ **시스템 안정성**: 예약 집중 현상 완화
- 📈 **비즈니스 성장**: 새로운 수익 모델 창출
- 🤝 **사용자 만족**: 공정하고 투명한 예약 시스템

이 문서를 바탕으로 단계적인 개발을 진행하면 성공적인 시스템 구축이 가능할 것입니다.

---

*마지막 업데이트: 2024년 1월*
*작성자: Claude Code AI Assistant*
*프로젝트: 경기도체육회 스포츠박스 예약시스템*