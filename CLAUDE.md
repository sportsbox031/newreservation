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
npm run gen:types    # Regenerate Supabase TypeScript types from database
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

### API Layer (`lib/supabase.ts`)
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
- Daily slot limit: 2 time slots per day
- All registrations and reservations require admin approval
- Users categorized by organization type: `school` or `welfare`
- User tiers: `Priority` (welfare) or `Standard` (school)

### Test Accounts
- **User**: 테스트단체 / 1234
- **Super Admin**: admin / admin123
- **Regional**: admin_south / admin123, admin_north / admin123

## Key Patterns

### Authentication Flow
1. Login via `memberAPI.login()` with organization_name + password
2. Password verification: bcrypt (primary) with legacy btoa fallback
3. Session token (UUID + timestamp) stored in localStorage
4. Session includes IP address and user agent tracking
5. No global auth context - user data passed via props/state

### Form Handling
```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({ /* validation rules */ })
const form = useForm({ resolver: zodResolver(schema) })
```

### Notification System (`lib/aligo.ts`)
- Architecture: Next.js → Fly.io proxy (`sportsbox-aligo-proxy.fly.dev`) → Aligo API
- Templates: Member/reservation approval/rejection, program day reminders
- Automatic SMS failover when KakaoTalk delivery fails
- Template codes configured via environment variables

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations

Aligo template codes (see `vercel.json` for values):
- `NEXT_PUBLIC_ALIGO_MEMBER_APPROVAL_TPL_CODE`
- `NEXT_PUBLIC_ALIGO_RESERVATION_APPROVAL_TPL_CODE`
- `NEXT_PUBLIC_ALIGO_MEMBER_REJECTION_TPL_CODE`
- `NEXT_PUBLIC_ALIGO_RESERVATION_REJECTION_TPL_CODE`
- `NEXT_PUBLIC_ALIGO_PROGRAM_DAY_TPL_CODE`

## Database Schema

### Core Tables
- `regions`: South/North Gyeonggi regions
- `cities`: 31 cities mapped to regions
- `users`: Organization accounts with approval status and tier
- `admins`: Admin accounts with role-based access
- `reservations`: Booking records with status workflow
- `announcements`: Public notices with optional file attachments
- `homepage_popups`: Modal popups for homepage

### Schema Management
Multiple SQL files in root directory - key files:
- `database_setup.sql`: Main schema (popups, triggers)
- `quick-setup.sql`: Rapid setup script
- `supabase-schema.sql`: Core schema reference
- `fix-rls-policies.sql`, `complete-rls-policies.sql`: RLS policy management

To modify schema:
1. Edit appropriate `.sql` file
2. Apply via Supabase SQL editor
3. Run `npm run gen:types` to update TypeScript types

## Deployment

- **Platform**: Vercel (Korea region: icn1)
- **Cron**: Daily notifications at 00:00 KST via `/api/cron/daily-notifications`
- **External Services**: Supabase, Fly.io proxy, Aligo API

## Common Issues

- **Build Errors**: `next.config.ts` has `ignoreBuildErrors: true` - check actual TypeScript errors
- **Auth Issues**: Custom auth bypasses Supabase Auth - debug via `memberAPI.login()`
- **Regional Access**: Ensure user region matches admin panel for proper data access
- **Cron Testing**: Use `/api/test-cron` endpoint before deployment
