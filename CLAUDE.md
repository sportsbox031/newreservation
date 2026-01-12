# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sports box reservation system for Gyeonggi-do Sports Association. A Next.js 15 application for online reservation of sports programs across Gyeonggi Province, with regional management (South/North) and admin approval workflows.

## Development Commands

```bash
# Development
npm install          # Install dependencies (run this first)
npm run dev          # Start development server with Turbopack
npm run build        # Build for production with Turbopack
npm run start        # Start production server
npm run lint         # Run ESLint linting

# Development server runs on http://localhost:3000
# Note: Uses Turbopack for faster builds and hot reloading
# If port 3000 is busy, Next.js will automatically use the next available port
```

## Architecture Overview

### Application Structure
- **Next.js 15**: App router with TypeScript, Tailwind CSS v4
- **Authentication**: Custom auth system (organization_name + password)
- **Database**: Supabase (PostgreSQL) with typed schema
- **Regional Logic**: Split between South/North Gyeonggi with separate admin roles

### Key Directories
```
src/
├── app/                 # Next.js App Router pages
│   ├── admin/
│   │   ├── announcements/ # Admin announcement management
│   │   ├── members/     # User approval management
│   │   ├── north/       # North region admin interface
│   │   ├── popups/      # Homepage popup management
│   │   ├── reports/     # Analytics and reporting
│   │   ├── reservations/ # Reservation approval interface
│   │   ├── settings/    # System configuration
│   │   ├── south/       # South region admin interface
│   │   └── page.tsx     # Super admin interface
│   ├── announcements/   # Public announcement display
│   ├── api/
│   │   └── admin/       # API routes for admin operations
│   ├── auth/            # Authentication pages (login/register)
│   ├── dashboard/       # User reservation dashboard
│   ├── globals.css      # Global Tailwind styles
│   ├── layout.tsx       # Root layout component
│   └── page.tsx         # Landing page
├── components/          # Reusable React components
│   ├── AccountManagementModal.tsx # User account management modal
│   ├── AdminNavigation.tsx        # Admin panel navigation
│   ├── AnnouncementCard.tsx       # Announcement display card
│   ├── AnnouncementSection.tsx    # Homepage announcements
│   ├── HomepagePopup.tsx          # Modal popup component
│   └── RichTextEditor.tsx         # Rich text editing component
├── hooks/               # Custom React hooks
├── lib/
│   └── supabase.ts      # Supabase client and centralized API functions
├── middleware/          # Next.js middleware files
└── types/
    └── database.ts      # Generated TypeScript database schema
```

### Database Schema
- **Regional Architecture**: `regions` → `cities` → `users` relationship
- **User Management**: Organization-based accounts with approval workflow
- **Reservation System**: Date-based with time slots, monthly limits (4 days/month, 2 slots/day)
- **Admin Roles**: `super` (all regions), `south`/`north` (regional)
- **Schema Files**: Multiple SQL files for migrations and RLS policies

### API Layer (`lib/supabase.ts`)
Centralized API functions organized by domain (2000+ lines):
- `memberAPI`: Registration, login, approval management, password migration support
- `reservationAPI`: Booking, status management, regional filtering
- `settingsAPI`: Blocked dates, configuration management
- `announcementAPI`: Public announcements with file attachments support
- `popupAPI`: Homepage modal popup management
- `sessionAPI`: Session management with IP/user agent tracking
- `reservationConcurrencyAPI`: Concurrent reservation handling
- `tierAPI`: User tier system management
- `adminAPI`: Admin-specific operations
- `utilityAPI`: Common utility functions (city lookup, session token generation)

### Key Business Rules
- Monthly reservation limit: 4 days per user
- Daily slot limit: 2 time slots per day
- Regional segregation: South/North admin can only manage their region
- Approval workflow: All registrations and reservations require admin approval
- Custom authentication system (not Supabase Auth) using organization_name + password
- Content management: Announcements with file attachments and popups for user communication
- Rich text editing: HTML content support for announcements
- Notification system: Aligo KakaoTalk integration via Fly.io proxy server
- Scheduled tasks: Daily notification cron job configured in Vercel

### Test Accounts
- **User**: 테스트단체 / 1234
- **Super Admin**: admin / admin123
- **Regional**: admin_south / admin123, admin_north / admin123

### Environment Configuration
Required environment variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key for client-side access
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations

### Deployment
- **Platform**: Vercel with automatic deployments
- **Region**: Korea (icn1) specified in `vercel.json`
- **Configuration**: `vercel.json` for deployment settings and cron jobs
- **Environment Variables**: Stored as Vercel secrets (see `vercel.json` for reference)
- **Cron Jobs**: Daily notifications run at 00:00 KST via `/api/cron/daily-notifications`
- **External Services**:
  - Supabase for database
  - Fly.io proxy server for Aligo KakaoTalk notifications
  - Aligo API for SMS/KakaoTalk messaging

### Development Notes
- **Next.js 15**: App Router with TypeScript strict mode and Turbopack for development
- **Tailwind CSS v4**: Latest version with PostCSS configuration
- **ESLint**: Flat config format with Next.js recommended rules
- **Korean Language**: Interface text throughout application
- **Key Dependencies**:
  - React Hook Form + Zod for form validation
  - date-fns for date manipulation
  - react-calendar for date picker UI
  - Lucide React for icons
  - @supabase/ssr for server-side rendering support
- **Path Aliases**: `@/*` maps to `src/*` for cleaner imports

### Security Considerations
- Custom authentication system using bcrypt password hashing (migrated from legacy btoa)
- Session management with UUID tokens stored in localStorage
- Row Level Security (RLS) implemented in database
- Content Security Policy configured in `next.config.ts`
- Legacy password hash support for backward compatibility during migration

## Common Development Patterns

### Database Operations
All database operations centralized in `lib/supabase.ts` with domain-specific APIs:
- Functions return `{ data, error }` format consistent with Supabase patterns
- Regional filtering handled automatically based on user permissions
- City name to ID resolution via `getCityId()` helper function

### Authentication Flow
1. Login via `memberAPI.login()` with organization_name + password
2. Password verification supports both bcrypt (current) and legacy btoa hashes
3. Session token generated (UUID + timestamp) and stored in localStorage
4. Session tracking includes IP address and user agent for security
5. User data stored in component state or passed via props
6. Admin role validation: `super` > `south`/`north` > regular user
7. Regional access control enforced at API level

### Form Handling Pattern
Standard pattern across the application:
```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({ /* validation rules */ })
const form = useForm({ resolver: zodResolver(schema) })
```

### Regional Logic Implementation
- User's region determined by city during registration
- Admin panels filtered by region: `/admin/south/` vs `/admin/north/`
- Database queries include regional filtering where appropriate

### Notification System (`lib/aligo.ts`)
KakaoTalk notification integration via Aligo API:
- **Architecture**: Next.js → Fly.io proxy server → Aligo API
- **Templates**: Predefined message templates for member/reservation approval/rejection
- **Failover**: Automatic SMS fallback when KakaoTalk delivery fails
- **Usage**: Import `sendAligoKakaoTalk()` function with template code and message
- **Scheduled**: Daily notifications for program day reminders via Vercel Cron

### API Routes Structure
```
src/app/api/
├── admin/
│   ├── announcements/
│   │   ├── route.ts           # CRUD operations for announcements
│   │   └── attachments/
│   │       └── route.ts       # File attachment management
│   └── popups/
│       └── route.ts           # Homepage popup management
├── notifications/
│   └── aligo/
│       └── route.ts           # Manual notification testing endpoint
├── cron/
│   └── daily-notifications/
│       └── route.ts           # Scheduled daily notification job
├── test-cron/
│   └── route.ts               # Manual cron job testing
└── check-ip/
    └── route.ts               # IP address checking utility
```

## Debugging and Development Tips

### Database Schema Management
- Multiple SQL files in root directory handle different aspects of the schema
- Key files: `database_setup.sql` (main schema), `quick-setup.sql` (rapid setup)
- RLS policies implemented - check `fix-rls-policies.sql` for policy debugging
- Use Supabase dashboard for real-time data inspection

### Common Issues and Solutions
- **Build Errors**: Check `next.config.ts` - has `ignoreBuildErrors: true` and `ignoreDuringBuilds: true`
- **ESLint Warnings**: Configured as warnings, not errors - see `eslint.config.mjs`
- **Authentication Issues**: Custom auth system bypasses Supabase Auth - debug via `memberAPI.login()`
- **Regional Access**: Ensure user region matches admin panel region for proper data access
- **Password Migration**: System supports both bcrypt and legacy btoa hashes for backward compatibility
- **File Uploads**: Announcements support file attachments via Supabase Storage bucket
- **Notification Failures**: Check Fly.io proxy server status and Aligo API credentials
- **Cron Job Testing**: Use `/api/test-cron` endpoint for manual testing before deployment

### Performance Considerations
- **Turbopack**: Development uses `--turbopack` flag for faster builds
- **API Centralization**: All DB calls centralized in `lib/supabase.ts` - modify functions there
- **Component State**: User data passed via props/state, not global auth context

### Database Development Workflow
1. Modify schema in appropriate `.sql` file
2. Apply changes via Supabase SQL editor
3. Update TypeScript types in `src/types/database.ts` if needed
4. Test with existing test accounts
