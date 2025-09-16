# 🔔 공지사항 시스템 구현 가이드

스포츠박스 예약시스템에 공지사항 기능을 추가하는 완전한 가이드입니다.

## 📋 구현 완료 항목

### ✅ 데이터베이스 스키마
- **announcements** 테이블: 공지사항 기본 정보
- **announcement_views** 테이블: 조회 기록 (중복 방지)
- **admin_users** 테이블: 관리자 정보 (필요시 추가)
- RLS (Row Level Security) 정책 설정
- 인덱스 최적화

### ✅ API 함수 (lib/supabase.ts)
- `announcementAPI`: 완전한 CRUD 기능
- 지역별 필터링 로직
- 조회수 증가 기능
- 권한별 접근 제어

### ✅ 사용자 인터페이스
- **공지사항 목록 페이지** (`/announcements`)
- **관리자 관리 페이지** (`/admin/announcements`)
- **재사용 가능한 컴포넌트들**

### ✅ 핵심 기능
- 전체/지역별 공지 구분
- 중요 공지 우선 표시
- 실시간 조회수 카운팅
- 현대적이고 반응형 UI 디자인

---

## 🚀 설치 및 설정 단계

### 1. 데이터베이스 설정

```sql
-- 1단계: announcements-schema.sql 실행
-- Supabase Dashboard > SQL Editor에서 실행

-- 2단계: increment_view_count.sql 실행  
-- 조회수 증가 함수 생성
```

### 2. 관리자 계정 설정

```sql
-- admin_users 테이블에 관리자 계정 추가
INSERT INTO admin_users (username, password_hash, role, region_id) VALUES
('admin', 'YWRtaW4xMjNzcG9ydHNib3hfc2FsdA==', 'super', NULL),
('admin_south', 'YWRtaW4xMjNzcG9ydHNib3hfc2FsdA==', 'south', 1),
('admin_north', 'YWRtaW4xMjNzcG9ydHNib3hfc2FsdA==', 'north', 2);
```

### 3. 파일 구조 확인

```
src/
├── app/
│   ├── announcements/
│   │   └── page.tsx              # 사용자 공지사항 페이지
│   └── admin/
│       └── announcements/
│           └── page.tsx          # 관리자 공지사항 관리
├── components/
│   ├── AnnouncementCard.tsx      # 공지사항 카드 컴포넌트
│   └── AnnouncementSection.tsx   # 공지사항 섹션 (대시보드용)
└── lib/
    └── supabase.ts               # API 함수 추가됨
```

### 4. 네비게이션 추가

기존 네비게이션에 공지사항 링크 추가:

```tsx
// layout.tsx 또는 네비게이션 컴포넌트에 추가
<Link href="/announcements">
  <Bell className="w-4 h-4" />
  공지사항
</Link>

// 관리자 네비게이션에 추가
<Link href="/admin/announcements">
  <Settings className="w-4 h-4" />
  공지사항 관리
</Link>
```

### 5. 대시보드에 공지사항 섹션 추가

```tsx
// src/app/dashboard/page.tsx
import AnnouncementSection from '@/components/AnnouncementSection'

export default function Dashboard() {
  // 현재 사용자 ID 가져오기
  const userId = 'current-user-id' // 실제 구현 필요
  
  return (
    <div className="space-y-6">
      {/* 기존 대시보드 컨텐츠 */}
      
      {/* 공지사항 섹션 추가 */}
      <AnnouncementSection 
        userId={userId}
        maxItems={5}
        className="col-span-full"
      />
    </div>
  )
}
```

---

## 🎨 디자인 특징

### 현대적 UI 디자인
- **카드 기반 레이아웃**: 깔끔하고 읽기 쉬운 구조
- **중요도 뱃지**: 시각적 우선순위 표시
- **반응형 디자인**: 모든 디바이스에서 최적화
- **부드러운 애니메이션**: hover 효과와 전환

### 색상 체계
- **중요 공지**: 빨간색 테마 (danger)
- **전체 공지**: 파란색 테마 (primary)  
- **지역 공지**: 초록색 테마 (success)
- **비공개**: 회색 테마 (muted)

### 아이콘 시스템
- **Bell**: 공지사항 메인 아이콘
- **AlertCircle**: 중요 공지 표시
- **Users**: 전체 공지 표시
- **MapPin**: 지역별 공지 표시
- **Eye**: 조회수 표시
- **Calendar**: 날짜 표시

---

## 🔧 커스터마이징 가이드

### 권한 시스템 수정
```typescript
// lib/supabase.ts에서 권한 로직 수정
export const announcementAPI = {
  async getAnnouncementsForAdmin(adminRole: string, adminRegionId?: number) {
    // 권한별 접근 제어 로직 커스터마이징
  }
}
```

### UI 테마 변경
```css
/* globals.css에서 색상 변경 */
.announcement-important {
  @apply ring-red-100 border-red-200;
}

.announcement-badge-important {
  @apply bg-red-100 text-red-800;
}
```

### 추가 필드 구현
```sql
-- 공지사항 카테고리 추가
ALTER TABLE announcements ADD COLUMN category VARCHAR(50);

-- 첨부파일 지원
CREATE TABLE announcement_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES announcements(id),
  filename VARCHAR(255),
  file_url TEXT,
  file_size INTEGER
);
```

---

## 🔒 보안 고려사항

### Row Level Security (RLS)
- ✅ 사용자는 본인 지역 공지만 조회 가능
- ✅ 관리자는 권한 범위 내에서만 관리 가능
- ✅ 비공개 공지사항 접근 제한

### 입력 검증
```typescript
// 클라이언트 사이드 검증
const validateAnnouncement = (data: AnnouncementFormData) => {
  if (!data.title.trim()) throw new Error('제목은 필수입니다')
  if (data.title.length > 200) throw new Error('제목이 너무 깁니다')
  if (!data.content.trim()) throw new Error('내용은 필수입니다')
}
```

### XSS 방지
- `dangerouslySetInnerHTML` 사용 금지
- 사용자 입력 내용 이스케이프 처리
- CSP 헤더 설정 권장

---

## 📊 성능 최적화

### 데이터베이스 최적화
```sql
-- 인덱스 추가 (이미 스키마에 포함)
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX idx_announcements_important ON announcements(is_important);
```

### 프론트엔드 최적화
- **무한 스크롤**: 대량의 공지사항 처리
- **가상화**: 리스트 렌더링 최적화
- **캐싱**: React Query/SWR 사용 권장

---

## 🧪 테스트 가이드

### 테스트 시나리오
1. **권한 테스트**
   - Super admin: 모든 기능 접근
   - 지역 관리자: 해당 지역만 관리
   - 일반 사용자: 읽기 전용

2. **기능 테스트**
   - 중요 공지 우선 표시
   - 지역별 필터링 정상 작동
   - 조회수 중복 방지

3. **UI/UX 테스트**
   - 반응형 디자인 확인
   - 접근성 (스크린 리더 호환성)
   - 브라우저 호환성

### 테스트 데이터
```sql
-- 테스트 공지사항 추가
INSERT INTO announcements (title, content, author_id, target_type, is_important) VALUES
('🚨 중요 공지: 시스템 점검 안내', '내일 오후 2시부터 4시까지 시스템 점검이 있습니다.', 'admin-id', 'all', true),
('경기남부 지역 프로그램 변경 안내', '경기남부 지역의 10월 프로그램 일정이 변경되었습니다.', 'admin-id', 'region', false);
```

---

## 🚀 배포 체크리스트

### 배포 전 확인사항
- [ ] 데이터베이스 스키마 마이그레이션
- [ ] RLS 정책 적용 확인
- [ ] 관리자 계정 생성
- [ ] 환경 변수 설정
- [ ] 권한 테스트 완료

### 배포 후 확인사항
- [ ] 공지사항 목록 정상 로드
- [ ] 관리자 CRUD 기능 정상 작동
- [ ] 지역별 필터링 작동
- [ ] 중요 공지 우선 표시
- [ ] 조회수 증가 기능 정상 작동

---

## 📞 지원 및 문의

구현 중 문제가 발생하면 다음 사항을 확인하세요:

1. **데이터베이스 연결**: Supabase 연결 상태 확인
2. **권한 설정**: RLS 정책 적용 여부 확인  
3. **환경 변수**: `.env.local` 파일 설정 확인
4. **콘솔 오류**: 브라우저 개발자 도구에서 오류 메시지 확인

성공적인 구현을 위해 단계별로 차근차근 진행하세요! 🎉