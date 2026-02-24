# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sports box reservation system for Gyeonggi-do Sports Association (경기도체육회). A Next.js 15 application for online reservation of sports programs across Gyeonggi Province, with regional management (South/North) and admin approval workflows.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Development server with Turbopack (localhost:3000)
npm run build        # Production build with Turbopack
npm run start        # Start production server
npm run lint         # Run ESLint
npm run gen:types    # Regenerate Supabase TypeScript types (requires pnpm)
```

## Architecture Overview

### Tech Stack
- **Next.js 15**: App Router with TypeScript, Turbopack
- **Tailwind CSS 3.4**: With PostCSS configuration
- **Database**: Supabase (PostgreSQL) with typed schema
- **Authentication**: Custom system (organization_name + password), NOT Supabase Auth
- **Forms**: React Hook Form + Zod validation
- **Notifications**: Aligo KakaoTalk via Fly.io proxy

### Regional Architecture
The system splits Gyeonggi Province into South/North regions:
- Database: `regions` → `cities` → `users` relationship
- Admin roles: `super` (all access), `south` (South region only), `north` (North region only)
- URL routing: `/admin/south/` vs `/admin/north/` for regional admin panels

### API Layer (`src/lib/supabase.ts`)
Centralized API functions organized by domain (~2000 lines):
- `memberAPI`: Registration, login, approval, password migration (bcrypt + legacy btoa)
- `reservationAPI`: Booking, status management, regional filtering
- `settingsAPI`: Blocked dates, configuration
- `announcementAPI`: Public announcements with file attachments
- `popupAPI`: Homepage modal popup management
- `sessionAPI`: Session tracking with IP/user agent
- `reservationConcurrencyAPI`: Concurrent reservation handling
- `tierAPI`: User tier system (Priority/Standard)

All functions return `{ data, error }` format consistent with Supabase patterns.

### Business Rules
- Monthly reservation limit: 4 days per user
- Daily slot limit: 2 time slots per day (with time range, grade, participant count, location)
- All registrations and reservations require admin approval
- Organization types: `school` (schools) or `welfare` (welfare facilities)
- Tier system: `welfare` organizations get `Priority` tier, `school` gets `Standard`
- Time slots blocked up to 17:00 (5 PM)

### Test Accounts
- **User**: 테스트단체 / 1234
- **Super Admin**: admin / admin123
- **Regional**: admin_south / admin123, admin_north / admin123

### Client-Side Architecture
- **No Next.js middleware** (`src/middleware.ts` does not exist) - all route protection is client-side
- **No global state management** - no Redux, Zustand, or React Context for auth
- Each page independently checks localStorage and validates sessions
- All components are `'use client'` - this is a client-heavy application

### Key Files
- `src/lib/supabase.ts` - All database operations (~2000 lines, the core API layer)
- `src/lib/auth.ts` - Server-side API route auth (Bearer token validation using service role key)
- `src/lib/aligo.ts` - KakaoTalk/SMS notification functions
- `src/lib/fileValidation.ts` - Security-focused file upload validation (whitelist MIME types, 5MB limit)
- `src/hooks/useSessionCheck.ts` - Primary auth hook for user pages
- `src/types/database.ts` - Manually maintained Database interface and type aliases

### Dead Code
- `src/middleware/sessionCheck.ts` is an older unused version of session checking with a broken dynamic `require('react')` pattern. The active version is `src/hooks/useSessionCheck.ts`.

## Key Patterns

### Authentication Flow
1. Login via `memberAPI.login()` with organization_name + password
2. Single login page at `/auth/login` handles both admin and user login - routes to admin login if `organization_name.startsWith('admin')`
3. Password verification: bcrypt (primary) with legacy btoa fallback; silently migrates legacy passwords to bcrypt on successful login
4. Session token (UUID + timestamp) stored in localStorage
5. Multi-login prevention: user login invalidates ALL existing active sessions before creating new one (admins do not have this restriction)
6. Session tracking includes IP address and user agent
7. **No global auth context** - use `useSessionCheck` hook for user pages, check `localStorage.getItem('adminInfo')` for admin pages

### localStorage Keys
- `currentUser` - User session data (user pages)
- `adminInfo` - Admin session data (admin pages)
- `sessionToken` / `session_token` - API bearer token
- `seenPopups` - Homepage popup 24h suppression tracking

### Reservation Slot Structure
Each reservation can have up to 2 time slots:
```typescript
{
  startTime: string,    // HH:MM format
  endTime: string,      // HH:MM format
  grade: string,        // Target grade/group
  participantCount: number,
  location: string      // Program location
}
```

### Concurrency Control
The `reservation_transactions` table and `try_reserve_slot` PostgreSQL function handle race conditions for simultaneous reservations at the database level, not application code.

### Notification System (`src/lib/aligo.ts`)
- Architecture: Next.js → Fly.io proxy (`sportsbox-aligo-proxy.fly.dev`) → Aligo API
- Templates: Member/reservation approval/rejection, program day reminders
- Automatic SMS failover when KakaoTalk delivery fails
- Template codes configured via environment variables

### API Routes (`src/app/api/`)
All admin API routes use `src/lib/auth.ts` `validateApiRequest()` for Bearer token auth:
- `POST/PUT/DELETE /api/admin/announcements` - Announcement CRUD
- `POST /api/admin/announcements/attachments` - File upload
- `POST/PUT/DELETE /api/admin/popups` - Popup management
- `POST /api/notifications/aligo` - KakaoTalk notification proxy
- `GET /api/cron/daily-notifications` - Vercel cron job (protected by `CRON_SECRET`)
- `GET /api/check-ip` - Client IP detection
- `GET /api/test-cron` - Manual cron trigger for testing

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations

Aligo template codes (see `vercel.json` for current values):
- `NEXT_PUBLIC_ALIGO_MEMBER_APPROVAL_TPL_CODE`
- `NEXT_PUBLIC_ALIGO_RESERVATION_APPROVAL_TPL_CODE`
- `NEXT_PUBLIC_ALIGO_MEMBER_REJECTION_TPL_CODE`
- `NEXT_PUBLIC_ALIGO_RESERVATION_REJECTION_TPL_CODE`
- `NEXT_PUBLIC_ALIGO_PROGRAM_DAY_TPL_CODE`

## Database Schema

### Core Tables
- `regions`: South/North Gyeonggi regions
- `cities`: 31 cities mapped to regions
- `users`: Organization accounts with approval status, tier, and organization_type
- `admins`: Admin accounts with role-based access
- `reservations`: Booking records with status workflow (pending → approved/rejected/cancelled)
- `reservation_slots`: Individual time slots within each reservation
- `blocked_dates`: Dates/time ranges when reservations are not allowed
- `announcements`: Public notices with optional file attachments
- `homepage_popups`: Modal popups for homepage

### Key Type Definitions (`src/types/database.ts`)
- Type aliases exported for all tables: `User`, `Reservation`, `ReservationSlot`, etc.
- Reservation statuses: `pending`, `approved`, `cancelled`, `admin_cancelled`, `rejected`, `cancel_requested`
- User statuses: `pending`, `approved`, `rejected`, `suspended`

### Schema Management
Multiple SQL files in root directory - key files:
- `supabase-schema.sql`: Core schema reference
- `database_setup.sql`: Main schema (popups, triggers)
- `complete-rls-policies.sql`: Row Level Security policies

To modify schema:
1. Edit appropriate `.sql` file
2. Apply via Supabase SQL editor
3. Run `npm run gen:types` to update TypeScript types

## Deployment

- **Platform**: Vercel (Korea region: icn1)
- **Cron**: Daily notifications at 00:00 KST via `/api/cron/daily-notifications`
- **External Services**: Supabase, Fly.io proxy, Aligo API

### Database Functions
Key PostgreSQL functions (called via `supabase.rpc()`):
- `try_reserve_slot` - Atomic slot reservation with concurrency safety
- `cancel_reservation_slot` - Atomic slot cancellation
- `get_user_monthly_reservation_count` - Monthly limit checking
- `get_daily_reservation_count` - Daily capacity tracking
- `cleanup_expired_sessions` - Session garbage collection
- `count_announcement_attachments` - Attachment limit enforcement

### Tier System
`welfare` organizations automatically get `Priority` tier, `school` gets `Standard` - set by a database trigger at insert time, not application code.

## Common Issues

- **Build Errors**: `next.config.ts` has both `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` for ESLint - the app can build despite type/lint errors, so always check actual errors
- **Auth Issues**: Custom auth bypasses Supabase Auth entirely - debug via `memberAPI.login()` for users, `adminAPI.login()` for admins
- **Regional Access**: Ensure user region matches admin panel for proper data access
- **Cron Testing**: Use `/api/test-cron` endpoint before deployment
- **Type Generation**: Requires pnpm (`pnpm dlx supabase gen types...`)
- **README Mismatch**: README.md mentions "Supabase Auth" but the app uses a fully custom auth system
