# ChronicDocs Frontend Architecture Guide

A comprehensive guide to understanding and developing the ChronicDocs telemedicine platform frontend from scratch.

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Authentication System](#authentication-system)
5. [Routing Architecture](#routing-architecture)
6. [User Roles & Access Levels](#user-roles--access-levels)
7. [Registration Flow](#registration-flow)
8. [Patient Flow](#patient-flow)
9. [Doctor Flow](#doctor-flow)
10. [Agent Flow](#agent-flow)
11. [Admin Flow](#admin-flow)
12. [Owner Flow](#owner-flow)
13. [How Roles Work Together](#how-roles-work-together)
14. [Key Components](#key-components)
15. [State Management](#state-management)
16. [API Communication](#api-communication)
17. [Real-Time Features](#real-time-features)
18. [Video Consultation System](#video-consultation-system)
19. [Voice Call System](#voice-call-system)

---

## Overview

ChronicDocs is a telemedicine platform for medical cannabis recommendations. The frontend is a React single-page application (SPA) that manages the entire workflow from patient registration through document delivery.

**Core Workflow:**
```
Patient Registration → Package Selection → Payment → Doctor Video Consultation → 
Agent Document Processing → Admin Approval → Document Delivery
```

---

## Technology Stack

### Core Framework
- **React 18** with TypeScript
- **Vite** for bundling and development server
- **React Router DOM** for client-side routing

### UI & Styling
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** (Radix UI) for component primitives
- **Lucide React** for icons

### State Management
- **TanStack Query (React Query v5)** for server state and caching
- **React Context** for global app state (auth, video)
- **Local component state** via `useState` for UI state

### Authentication
- **Firebase Authentication** for identity management
- **Firebase ID tokens** for API authorization

### Real-Time Communication
- **Twilio Video SDK** for video consultations
- **Twilio Voice SDK** for phone calls
- **Firestore listeners** for real-time updates

### Forms & Validation
- **React Hook Form** for form management
- **Zod** for schema validation
- **Drizzle-Zod** for database schema integration

---

## Project Structure

```
client/src/
├── App.tsx                 # Main application with routing
├── main.tsx                # Application entry point
├── index.css               # Global styles and Tailwind imports
│
├── components/             # Reusable UI components
│   ├── ui/                 # shadcn/ui primitives (button, card, dialog, etc.)
│   ├── layout/             # Layout components (Header, Footer, AppShell)
│   ├── auth/               # Authentication modals and forms
│   ├── patient/            # Patient-specific components
│   ├── doctor/             # Doctor-specific components
│   ├── agents/             # Agent-specific components
│   ├── admin/              # Admin-specific components
│   ├── patients/           # Shared patient-related components
│   ├── forms/              # Form-related components
│   ├── payment/            # Payment components (Authorize.Net)
│   ├── video/              # Video call components
│   ├── shared/             # Shared components across roles
│   └── home/               # Homepage components
│
├── pages/                  # Page-level components (one per route)
│   ├── Home.tsx            # Landing page
│   ├── Register.tsx        # Patient registration
│   ├── AccountLogin.tsx    # Login page
│   ├── PatientDashboard.tsx
│   ├── DoctorDashboard.tsx
│   ├── AgentDashboard.tsx
│   ├── AdminDashboard.tsx
│   ├── OwnerDashboard.tsx
│   └── ...                 # Other pages
│
├── contexts/               # React Context providers
│   └── AuthContext.tsx     # Authentication state
│
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts          # Authentication hook
│   ├── usePatientQueue.ts  # Patient queue management
│   ├── useTwilioQueue.ts   # Twilio video queue
│   ├── useTwilioIncomingCalls.ts  # Voice call handling
│   ├── usePushNotifications.ts    # Browser notifications
│   └── ...
│
├── services/               # External service integrations
│   ├── authService.ts      # Firebase auth wrapper
│   ├── twilioVideoClient.ts
│   └── firebaseDeviceFallbacks.ts
│
├── lib/                    # Utility libraries
│   ├── firebase.ts         # Firebase configuration
│   ├── queryClient.ts      # TanStack Query setup
│   ├── auth.ts             # Auth utilities
│   ├── analytics.ts        # Google Analytics
│   └── clientErrorLogger.ts
│
└── config/                 # Configuration files
    └── version.ts          # App version
```

---

## Authentication System

### How It Works

Authentication uses a dual-layer approach:

1. **Firebase Authentication**: Handles user identity (email/password)
2. **Backend User Profile**: Stores user data (name, role, etc.)

### AuthContext

Located in `client/src/contexts/AuthContext.tsx`, this is the central authentication provider.

**Key Exports:**
```typescript
interface AuthContextType {
  user: UserData | null;          // Backend user profile
  firebaseUser: User | null;      // Firebase user object
  isLoading: boolean;             // Auth state loading
  isAuthenticated: boolean;       // Quick auth check
  login: (email, password) => Promise<UserData>;
  register: (email, password, profileData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email) => Promise<void>;
  refreshUserData: () => Promise<void>;
}
```

**Usage:**
```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isLoading, logout } = useAuth();
  
  if (isLoading) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  
  return <div>Welcome, {user.firstName}!</div>;
}
```

### Authentication Flow (Detailed)

1. User enters email/password on login page
2. `AuthContext.login()` sets `isLoading = true` and `authActionInProgress.current = true`
3. Calls `authService.signIn()` → Firebase `signInWithEmailAndPassword()`
4. On success, calls `fetchUserData()` with the Firebase user
5. `fetchUserData()` has **retry logic** (max 2 retries):
   - Waits 100ms on first attempt for Firebase auth to stabilize
   - Gets fresh Firebase ID token with `getIdToken(true)` (force refresh)
   - Calls backend `GET /api/auth/me` with `Authorization: Bearer {token}`
   - On 401 or network error, retries with exponential backoff (1 second delay)
6. **Profile validation**: If backend returns no user data, login FAILS and user is signed out
7. Stores user in context state, sets `lastActivityTime` in localStorage
8. After 500ms, resets `authActionInProgress.current = false` to allow useEffect to settle
9. Redirects to appropriate dashboard based on `userLevel`

### Firebase Auth State Listener

The `AuthContext` uses `onAuthStateChanged()` to sync Firebase auth state:

```typescript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // Skip fetching if login/register is in progress (prevents double-fetch)
      if (authActionInProgress.current) return;
      
      const userData = await fetchUserData(firebaseUser);
      if (userData) {
        setUser(userData);
      } else {
        // SECURITY: Sign out if profile is missing/incomplete
        await authService.signOut();
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  });
  return () => unsubscribe();
}, []);
```

### Token Management

- Firebase tokens auto-refresh (1 hour expiry)
- Backend validates token on every API request
- `apiRequest()` in `queryClient.ts` automatically attaches tokens
- **Force refresh**: `getIdToken(true)` is used to ensure fresh tokens during critical operations

---

## Routing Architecture

### App.tsx Structure

The main `App.tsx` handles all routing with React Router DOM and uses **lazy loading** with `Suspense` for code-splitting:

```typescript
// Lazy load pages for code-splitting
const PatientDashboard = lazy(() => import("@/pages/PatientDashboard"));
const DoctorDashboard = lazy(() => import("@/pages/DoctorDashboard"));
// ... more lazy imports

// Page loader fallback for Suspense
function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-teal-500"></div>
    </div>
  );
}

function App() {
  useEffect(() => {
    initGA();  // Initialize Google Analytics on mount
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <CookieConsentBanner />
        <BrowserRouter>
          <AppShell>
            <AppRoutes />
          </AppShell>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
```

### Complete Route List (from App.tsx)

**Public Routes** - No authentication required:
```typescript
// Core public pages
<Route path="/" element={<Home />} />
<Route path="/account-login" element={<AccountLogin />} />
<Route path="/register" element={<Register />} />
<Route path="/reset-password" element={<ResetPassword />} />

// Marketing & SEO pages
<Route path="/pricing" element={<Pricing />} />
<Route path="/about-us" element={<AboutUs />} />
<Route path="/faq" element={<FAQ />} />
<Route path="/guarantee" element={<Guarantee />} />
<Route path="/testimonials" element={<Testimonials />} />
<Route path="/support" element={<Support />} />
<Route path="/contact-support" element={<ContactSupport />} />
<Route path="/verify" element={<VerifyOfficial />} />

// Legal pages
<Route path="/privacy" element={<PrivacyPolicy />} />
<Route path="/terms" element={<TermsAndConditions />} />
<Route path="/sms-consent" element={<SmsConsentProof />} />

// State landing pages (SEO)
<Route path="/states/:stateSlug" element={<StateWelcome />} />
<Route path="/conditions/:conditionSlug" element={<ConditionPage />} />

// Short state aliases (redirect to /states/...)
<Route path="/oklahoma" element={<Navigate to="/states/oklahoma" replace />} />
<Route path="/ok" element={<Navigate to="/states/oklahoma" replace />} />
// ... (all 50 states have short aliases)

// Blog
<Route path="/GizmosBlog" element={<GizmosBlog />} />
<Route path="/GizmosBlog/:slug" element={<GizmosBlog />} />

// Referral/affiliate pages
<Route path="/affiliate" element={<Affiliate />} />
<Route path="/unsubscribe" element={<Unsubscribe />} />
```

**Protected Dashboard Routes** (wrapped in ProtectedRoute):
```typescript
<Route path="/patient-dashboard" element={<ProtectedRoute userLevel={1}><PatientDashboard /></ProtectedRoute>} />
<Route path="/doctor-dashboard" element={<ProtectedRoute userLevel={2}><DoctorDashboard /></ProtectedRoute>} />
<Route path="/agent-dashboard" element={<ProtectedRoute userLevel={3}><AgentDashboard /></ProtectedRoute>} />
<Route path="/admin-dashboard" element={<ProtectedRoute userLevel={4}><AdminDashboard /></ProtectedRoute>} />
<Route path="/owner-dashboard" element={<ProtectedRoute userLevel={5}><OwnerDashboard /></ProtectedRoute>} />
```

**Smart Two-Segment Route** (handles both dashboard URLs and city pages):
```typescript
// This catches routes like /agent/xyz123 OR /oklahoma/tulsa
<Route path="/:segment1/:segment2" element={<SmartTwoSegmentRoute />} />
```

The `SmartTwoSegmentRoute` component checks if segment1 is a user type (patient, doctor, agent, admin, owner). If so, it treats it as a personalized dashboard URL and renders the appropriate dashboard. Otherwise, it treats it as a city landing page (e.g., `/oklahoma/tulsa`).

### ProtectedRoute Component

Handles authentication and authorization with multiple loading states:

```typescript
function ProtectedRoute({ userLevel, children }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, firebaseUser } = useAuth();

  // Show loader while auth is checking
  if (isLoading) return <Loader />;
  
  // Wait if Firebase user exists but local user data not loaded yet
  if (firebaseUser && !user && !isLoading) {
    return <Loader text="Loading user data..." />;
  }
  
  // Redirect to login if not authenticated
  if (!user && !firebaseUser) {
    return <Navigate to="/account-login" replace />;
  }
  
  // Check user has sufficient permission level (higher levels can access lower)
  if (user && Number(user.userLevel) < userLevel) {
    return <Navigate to="/account-login" replace />;
  }
  
  return <>{children}</>;
}
```

### Personalized Dashboard URLs

The app supports personalized URLs for real users:
- `/{userType}/{firebaseUID}` - e.g., `/patient/abc123`, `/agent/xyz789`

The `SmartTwoSegmentRoute` validates that the logged-in user matches the URL. If the URL doesn't match the current user, it redirects to their correct dashboard.

Testing accounts (matching patterns like `patient001`, `Carri003`, etc.) use generic routes like `/patient-dashboard`.

---

## User Roles & Access Levels

| Level | Role | Access |
|-------|------|--------|
| 1 | Patient | Own dashboard, documents, video calls |
| 2 | Doctor | Patient queue, video consultations, approvals |
| 3 | Agent | Assigned patients, document processing, calls |
| 4 | Admin | All patients, staff management, system config |
| 5 | Owner | Everything + analytics, blog, system settings |

**Permission Model:** Higher levels can access lower-level features. A Level 5 Owner can access all Level 1-4 features.

---

## Registration Flow

### Entry Points

1. **Homepage "Get Started"** → `/register`
2. **State landing pages** → `/register?state=XX`
3. **Referral links** → `/{referralCode}` → `/register`
4. **Doctor/Agent invites** → `/register?type=doctor&token=xxx`

### Registration Page (`Register.tsx`)

**Key Features:**
- Fetches available states from backend
- Auto-populates referral codes from URL/session
- Validates all fields with Zod schema
- Handles patient, doctor, and agent registration

**Form Fields:**
```typescript
const registerSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
  firstName: z.string(),
  middleName: z.string().optional(),
  lastName: z.string(),
  phone: z.string(),
  dateOfBirth: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  medicalCondition: z.string(),
  hasMedicare: z.boolean(),
  ssnLast5: z.string().optional(),
  isDisabledVeteran: z.boolean().optional(),
  smsConsent: z.boolean(),
  emailConsent: z.boolean(),
  chargeUnderstanding: z.boolean(),
  portalAuthorization: z.boolean(),
  referralCode: z.string().optional(),
});
```

### Registration Process

```
1. User fills form
2. Frontend validation (Zod)
3. Call AuthContext.register()
4. Backend creates Firebase user
5. Backend creates user profile in Firestore
6. Backend syncs to GoHighLevel CRM
7. Auto-login user
8. Redirect to PatientDashboard
```

---

## Patient Flow

### PatientDashboard Overview

The patient dashboard is a multi-step wizard that guides patients through:

1. **Profile Completion** (Step 1)
2. **Package Selection & Payment** (Step 2)
3. **Doctor Video Consultation** (Step 3)
4. **Document Processing** (Step 4)
5. **Completion & Download** (Step 5)

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Header (Logo, Account Menu, Logout)                         │
├─────────────────────────────────────────────────────────────┤
│ Progress Chart (Step 1-5 visual indicator)                  │
├─────────────────────────────────────────────────────────────┤
│ Tabs: My Dashboard | My Documents | Support | Payment Info  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Current Step Content                                        │
│ (varies by applicationStatus.currentStep)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step-by-Step Breakdown

**Step 1: Profile Completion**
- Edit personal information
- Upload required documents (ID, proof of residency)
- Patient is prompted to complete missing fields

**Step 2: Package Selection & Payment**
- View available packages for their state
- Select package (Basic, Standard, Premium)
- Process payment via Authorize.Net
- Payment confirmation → advances to Step 3

**Step 3: Doctor Video Consultation**
- Patient enters "Virtual Waiting Room"
- Joins Twilio video queue
- Doctor picks up from queue
- Video consultation happens
- Doctor approves/denies → advances to Step 4

**Step 4: Document Processing**
- Agent is assigned to patient
- Agent fills out state-specific PDF forms
- Agent uploads completed documents
- Admin reviews and approves

**Step 5: Completion**
- Patient downloads their recommendation documents
- Process complete

### Key Patient Components

```
PatientDashboard.tsx
├── ApplicationProgressChart.tsx   # Step progress visualization
├── PackageOptions.tsx             # Package selection cards
├── AuthorizeNetCheckout.tsx       # Payment form
├── VirtualWaitingRoom.tsx         # Video queue interface
├── PatientVideoConsultation.tsx   # Active video call
├── DocumentRequirements.tsx       # Required document uploads
├── DocumentList.tsx               # View/download documents
└── ChatInterface.tsx              # Messaging with staff
```

---

## Doctor Flow

### DoctorDashboard Overview

Doctors handle video consultations and patient approvals.

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Header (Notifications, Online Status)                        │
├─────────────────────────────────────────────────────────────┤
│ Tabs: Patient Queue | My Consultations | Approved Patients  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Tab Content                                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Doctor Workflow

1. **Patient Queue Tab**
   - Real-time list of waiting patients (Twilio Queue)
   - Click patient to view details
   - "Start Consultation" button
   
2. **Video Consultation**
   - `EmbeddedVideoConsultation` component loads
   - Two-way video/audio with patient
   - Chat messaging available
   - Access to patient medical history
   
3. **Approve/Deny**
   - After consultation, doctor approves or denies
   - Notes and recommendation recorded
   - Patient advances to Step 4

### Key Doctor Components

```
DoctorDashboard.tsx
├── NewPatientAlert.tsx            # Notification for new patients
├── EmbeddedVideoConsultation.tsx  # Video call interface
└── usePatientQueue.ts             # Real-time queue hook
```

### Queue Management

```typescript
const { 
  waitingPatients,     // Array of patients in queue
  loading,             // Queue loading state
  removePatientFromQueue,
  refreshQueue,
  notificationsEnabled,
  toggleNotifications
} = usePatientQueue(0);  // 0 = doctor role
```

---

## Agent Flow

### AgentDashboard Overview

Agents process patient documents after doctor approval.

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Header (Stats, Commission Info)                              │
├─────────────────────────────────────────────────────────────┤
│ Tabs: Dashboard | Patient Leads | Doctor Approved |         │
│       My Patients | Finalized | Chargebacks                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Tab Content                                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Agent Workflow

1. **Dashboard Tab**
   - Overview stats (patients processed, commissions earned)
   - Quick actions

2. **Patient Leads Tab**
   - Patients assigned to this agent
   - Search by name, phone, email
   - View patient details
   - Initiate phone calls
   
3. **Doctor Approved Tab**
   - Real-time Firestore listener
   - Shows patients just approved by doctors
   - Agent claims patient to start processing
   
4. **My Patients Tab**
   - Patients currently being processed
   - 15-minute timer per patient
   - Upload documents via JotForm integration
   
5. **Finalized Tab**
   - Completed patient records
   - View history and documents

### Key Agent Components

```
AgentDashboard.tsx
├── PatientLeads.tsx              # Lead management with search
├── PatientCommunication.tsx      # SMS/Email to patients
├── VoiceCall.tsx                 # Twilio phone calls
├── JotFormViewer.tsx             # Form embedding
├── ConsultationHandoffs.tsx      # Patient transfers
└── Hooks:
    ├── useDoctorApprovedListener.ts  # Firestore listener for Doctor Approved tab
    ├── useAgentAssignmentListener.ts # Firestore listener for My Patients tab
    └── usePushNotifications.ts       # Browser notifications
```

### Real-Time Listeners

**Doctor Approved Listener** (`hooks/useDoctorApprovedListener.ts`)

Listens for patients that doctors have just approved, making them available for agents to claim:

```typescript
// Only active when on the Doctor Approved tab
useDoctorApprovedListener(
  activeTab === 'doctor-approved',  // Only active when viewing this tab
  firebaseUser?.uid                  // Current agent's UID
);
```

Internally:
- Subscribes to Firestore collection query
- Filters for `applicationStatus.currentStep === 4` AND `agentAssigned === false`
- Automatically removes patients when another agent claims them
- Triggers React Query invalidation to refresh UI

**Agent Assignment Listener** (`hooks/useAgentAssignmentListener.ts`)

Tracks patients assigned to the current agent with timer management:

```typescript
// Only active when on My Patients tab
useAgentAssignmentListener(
  activeTab === 'my-patients',
  firebaseUser?.uid
);
```

Internally:
- Subscribes to patients where `agentFirebaseUid === currentAgentUid`
- Monitors 15-minute assignment timers
- Auto-removes patients when timer expires (returns to Doctor Approved queue)
- Updates UI in real-time when patient status changes

### Voice Call System

```typescript
// VoiceCall.tsx
const initializeDevice = async () => {
  // Get Twilio access token from backend
  const response = await apiRequest('GET', '/api/twilio/access-token');
  const { token } = await response.json();
  
  // Create Twilio Device
  const device = new Device(token, { logLevel: 1 });
  
  // Make outbound call
  const call = await device.connect({
    params: {
      To: patientPhone,
      From: twilioPhoneNumber
    }
  });
};
```

---

## Admin Flow

### AdminDashboard Overview

Admins manage the entire platform.

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Header                                                       │
├─────────────────────────────────────────────────────────────┤
│ Tabs: Dashboard | Patients | Agents | Doctors | Packages |  │
│       Forms | Commission | Settings | Diagnostics           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Tab Content                                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Admin Capabilities

1. **Patient Management**
   - View all patients system-wide
   - Search and filter
   - Unlock workflow steps
   - View patient details
   
2. **Staff Management**
   - View/edit agents and doctors
   - Invite new staff via email
   - Manage state assignments
   
3. **Package Management**
   - Create/edit service packages
   - Set pricing by state
   
4. **Commission Management**
   - View agent earnings
   - Approve commission payments
   
5. **System Configuration**
   - Message scripts
   - Available states
   - QC document templates

### Key Admin Components

```
AdminDashboard.tsx
├── PatientList.tsx               # All patients
├── AgentList.tsx                 # Agent management
├── ServicePackageList.tsx        # Package config
├── PackageCreation.tsx           # New package form
├── CommissionSettings.tsx        # Commission rules
├── AvailableStatesManager.tsx    # State configuration
├── DoctorStateAssignment.tsx     # Doctor-state mapping
├── MessageScriptForm.tsx         # Email/SMS templates
├── StateQCUpload.tsx             # QC document upload
└── DiagnosticsTab.tsx            # System health
```

---

## Owner Flow

### OwnerDashboard Overview

Owners have full system access plus business analytics and content management.

### Additional Owner Features

1. **Analytics Dashboard**
   - Revenue charts
   - Conversion funnels
   - User metrics over time
   
2. **Blog Management**
   - Create/edit blog posts
   - Rich text editor (Quill)
   - SEO metadata
   
3. **Referral System**
   - System-wide referral codes
   - Referral performance dashboard
   
4. **Email Automation**
   - Configure workflow triggers
   - Preview email templates
   
5. **Advanced Settings**
   - Homepage video configuration
   - Terms of Service management

---

## How Roles Work Together

### Complete Patient Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                         PATIENT JOURNEY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PATIENT                                                        │
│  ├─ 1. Registers on website                                     │
│  ├─ 2. Completes profile                                        │
│  ├─ 3. Selects package                                          │
│  ├─ 4. Processes payment                                        │
│  └─ 5. Enters video waiting room ────────────────┐              │
│                                                   │              │
│  DOCTOR                                           ▼              │
│  ├─ Sees patient in queue (real-time) ◄──────────┘              │
│  ├─ Starts video consultation                                   │
│  ├─ Reviews medical history                                     │
│  ├─ Conducts consultation                                       │
│  └─ Approves/Denies ─────────────────────────────┐              │
│                                                   │              │
│  AGENT                                            ▼              │
│  ├─ Sees patient in "Doctor Approved" (real-time)◄─┘            │
│  ├─ Claims patient (15-min timer starts)                        │
│  ├─ Fills out state-specific PDF forms                          │
│  ├─ Uploads completed documents                                 │
│  └─ Submits for approval ────────────────────────┐              │
│                                                   │              │
│  ADMIN                                            ▼              │
│  ├─ Reviews submitted documents ◄────────────────┘              │
│  ├─ QC check                                                    │
│  ├─ Approves patient ─────────────────────────────┐             │
│                                                    │             │
│  PATIENT                                           ▼             │
│  └─ Downloads recommendation documents ◄──────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Real-Time Synchronization

**Firestore Listeners:**
- Doctor sees patients enter queue in real-time
- Agent sees doctor approvals instantly
- Patient sees status updates live

**WebSocket Connections:**
- Video consultations use Twilio Video SDK
- Signaling happens via WebSocket
- Room state synchronized across participants

### Database Synchronization

```
Patient Update
    │
    ├─► Firestore (source of truth)
    │       │
    │       ├─► PatientDashboard (real-time listener)
    │       ├─► DoctorDashboard (queue listener)
    │       └─► AgentDashboard (assignment listener)
    │
    └─► GoHighLevel CRM (async sync)
            │
            └─► Email/SMS automation triggers
```

---

## Key Components

### Layout Components

**AppShell** (`components/layout/AppShell.tsx`)
- Wraps all pages
- Handles responsive layout
- Shows/hides header based on route

**Header** (`components/layout/Header.tsx`)
- Navigation
- User menu
- Login/logout buttons

### Shared Components

**ChatInterface** (`components/shared/ChatInterface.tsx`)
- Messaging between patients and staff
- Real-time updates
- File attachments

**HelpVideosButton** (`components/shared/HelpVideosButton.tsx`)
- Contextual help videos
- Appears on all dashboards

**Logo** (`components/shared/Logo.tsx`)
- Consistent branding across app

### Form Components

**AuthorizeNetCheckout** (`components/payment/AuthorizeNetCheckout.tsx`)
- Credit card payment form
- Uses Accept.js for tokenization
- Handles payment processing

**JotFormViewer** (`components/forms/JotFormViewer.tsx`)
- Embeds JotForm for data collection
- Pre-fills patient information
- Handles form submission

---

## State Management

### Server State (TanStack Query)

```typescript
// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/patients'],
  // Default fetcher handles auth headers automatically
});

// Mutating data
const mutation = useMutation({
  mutationFn: (data) => apiRequest('POST', '/api/patients', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
  }
});
```

### Local State (React State)

```typescript
// UI state
const [activeTab, setActiveTab] = useState('dashboard');
const [selectedPatient, setSelectedPatient] = useState(null);
const [showModal, setShowModal] = useState(false);
```

### Global State (Context)

```typescript
// Auth state is global
const { user, login, logout } = useAuth();

// Video state for consultations
const { room, participants } = useVideo();
```

---

## API Communication

### queryClient Setup

Located in `lib/queryClient.ts`, this configures TanStack Query for the entire app:

**API Request Helper:**
```typescript
// Authenticated API request helper - automatically adds Firebase token
export async function apiRequest(
  method: string,
  url: string,
  body?: any
): Promise<Response> {
  // Get current Firebase user's ID token
  const token = await auth.currentUser?.getIdToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add auth header if user is logged in
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include'  // Include cookies for session
  });
  
  // Handle errors
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }
  
  return response;
}
```

**QueryClient Configuration:**
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default query function - uses first queryKey segment as URL
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        const response = await apiRequest('GET', url);
        return response.json();
      },
      staleTime: 5 * 60 * 1000,        // Data is fresh for 5 minutes
      retry: 2,                         // Retry failed requests twice
      refetchOnWindowFocus: false,      // Don't refetch on tab focus
    }
  }
});
```

### Usage Patterns

**Basic Query (GET):**
```typescript
// Simple fetch - uses default queryFn
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/patients'],
});

// With path parameter - use array for proper cache invalidation
const { data } = useQuery({
  queryKey: ['/api/patients', patientId],
  queryFn: async () => {
    const response = await apiRequest('GET', `/api/patients/${patientId}`);
    return response.json();
  }
});
```

**Mutation (POST/PUT/DELETE):**
```typescript
const mutation = useMutation({
  mutationFn: async (newPatient) => {
    const response = await apiRequest('POST', '/api/patients', newPatient);
    return response.json();
  },
  onSuccess: () => {
    // Invalidate cache to refetch fresh data
    queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
    toast({ title: "Patient created!" });
  },
  onError: (error) => {
    toast({ 
      variant: "destructive",
      title: "Error",
      description: error.message 
    });
  }
});

// Use the mutation
mutation.mutate({ firstName: 'John', lastName: 'Doe' });
```

**Cache Invalidation:**
```typescript
// Invalidate single query
queryClient.invalidateQueries({ queryKey: ['/api/patients'] });

// Invalidate all queries starting with path
queryClient.invalidateQueries({ queryKey: ['/api/patients'], exact: false });

// Invalidate specific patient
queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId] });
```

---

## Real-Time Features

### Firestore Listeners

**Doctor Approved Listener** (`hooks/useDoctorApprovedListener.ts`)
```typescript
useEffect(() => {
  if (!active) return;
  
  const unsubscribe = onSnapshot(
    query(collection(db, 'users'), 
      where('applicationStatus.currentStep', '==', 4),
      where('applicationStatus.agentAssigned', '==', false)
    ),
    (snapshot) => {
      // Update UI with new doctor-approved patients
    }
  );
  
  return () => unsubscribe();
}, [active]);
```

### Push Notifications

**usePushNotifications Hook**
```typescript
const {
  isSupported,        // Browser supports push
  isSubscribed,       // User has enabled notifications
  subscribe,          // Enable notifications
  unsubscribe        // Disable notifications
} = usePushNotifications();
```

---

## Video Consultation System

### Architecture

```
Patient Browser                    Doctor Browser
      │                                  │
      │ getUserMedia()                   │ getUserMedia()
      │     │                            │     │
      ▼     ▼                            ▼     ▼
  ┌─────────────┐                   ┌─────────────┐
  │ Local Video │                   │ Local Video │
  │ Local Audio │                   │ Local Audio │
  └──────┬──────┘                   └──────┬──────┘
         │                                  │
         │ Connect to Room                  │ Connect to Room
         ▼                                  ▼
    ┌─────────────────────────────────────────┐
    │           TWILIO VIDEO ROOM             │
    │                                         │
    │  Room: consultation-{patientUid}        │
    │                                         │
    │  Participants:                          │
    │  - patient-{patientUid}                 │
    │  - doctor-{doctorUid}                   │
    └─────────────────────────────────────────┘
```

### Token Generation

Backend generates Twilio access tokens:
```typescript
// POST /api/twilio-video/generate-token
{
  roomName: "consultation-abc123",
  sessionId: "session-abc123"
}

// Response
{
  accessToken: "eyJ...",
  roomName: "consultation-abc123"
}
```

### Connecting to Room

```typescript
import { connect as twilioConnect } from 'twilio-video';

const room = await twilioConnect(accessToken, {
  name: roomName,
  audio: true,
  video: true,
  preferredVideoCodecs: ['VP8', 'H264']
});

// Handle participants
room.on('participantConnected', (participant) => {
  participant.on('trackSubscribed', (track) => {
    if (track.kind === 'video') {
      track.attach(videoElement);
    }
  });
});
```

---

## Voice Call System

### Architecture

```
Agent Browser                      Patient Phone
      │                                  │
      │ Create Twilio Device             │
      │        │                         │
      ▼        ▼                         │
  ┌─────────────────┐                    │
  │  Twilio Device  │                    │
  │  (Voice SDK)    │                    │
  └────────┬────────┘                    │
           │                             │
           │ device.connect()            │
           ▼                             │
    ┌──────────────────────────────────────┐
    │          TWILIO VOICE SERVICE        │
    │                                      │
    │  Outbound Call:                      │
    │  From: +1-XXX-XXX-XXXX (Company)     │
    │  To: +1-YYY-YYY-YYYY (Patient)  ────┼─────► Patient Phone Rings
    │                                      │
    └──────────────────────────────────────┘
```

### Making Calls

```typescript
// Get access token
const { token } = await apiRequest('GET', '/api/twilio/access-token');

// Create device
const device = new Device(token);

// Make call
const call = await device.connect({
  params: {
    To: patientPhoneNumber,
    From: companyPhoneNumber,
    agentId: agentFirebaseUid
  }
});

// Handle call events
call.on('accept', () => { /* Call connected */ });
call.on('disconnect', () => { /* Call ended */ });
call.on('error', (error) => { /* Handle error */ });
```

---

## Development Tips

### Adding a New Page

1. Create page component in `pages/`
2. Add route in `App.tsx`
3. Use `ProtectedRoute` if authentication required
4. Add navigation link if needed

### Adding a New API Call

```typescript
// In your component
const { data, isLoading } = useQuery({
  queryKey: ['/api/your-endpoint'],
});

const mutation = useMutation({
  mutationFn: (data) => apiRequest('POST', '/api/your-endpoint', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/your-endpoint'] });
    toast({ title: "Success!" });
  }
});
```

### Adding a New Component

1. Create in appropriate `components/` subdirectory
2. Use shadcn/ui primitives where possible
3. Follow existing patterns for styling
4. Export and import where needed

### Testing Authentication

```typescript
// Check current user
const { user, firebaseUser } = useAuth();
console.log('User:', user);
console.log('Firebase User:', firebaseUser);
```

---

## Common Patterns

### Protected API Calls

```typescript
async function callAPI() {
  const token = await firebaseUser.getIdToken();
  const response = await fetch('/api/endpoint', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}
```

### Form with React Hook Form + Zod

```typescript
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { field: '' }
});

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField
        control={form.control}
        name="field"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Field</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button type="submit">Submit</Button>
    </form>
  </Form>
);
```

### Real-Time Updates with Firestore

```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(
    doc(db, 'collection', docId),
    (doc) => {
      setData(doc.data());
    }
  );
  
  return () => unsubscribe();
}, [docId]);
```

---

## Cross-Cutting Concerns

### Google Analytics Integration

Located in `lib/analytics.ts`, analytics is initialized on app mount:

```typescript
// In App.tsx
useEffect(() => {
  if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
    initGA();
  }
}, []);
```

**Key tracking functions:**
```typescript
// Track page views (automatic with router)
trackPageView(path);

// Track referral registrations
trackReferralRegistration(referralCode, agentName, email, codeType);

// Track purchases
trackPurchase(transactionId, amount, currency, items);

// Track checkout initiation
trackBeginCheckout(packageName, amount);

// Track conversion (payment complete)
trackReferralConversion(referralCode, conversionValue, agentName);
```

### Error Logging System

Located in `lib/clientErrorLogger.ts`, this captures and reports frontend errors:

```typescript
import { logClientError } from '@/lib/clientErrorLogger';

try {
  await riskyOperation();
} catch (error) {
  await logClientError({
    errorType: 'api',           // 'api' | 'client' | 'network'
    severity: 'error',          // 'info' | 'warning' | 'error' | 'critical'
    message: 'Operation failed',
    error,                      // The Error object
    context: {                  // Additional context
      operation: 'riskyOperation',
      location: 'MyComponent'
    },
    wasShownToUser: true        // Whether user saw a toast/alert
  }, {
    uid: user?.uid,             // Optional user info
    firstName: user?.firstName,
    email: user?.email
  });
}
```

Errors are sent to `POST /api/error-logs` and stored in Firestore for admin review.

### Cookie Consent Banner

Located in `components/CookieConsentBanner.tsx`, this shows on first visit:

```typescript
// Rendered in App.tsx
<CookieConsentBanner />
```

Features:
- Checks localStorage for prior consent
- Shows banner at bottom of screen
- "Accept" stores consent and enables full analytics
- "Decline" stores preference and limits tracking

### Push Notifications

The `usePushNotifications` hook manages browser push notifications:

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

function DoctorDashboard() {
  const {
    isSupported,    // Browser supports push
    isSubscribed,   // User has enabled push
    isLoading,      // Subscription in progress
    subscribe,      // Enable push notifications
    unsubscribe     // Disable push notifications
  } = usePushNotifications();

  return (
    <Button onClick={isSubscribed ? unsubscribe : subscribe}>
      {isSubscribed ? 'Disable Notifications' : 'Enable Notifications'}
    </Button>
  );
}
```

Used by:
- **Doctors**: New patient in queue alerts
- **Agents**: Doctor-approved patient alerts

### Application Status Tracking

Patients have an `applicationStatus` object that tracks their workflow progress:

```typescript
interface ApplicationStatus {
  currentStep: number;        // 1-5 workflow step
  stepData: {
    step1Complete: boolean;   // Profile completed
    step2Complete: boolean;   // Payment processed
    step3Complete: boolean;   // Doctor approved
    step4Complete: boolean;   // Agent processed
    step5Complete: boolean;   // Documents delivered
  };
  agentAssigned: boolean;     // Has agent claimed patient
  agentFirebaseUid?: string;  // Assigned agent's ID
  doctorApproved: boolean;    // Doctor approval status
  doctorFirebaseUid?: string; // Assigned doctor's ID
}
```

This object is stored in Firestore and drives the patient dashboard UI.

---

## Conclusion

This guide covers the essential architecture of the ChronicDocs frontend. The key takeaways:

1. **React + TypeScript** with Vite for fast development
2. **Firebase Auth** for identity, with backend profile storage
3. **Role-based routing** with ProtectedRoute component
4. **TanStack Query** for server state management
5. **Twilio** for video and voice communication
6. **Firestore listeners** for real-time updates
7. **Multi-role workflow** from patient to admin

For specific implementation details, refer to the individual component files and the inline comments within the codebase.
