# 경기도체육회 스포츠박스 예약시스템

경기도 전 지역을 대상으로 하는 스포츠박스 프로그램 온라인 예약 시스템입니다.

## 🏆 주요 기능

### 사용자 기능
- **회원가입/로그인**: 단체명 기반 회원가입, 지역별 자동 분류
- **달력 예약**: 실시간 예약 현황 확인 및 날짜 선택
- **예약 관리**: 월 4일 제한, 하루 2타임까지 예약 가능
- **예약 현황**: 승인대기, 승인완료, 취소 등 상태 확인

### 관리자 기능
- **회원 승인**: 가입 대기 회원 승인/거부
- **예약 관리**: 예약 승인/거부, 강제 취소
- **설정 관리**: 월별 예약 설정, 예약 불가일 지정
- **지역별 관리**: 경기남부/북부 구분 관리

## 🛠 기술 스택

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)  
- **Authentication**: Supabase Auth
- **UI Components**: Lucide React Icons, React Calendar
- **Form Handling**: React Hook Form + Zod
- **Deployment**: Vercel

## 👤 테스트 계정

### 일반 사용자
- **아이디**: 테스트단체
- **비밀번호**: 1234

### 관리자 계정
- **전체 관리자**: admin / admin123
- **남부 관리자**: admin_south / admin123  
- **북부 관리자**: admin_north / admin123

## 🚀 개발 서버 실행

```bash
npm install
npm run dev
```

서버 실행 후 http://localhost:3000 에서 확인하세요.

---

© 2024 경기도체육회. All rights reserved.
