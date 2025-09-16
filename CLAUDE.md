# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sports box reservation system for Gyeonggi-do Sports Association. A Next.js application for online reservation of sports programs across Gyeonggi Province, with regional management (South/North) and admin approval workflows.

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
│   ├── AdminNavigation.tsx    # Admin panel navigation
│   ├── AnnouncementCard.tsx   # Announcement display card
│   ├── AnnouncementSection.tsx # Homepage announcements
│   ├── HomepagePopup.tsx      # Modal popup component
│   └── RichTextEditor.tsx     # Rich text editing component
├── lib/
│   └── supabase.ts      # Supabase client and centralized API functions
└── types/
    └── database.ts      # Generated TypeScript database schema
```

### Database Schema
- **Regional Architecture**: `regions` → `cities` → `users` relationship
- **User Management**: Organization-based accounts with approval workflow
- **Reservation System**: Date-based with time slots, monthly limits (4 days/month, 2 slots/day)
- **Admin Roles**: `super` (all regions), `south`/`north` (regional)

### API Layer (`lib/supabase.ts`)
Centralized API functions organized by domain:
- `memberAPI`: Registration, login, approval management
- `reservationAPI`: Booking, status management, regional filtering
- `settingsAPI`: Blocked dates, configuration management
- `announcementAPI`: Public announcements and notifications
- `popupAPI`: Homepage modal popup management

### Key Business Rules
- Monthly reservation limit: 4 days per user
- Daily slot limit: 2 time slots per day  
- Regional segregation: South/North admin can only manage their region
- Approval workflow: All registrations and reservations require admin approval
- Custom authentication system (not Supabase Auth) using organization_name + password
- Simple password hashing (btoa-based) - should be upgraded to bcrypt for production
- Content management: Announcements and popups for user communication
- Rich text editing: HTML content support for announcements

### Test Accounts
- **User**: 테스트단체 / 1234
- **Super Admin**: admin / admin123  
- **Regional**: admin_south / admin123, admin_north / admin123

### Environment Configuration
Required environment variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key for client-side access
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations

Deployment uses Vercel with environment variables stored as secrets.

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
- Custom authentication system with basic password hashing
- **Production TODO**: Replace btoa password hashing with bcrypt
- **Production TODO**: Consider migrating to Supabase Auth for better security
- Row Level Security (RLS) implemented in database