# ChronicDocs - Asynchronous Doctor's Note Service Platform

## Overview

This is a white-label asynchronous doctor's note purchasing service with a 4-tier user hierarchy. The platform handles patient applications, doctor review/approval, automated document generation, payments, messaging, and workflow automation. Built as a full-stack TypeScript application with React frontend, Express backend, and Firebase Firestore for data storage.

The core workflow follows: Registration → Package Selection → Payment → Form Auto-Fill → Doctor Review/Approval → Auto-Document Generation → Completion.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled with Vite
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query v5) for server state
- **UI Components**: shadcn/ui with Radix UI primitives and Tailwind CSS
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Code Splitting**: Lazy-loaded pages with React.lazy() and Suspense

The frontend uses a context-based architecture:
- `AuthContext` - User authentication state and methods
- `ConfigContext` - White-label configuration (site name, colors, role names)
- `ThemeProvider` - Dark/light theme management

Path aliases are configured: `@/` for client/src, `@shared/` for shared code, `@assets/` for attached assets.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Firebase Auth (Bearer token) + bcrypt password hashing
- **Email Service**: SendGrid (`@sendgrid/mail`) for transactional emails (`server/email.ts`)
- **API Pattern**: RESTful endpoints under `/api/` prefix

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Migrations**: Drizzle Kit with `db:push` command for schema sync
- **Validation**: Zod schemas generated from Drizzle schemas via drizzle-zod

### User Hierarchy (4 Levels)
1. **Level 1 - Patient**: End users who purchase doctor's notes and submit applications
2. **Level 2 - Doctor**: Reviews applications, approves/denies, handles work queue (merged from old Reviewer+Agent)
3. **Level 3 - Admin**: Manage users, packages, verification queue, and system settings
4. **Level 4 - Owner**: Full platform control, white-label configuration

Role names are configurable per deployment via the `siteConfig` table.

### Key Data Models
- `users` - All platform users with role levels
- `packages` - Service offerings with pricing
- `applications` - User applications linked to packages
- `applicationSteps` - Workflow step tracking
- `documents` - File uploads and document management
- `messages` - Internal messaging system
- `payments` - Payment records
- `commissions` - Referral/agent commission tracking
- `notifications` - User notifications
- `activityLogs` - Audit trail
- `siteConfig` - White-label customization
- `doctorProfiles` - Doctor credentials (license, NPI, DEA, phone, fax, address, specialty)
- `autoMessageTriggers` - Automated messages triggered on application status changes

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: Vite builds to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Bundling Strategy**: Server dependencies in allowlist are bundled to reduce cold start times

## External Dependencies

### Database
- **Firebase Firestore**: Primary data store via Firebase Admin SDK
- **Connection**: Firebase service account key via `FIREBASE_SERVICE_ACCOUNT_KEY` secret

### Frontend Libraries
- **UI Framework**: shadcn/ui (Radix UI + Tailwind)
- **Forms**: react-hook-form with @hookform/resolvers and Zod
- **Date Handling**: date-fns
- **Charts**: Recharts (via shadcn chart component)

### Backend Libraries
- **Authentication**: bcryptjs for password hashing, Firebase Admin SDK for token verification
- **Email**: @sendgrid/mail for transactional emails (doctor approval, admin notification, patient approval)
- **File Uploads**: multer for multipart form data (gallery image uploads stored in Firebase Storage)

### Development Tools
- **Replit Plugins**: @replit/vite-plugin-runtime-error-modal, cartographer, dev-banner
- **TypeScript**: Strict mode with module bundler resolution

### Environment Variables Required
- `FIREBASE_SERVICE_ACCOUNT_KEY` - Firebase service account JSON (required)
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_PROJECT_ID` - Firebase client config
- `SENDGRID_API_KEY` - SendGrid API key for transactional emails (optional, emails skipped if not set)
- `SENDGRID_FROM_EMAIL` - From email address for SendGrid (defaults to noreply@ineedadrnote.com)

## Current Implementation Status

### Completed Features
- **Authentication**: Firebase Auth (Bearer token) + bcrypt password hashing (no sessions)
- **Extended Registration**: Full registration form collecting personal info, address, medical info, and 4 required consent checkboxes
- **Profile Management**: Self-service profile page (`/dashboard/applicant/registration`) with completeness tracking (green/amber banners)
- **Profile Gate**: NewApplication blocks access until profile is complete (12 required fields + consents)
- **Auto-Fill Application**: Profile data auto-fills into application formData so doctors see everything
- **Auto-Send to Doctor**: Applications automatically assigned to doctors via round-robin on submission
- **SendGrid Email Notifications**: Doctor approval email, admin notification email, patient approval email
- **Package Custom Fields**: Admin can define per-package custom form fields (text, textarea, select, date, etc.)
- **Admin Notification Email**: Configurable admin email that receives copies of all approval requests
- **4 Role-Based Dashboards**: Each with unique stats, actions, and navigation
- **Doctor Review Token System**: Secure token-based async doctor review via email links
- **Owner Configuration**: Full white-label settings (branding, role names, contact info, hero, gallery)
- **Admin User Management**: Search, filter, and edit user levels/status
- **Dark/Light Theme**: System-aware with manual toggle

### Application Processing Workflow (Fully Automated)

The complete end-to-end workflow:

1. Patient registers with full profile (personal info, address, medical info, 4 consents)
2. Patient selects note type (package) → fills reason + package-specific custom fields
3. On submit with `autoSendToDoctor: true`:
   - Round-robin picks next active doctor from `doctorProfiles`
   - Creates 32-byte token with 7-day expiry
   - Sets application status to `doctor_review`
   - Sends email to assigned doctor with "Review & Approve" button
   - Sends email to admin notification email (if configured) with same approve button
4. Doctor opens review link (no login required), reviews patient data, approves or denies
   - If **approved** → Auto-generates document, sends patient email + in-app notification (status: `doctor_approved`)
   - If **denied** → Sends in-app notification with reason (status: `doctor_denied`)
5. Admin can also manually trigger "Send to Doctor" from orders page (sends same emails)

**Application Status Values:**
- `pending` - New application, awaiting admin action
- `doctor_review` - Sent to doctor, awaiting review via token link
- `doctor_approved` - Approved by doctor, documents auto-generated
- `doctor_denied` - Denied by doctor
- `completed` - Fully completed
- `rejected` - Application rejected

### Doctor Review Token System
- **Token Generation**: 32-byte cryptographic random tokens, 7-day expiry
- **Public Portal**: `/review/:token` - doctors review without login, token IS the auth
- **Round-Robin Assignment**: Auto-assigns to next active doctor based on adminSettings.lastAssignedDoctorId
- **Admin Workflow**: "Send to Doctor" button on Orders page generates token and shows copyable review link
- **Auto-Complete Pipeline**: Doctor approval triggers document generation and auto-message triggers
- **Security**: Single-use tokens, expiry enforcement, status checks on GET and POST endpoints
- **Firestore Collection**: `doctorReviewTokens` stores token records with applicationId, doctorId, status, expiresAt

### API Endpoints
- `POST /api/auth/register` - User registration (extended: all profile fields + consents)
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `GET /api/profile` - Get user profile (authenticated)
- `PUT /api/profile` - Update user profile (authenticated)
- `GET /api/config` - Get site configuration
- `GET /api/packages` - List active packages
- `GET /api/applications` - Get user's applications
- `POST /api/applications` - Create new application (supports `autoSendToDoctor` flag)
- `GET /api/admin/settings` - Get admin settings (Level 3+)
- `PUT /api/admin/settings` - Update admin settings (Level 3+)
- `GET /api/doctors` - List active doctors (Level 3+)
- `GET /api/doctors/stats` - Get doctor review stats (Level 2+)
- `POST /api/admin/applications/:id/send-to-doctor` - Send application to doctor for review with emails (Level 3+)
- `GET /api/review/:token` - Get review data by token (public, no auth)
- `POST /api/review/:token/decision` - Submit doctor decision + trigger emails (public, no auth, token is auth)
- `GET /api/commissions` - Get commissions (Level 2+)
- `GET /api/admin/users` - List all users (Level 4+)
- `PUT /api/admin/users/:id` - Update user (Level 4+)
- `GET /api/admin/applications` - List all applications (Level 3+)
- `PUT /api/owner/config` - Update site config (Level 4)

### Key Routes
- `/` - Landing page
- `/login`, `/register` - Authentication
- `/packages` - Service packages listing
- `/review/:token` - Public doctor review portal (no login required)
- `/dashboard/applicant` - Patient dashboard
- `/dashboard/applicant/applications/new` - New application wizard
- `/dashboard/doctor` - Doctor dashboard with review stats
- `/dashboard/admin` - Admin dashboard
- `/dashboard/admin/applications` - Orders management with "Send to Doctor"
- `/dashboard/admin/users` - User management
- `/dashboard/owner` - Owner dashboard
- `/dashboard/owner/site-settings` - White-label configuration