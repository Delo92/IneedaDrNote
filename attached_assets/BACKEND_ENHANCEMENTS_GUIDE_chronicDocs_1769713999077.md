# Backend Enhancements Guide - ChronicDocs Telemedicine Platform

This document provides comprehensive documentation of all backend features, patterns, and code in the ChronicDocs telemedicine platform. Use this guide to white-label and replicate these features in another project.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Firebase Collections Structure](#firebase-collections-structure)
3. [User/Authentication System](#userauthentication-system)
4. [Core Features](#core-features)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Key Code Snippets](#key-code-snippets)
7. [Frontend Patterns](#frontend-patterns)
8. [Required Dependencies](#required-dependencies)
9. [Environment Variables](#environment-variables)
10. [Implementation Checklist](#implementation-checklist)

---

## Architecture Overview

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Backend Runtime** | Node.js + Express.js (TypeScript, ES modules) |
| **Frontend** | React 18 + TypeScript + Vite |
| **Database** | Firebase Firestore (NoSQL) + PostgreSQL (via Drizzle ORM) |
| **Authentication** | Firebase Authentication with custom claims |
| **Session Storage** | Redis (production) / MemoryStore (development) |
| **Payment Processing** | Authorize.Net with Accept.js |
| **Email Service** | SendGrid |
| **SMS/Video** | Twilio (Voice SDK, Video SDK) |
| **File Storage** | Firebase Cloud Storage |
| **CRM Integration** | GoHighLevel |
| **State Management** | TanStack Query (React Query v5) |
| **UI Framework** | shadcn/ui (Radix UI) + Tailwind CSS + Material-UI |

### Key File Locations

```
server/
├── index.ts                    # Main server entry point
├── routes.ts                   # Core API routes registration
├── storage.ts                  # Storage interface (Firestore + PostgreSQL)
├── firebase.ts                 # Firebase initialization (lazy loading)
├── auth/
│   └── firebase.ts             # Firebase Admin Auth functions
├── middleware/
│   └── firebase-auth.ts        # Authentication middleware
├── routes/
│   ├── admin.ts                # Admin dashboard routes
│   ├── forms.ts                # Form management routes
│   ├── payment.ts              # Payment processing routes
│   ├── twilioConsultation.ts   # Video consultation routes
│   ├── doctorQueue.ts          # Doctor queue management
│   ├── messages.ts             # Messaging system routes
│   ├── reports.ts              # Analytics and reporting
│   ├── agent-clock.ts          # Agent time tracking
│   └── webhooks.ts             # External webhook handlers
├── services/
│   ├── workflow.ts             # Workflow orchestration
│   ├── twilioQueue.ts          # Video consultation queue
│   ├── email-automation.ts     # Automated email service
│   ├── pushNotifications.ts    # Browser push notifications
│   ├── gohighlevel.ts          # CRM integration
│   ├── errorLogger.ts          # Centralized error logging
│   └── patientProfileSync.ts   # Profile synchronization
└── payment/
    ├── authorizeNet.ts         # Authorize.Net integration
    └── acceptJsAuthNet.ts      # Accept.js tokenization

client/src/
├── contexts/
│   └── AuthContext.tsx         # Firebase auth context
├── hooks/
│   ├── usePushNotifications.ts # Push notification hook
│   └── use-toast.ts            # Toast notifications
├── lib/
│   └── queryClient.ts          # TanStack Query setup
└── components/
    └── layout/
        └── Header.tsx          # Main header with notifications
```

### Design Patterns

1. **Lazy Initialization**: Firebase services initialized on first use to reduce startup time
2. **Dual-Write Pattern**: Firebase as source of truth with PostgreSQL for complex queries
3. **Role-Based Access Control**: Middleware-based route protection with user levels
4. **Real-Time Updates**: Firestore listeners for live data synchronization
5. **Queue Management**: Atomic operations with timeout mechanisms

---

## Firebase Collections Structure

### Core Collections

#### `users` Collection
Primary user data store using Firebase UID as document ID.

```typescript
interface User {
  uid: string;                    // Firebase UID (document ID)
  email: string;                  // User email (lowercase)
  username: string;               // Unique username
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  dateOfBirth: string;            // YYYY-MM-DD format
  address: string;
  city: string;
  state: string;                  // 2-letter state code
  zipCode: string;
  userType: string;               // 'patient' | 'doctor' | 'agent' | 'admin' | 'owner'
  userLevel: number;              // 1=Patient, 2=Doctor, 3=Agent, 4=Admin, 5=Owner
  profileId: string;              // 7-digit unique vanity ID
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  
  // Patient-specific fields
  medicalCondition?: string;
  hasMedicare?: boolean;
  ssnLast5?: string;
  isDisabledVeteran?: boolean;
  
  // Workflow tracking
  currentPackageId?: string;
  currentPackageName?: string;
  currentPackagePrice?: number;
  currentPackageState?: string;
  packagePurchasedAt?: string;
  waitingRoomStatus?: string;
  joinedWaitingRoomAt?: Timestamp;
  
  // Agent referral system
  referralCode?: string;          // Agent's unique referral code
  referredByAgentFirebaseUid?: string;
  
  // Commission tracking
  commissionStatus?: 'pending_approval' | 'approved' | 'paid';
  commissionAmount?: number;
  verifiedBy?: string;            // Agent Firebase UID who submitted
  verifiedAt?: string;
  approvedBy?: string;            // Admin who approved
  approvedAt?: Timestamp;
  
  // Consent flags
  smsConsent?: boolean;
  smsConsentDate?: Timestamp;
  emailConsent?: boolean;
  emailConsentDate?: Timestamp;
  
  // Doctor-specific fields
  licenseNumber?: string;
  npiNumber?: string;
  deaNumber?: string;
  medicalSchool?: string;
  specialty?: string;
  signatureData?: string;         // Base64 signature image
}
```

#### `applicationStatus` Collection
Tracks overall application progress for each patient.

```typescript
interface ApplicationStatus {
  id: string;
  firebaseUid: string;
  activeWorkflowInstanceId?: number;
  currentStep: number;            // Current step (1-6 typically)
  totalSteps: number;             // Total steps in workflow
  status: string;                 // 'pending' | 'in-review' | 'approved' | 'rejected'
  estimatedCompletionDays: number;
  startedAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  completedWorkflows?: CompletedWorkflow[];
}
```

#### `applicationSteps` Collection
Individual step tracking within a workflow.

```typescript
interface ApplicationStep {
  id: string;
  firebaseUid: string;
  workflowInstanceId?: number;
  stepNumber: number;
  name: string;                   // e.g., 'Registration', 'Payment', 'Doctor Approval'
  description?: string;
  status: string;                 // 'pending' | 'in-progress' | 'completed'
  completedAt?: Timestamp;
  stepData?: any;                 // Accumulated step data (package info, etc.)
  
  // Manual override tracking
  manuallyUnlocked?: boolean;
  unlockedBy?: string;
  unlockReason?: string;
  unlockedAt?: Timestamp;
  
  // Progression tracking
  advanceReason?: string;         // 'workflow_progression' | 'payment_received' | 'manual_advance'
  advancedAt?: Timestamp;
  advancedBy?: string;
}
```

#### `queueEntries` Collection
Video consultation queue management.

```typescript
interface QueueEntry {
  id: string;
  firebaseUid: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  state: string;
  packageId: string;
  packageName: string;
  status: string;                 // 'waiting_for_doctor' | 'with_doctor' | 'doctor_approved' | 'with_agent' | 'completed'
  
  // Doctor assignment
  doctorFirebaseUid?: string;
  doctorName?: string;
  doctorJoinedAt?: Timestamp;
  
  // Agent assignment
  agentFirebaseUid?: string;
  agentName?: string;
  agentClaimedAt?: Timestamp;
  
  // Timing
  createdAt: Timestamp;
  joinedWaitingRoomAt: Timestamp;
  consultationStartedAt?: Timestamp;
  consultationEndedAt?: Timestamp;
  
  // Timer management
  timerExpiresAt?: Timestamp;
  autoUnclaimEnabled?: boolean;
}
```

#### `formAssignments` Collection
Tracks form assignments throughout the workflow.

```typescript
interface FormAssignment {
  id: string;
  firebaseUid: string;
  packageId: number;
  templateId: number;
  status: string;                 // 'pending' | 'in_progress' | 'completed'
  workflowPosition: number;
  assignedToFirebaseUid: string;
  jotformSubmissionId?: string;
  doctorSignatureData?: string;
  completedAt?: Timestamp;
  
  // Agent workflow tracking
  waitingStatus?: string;
  waitingAgentFirebaseUid?: string;
  lastUnclaimedAt?: Timestamp;
  lastUnclaimReason?: string;
}
```

#### `payments` Collection
Payment transaction records.

```typescript
interface Payment {
  id: string;
  firebaseUid: string;
  workflowInstanceId?: number;
  packageId: string;
  packageName: string;
  amount: number;                 // In cents
  status: string;                 // 'pending' | 'completed' | 'failed' | 'refunded'
  paymentMethod?: string;
  transactionId?: string;         // Authorize.Net transaction ID
  authCode?: string;
  createdAt: Timestamp;
  
  // Billing info (for Authorize.Net)
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}
```

#### `servicePackages` / `packages` Collection
Available service packages.

```typescript
interface ServicePackage {
  id: string;
  packageId: number;              // Numeric ID (e.g., 50001, 50002)
  name: string;
  description?: string;
  price: number;                  // In cents
  state: string;                  // State code (e.g., 'OK', 'TX')
  requiredDocuments: string[];    // Patient uploads required
  agentRequiredUploads?: string[]; // Agent uploads required
  doctorForms?: DoctorFormConfig[];
  jotFormPreFillConfig?: any;
  isActive: boolean;
  createdAt: Timestamp;
}
```

### Supporting Collections

| Collection | Purpose |
|------------|---------|
| `adminSettings` | System configuration (available states, etc.) |
| `agentQueue` | Agent work queue entries |
| `agentClockRecords` | Agent time tracking records |
| `agentDocuments` | Documents uploaded by agents |
| `approvals` | Doctor approval records |
| `blogPosts` | Blog content management |
| `bulletin` | Dashboard announcements |
| `chargebacks` | Payment dispute tracking |
| `commissionSettings` | Agent commission configuration |
| `consultationHistory` | Video call history |
| `documentStates` | Document upload status tracking |
| `errorLogs` | Centralized error logging |
| `messages` | Internal messaging system |
| `profileNotes` | Staff notes on patient profiles |
| `pushSubscriptions` | Browser push notification subscriptions |
| `referralCodeHistory` | Agent referral code changes |
| `referralRegistrations` | Referral tracking data |
| `stepData` | Workflow step accumulated data |
| `systemReferralCodes` | System-wide referral codes |
| `termsOfService` | Terms versions and content |
| `termsAcceptances` | User terms acceptance records |
| `workflowInstances` | Active workflow instances |

---

## User/Authentication System

### User Levels & Roles

```typescript
const USER_LEVELS = {
  PATIENT: 1,      // Can access patient dashboard, submit forms
  DOCTOR: 2,       // Can conduct consultations, approve patients
  AGENT: 3,        // Can process applications, upload documents
  ADMIN: 4,        // Full admin access except owner features
  OWNER: 5         // Complete system access
};
```

### Firebase Authentication Flow

1. **Client-Side Login**: User signs in with Firebase Auth (email/password)
2. **Token Retrieval**: Client gets Firebase ID token
3. **API Authorization**: Token sent in `Authorization: Bearer <token>` header
4. **Server Verification**: Middleware verifies token with Firebase Admin SDK
5. **Profile Sync**: User profile loaded/created from Firestore
6. **Custom Claims**: User level synced to Firebase custom claims for Storage rules

### Authentication Middleware

```typescript
// server/middleware/firebase-auth.ts
import { verifyIdToken, getUserProfile, setUserLevel } from '../auth/firebase';

export const isAuthenticated = async (req: Request, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Unauthorized - Firebase ID token required" });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify Firebase ID token
    const decodedToken = await verifyIdToken(idToken);
    
    // Get or create user profile
    let user = await getUserProfile(decodedToken.uid);
    
    if (!user) {
      // Create new user with defaults
      user = await createOrUpdateUserProfile(decodedToken.uid, {
        email: decodedToken.email!,
        userType: 'patient',
        userLevel: 1
      });
    }
    
    // Auto-sync custom claims
    if (decodedToken.level !== user.userLevel) {
      await setUserLevel(user.uid, user.userLevel);
    }
    
    // Attach user to request
    req.user = {
      id: user.uid,
      username: user.username || user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      userLevel: user.userLevel,
      email: user.email,
      firebaseUid: user.uid
    };
    
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized - Firebase authentication failed" });
  }
};
```

### Password Handling

Firebase Authentication handles password hashing internally. No bcrypt needed.

```typescript
// Creating user with password
import { adminAuth } from './auth/firebase';

const userRecord = await adminAuth.createUser({
  email: email.toLowerCase(),
  password: password,
  displayName: `${firstName} ${lastName}`
});
```

### Session Management

```typescript
// server/routes.ts
import session from "express-session";
import { RedisStore } from "connect-redis";
import MemoryStore from "memorystore";

const MemorySessionStore = MemoryStore(session);

// Redis for production, MemoryStore for development
let sessionStore;
if (process.env.REDIS_URL) {
  const redisClient = createClient({ url: process.env.REDIS_URL });
  await redisClient.connect();
  sessionStore = new RedisStore({ client: redisClient, ttl: 86400 });
} else {
  sessionStore = new MemorySessionStore({ checkPeriod: 86400000 });
}

app.use(session({
  secret: process.env.SESSION_SECRET || "chronicdocs-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60 * 1000 },
  store: sessionStore,
}));
```

---

## Core Features

### 1. Patient Workflow System

The platform follows a multi-step workflow:

1. **Registration** → Patient creates account
2. **Package Selection** → Choose state-specific service package
3. **Payment** → Authorize.Net payment processing
4. **Video Consultation** → Twilio-based doctor consultation
5. **Agent Processing** → Agent uploads required documents
6. **Admin Approval** → Final review and commission processing

```typescript
// Workflow step progression
export async function advanceWorkflowStep(
  firebaseUid: string,
  currentStep: number,
  stepData?: any
): Promise<ApplicationStep> {
  const db = getAdminFirestore();
  
  // Mark current step complete
  const stepsRef = db.collection('applicationSteps');
  const currentStepQuery = await stepsRef
    .where('firebaseUid', '==', firebaseUid)
    .where('stepNumber', '==', currentStep)
    .get();
  
  if (!currentStepQuery.empty) {
    await currentStepQuery.docs[0].ref.update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      stepData: stepData || null
    });
  }
  
  // Activate next step
  const nextStep = currentStep + 1;
  const nextStepQuery = await stepsRef
    .where('firebaseUid', '==', firebaseUid)
    .where('stepNumber', '==', nextStep)
    .get();
  
  if (!nextStepQuery.empty) {
    await nextStepQuery.docs[0].ref.update({
      status: 'in-progress',
      advancedAt: admin.firestore.FieldValue.serverTimestamp(),
      advanceReason: 'workflow_progression'
    });
  }
  
  // Update application status
  await db.collection('applicationStatus')
    .doc(firebaseUid)
    .update({
      currentStep: nextStep,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  
  return nextStepDoc.data();
}
```

### 2. Video Consultation Queue

Real-time queue management with Firestore listeners:

```typescript
// Queue entry creation
export async function addToVideoQueue(
  firebaseUid: string,
  packageId: string
): Promise<QueueEntry> {
  const db = getAdminFirestore();
  const user = await getUserProfile(firebaseUid);
  
  const queueEntry = {
    firebaseUid,
    patientName: `${user.firstName} ${user.lastName}`,
    patientEmail: user.email,
    state: user.state,
    packageId,
    status: 'waiting_for_doctor',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    joinedWaitingRoomAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  const docRef = await db.collection('queueEntries').add(queueEntry);
  return { id: docRef.id, ...queueEntry };
}

// Doctor claims patient from queue
export async function claimPatient(
  doctorUid: string,
  queueEntryId: string
): Promise<boolean> {
  const db = getAdminFirestore();
  const doctor = await getUserProfile(doctorUid);
  
  await db.collection('queueEntries').doc(queueEntryId).update({
    status: 'with_doctor',
    doctorFirebaseUid: doctorUid,
    doctorName: `${doctor.firstName} ${doctor.lastName}`,
    doctorJoinedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return true;
}
```

### 3. Payment Processing (Authorize.Net)

```typescript
// server/payment/authorizeNet.ts
import AuthorizeNet from 'authorizenet';

const ApiContracts = AuthorizeNet.APIContracts;
const ApiControllers = AuthorizeNet.APIControllers;

export async function processPayment(
  opaqueData: { dataDescriptor: string; dataValue: string },
  amount: number,
  billingInfo: BillingInfo
): Promise<PaymentResult> {
  const merchantAuth = new ApiContracts.MerchantAuthenticationType();
  merchantAuth.setName(process.env.AUTHORIZE_NET_API_LOGIN_ID);
  merchantAuth.setTransactionKey(process.env.AUTHORIZE_NET_TRANSACTION_KEY);

  const opaqueDataType = new ApiContracts.OpaqueDataType();
  opaqueDataType.setDataDescriptor(opaqueData.dataDescriptor);
  opaqueDataType.setDataValue(opaqueData.dataValue);

  const paymentType = new ApiContracts.PaymentType();
  paymentType.setOpaqueData(opaqueDataType);

  const transactionRequest = new ApiContracts.TransactionRequestType();
  transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
  transactionRequest.setAmount((amount / 100).toFixed(2)); // Convert cents to dollars
  transactionRequest.setPayment(paymentType);

  // Add billing address
  const billTo = new ApiContracts.CustomerAddressType();
  billTo.setFirstName(billingInfo.firstName);
  billTo.setLastName(billingInfo.lastName);
  billTo.setAddress(billingInfo.address);
  billTo.setCity(billingInfo.city);
  billTo.setState(billingInfo.state);
  billTo.setZip(billingInfo.zipCode);
  transactionRequest.setBillTo(billTo);

  const createRequest = new ApiContracts.CreateTransactionRequest();
  createRequest.setMerchantAuthentication(merchantAuth);
  createRequest.setTransactionRequest(transactionRequest);

  const ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
  
  // Set environment
  if (process.env.AUTHORIZE_NET_ENVIRONMENT === 'production') {
    ctrl.setEnvironment(AuthorizeNet.Constants.endpoint.production);
  }

  return new Promise((resolve, reject) => {
    ctrl.execute(() => {
      const response = ctrl.getResponse();
      const result = new ApiContracts.CreateTransactionResponse(response);
      
      if (result.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
        const transactionResponse = result.getTransactionResponse();
        resolve({
          success: true,
          transactionId: transactionResponse.getTransId(),
          authCode: transactionResponse.getAuthCode()
        });
      } else {
        reject(new Error(result.getMessages().getMessage()[0].getText()));
      }
    });
  });
}
```

### 4. Email Automation (SendGrid)

```typescript
// server/services/email-automation.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendAutomatedEmail(
  to: string,
  templateId: string,
  dynamicData: Record<string, any>
): Promise<boolean> {
  try {
    await sgMail.send({
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: 'Chronic Docs'
      },
      templateId,
      dynamicTemplateData: dynamicData
    });
    return true;
  } catch (error) {
    console.error('SendGrid error:', error);
    return false;
  }
}

// Workflow-triggered emails
export async function sendPaymentConfirmation(
  email: string,
  packageName: string,
  amount: number
): Promise<void> {
  await sendAutomatedEmail(email, 'd-payment-confirmation-template-id', {
    package_name: packageName,
    amount: `$${(amount / 100).toFixed(2)}`,
    date: new Date().toLocaleDateString()
  });
}
```

### 5. Push Notifications

```typescript
// server/services/pushNotifications.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:support@chronicdocs.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushNotification(
  firebaseUid: string,
  title: string,
  body: string,
  data?: any
): Promise<void> {
  const db = getDb();
  
  const subscriptionsSnapshot = await db.collection('pushSubscriptions')
    .where('firebaseUid', '==', firebaseUid)
    .get();
  
  for (const doc of subscriptionsSnapshot.docs) {
    const subscription = doc.data();
    try {
      await webpush.sendNotification(
        subscription.pushSubscription,
        JSON.stringify({ title, body, data })
      );
    } catch (error: any) {
      if (error.statusCode === 410) {
        // Subscription expired, delete it
        await doc.ref.delete();
      }
    }
  }
}
```

### 6. Agent Time Tracking

```typescript
// Clock in/out system
export async function clockIn(agentFirebaseUid: string): Promise<ClockRecord> {
  const db = getAdminFirestore();
  
  // Check for existing open clock record
  const openRecords = await db.collection('agentClockRecords')
    .where('agentFirebaseUid', '==', agentFirebaseUid)
    .where('clockOutTime', '==', null)
    .get();
  
  if (!openRecords.empty) {
    throw new Error('Already clocked in');
  }
  
  const record = {
    agentFirebaseUid,
    clockInTime: admin.firestore.FieldValue.serverTimestamp(),
    clockOutTime: null,
    totalMinutes: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  const docRef = await db.collection('agentClockRecords').add(record);
  return { id: docRef.id, ...record };
}

export async function clockOut(agentFirebaseUid: string): Promise<ClockRecord> {
  const db = getAdminFirestore();
  
  const openRecords = await db.collection('agentClockRecords')
    .where('agentFirebaseUid', '==', agentFirebaseUid)
    .where('clockOutTime', '==', null)
    .orderBy('clockInTime', 'desc')
    .limit(1)
    .get();
  
  if (openRecords.empty) {
    throw new Error('No active clock-in record found');
  }
  
  const doc = openRecords.docs[0];
  const clockInTime = doc.data().clockInTime.toDate();
  const clockOutTime = new Date();
  const totalMinutes = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / 60000);
  
  await doc.ref.update({
    clockOutTime: admin.firestore.FieldValue.serverTimestamp(),
    totalMinutes
  });
  
  return { id: doc.id, ...doc.data(), clockOutTime, totalMinutes };
}
```

---

## API Endpoints Reference

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Firebase ID token validation | No |
| POST | `/api/auth/register` | Create new patient account | No |
| POST | `/api/auth/logout` | Clear session | Yes |
| GET | `/api/auth/me` | Get current user profile | Yes |
| POST | `/api/auth/change-password` | Update user password | Yes |
| POST | `/api/auth/update-profile` | Update user profile | Yes |

### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users` | List users (with filters) | Admin |
| GET | `/api/users/:firebaseUid` | Get user by ID | Yes |
| PUT | `/api/users/:firebaseUid` | Update user | Yes |
| GET | `/api/users/me/active-package` | Get user's active package | Yes |
| GET | `/api/users/me/assigned-agent` | Get assigned agent info | Yes |

### Application Workflow

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users/:userId/application-status` | Get application status | Yes |
| PUT | `/api/users/:userId/application-status` | Update application status | Admin |
| GET | `/api/users/:userId/application-steps` | Get workflow steps | Yes |
| POST | `/api/application-status/:uid/reset` | Reset application | Admin |
| GET | `/api/users/:userId/document-states` | Get document upload states | Yes |
| POST | `/api/users/:userId/document-states` | Update document states | Yes |

### Packages

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/packages` | List available packages | Yes |
| GET | `/api/packages/:id` | Get package details | Yes |
| GET | `/api/admin/packages` | Admin package list | Admin |
| POST | `/api/admin/packages` | Create package | Admin |
| PUT | `/api/admin/packages/:id` | Update package | Admin |
| DELETE | `/api/admin/packages/:id` | Delete package | Admin |

### Payments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/payment/process` | Process payment | Yes |
| GET | `/api/payment/client-key` | Get Authorize.Net client key | Yes |
| GET | `/api/payments/user/:firebaseUid` | Get user's payments | Yes |

### Video Consultation

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/twilio/video/join-waiting-room` | Join consultation queue | Yes |
| POST | `/api/twilio/video/claim-patient` | Doctor claims patient | Doctor |
| POST | `/api/twilio/video/approve-patient` | Doctor approves patient | Doctor |
| GET | `/api/twilio/video/queue-status` | Get queue status | Doctor |
| POST | `/api/twilio/video/generate-token` | Get Twilio video token | Yes |

### Forms

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/forms` | List form types | Yes |
| GET | `/api/forms/agent/queue` | Agent work queue | Agent |
| GET | `/api/forms/agent/finalized` | Agent's completed patients | Agent |
| POST | `/api/forms/submit` | Submit form data | Yes |
| POST | `/api/forms/generate-state-form` | Generate state PDF | Agent |

### Messages

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/messages` | Get user's messages | Yes |
| POST | `/api/messages` | Send message | Yes |
| PATCH | `/api/messages/:id/read` | Mark message as read | Yes |
| POST | `/api/bulk-email` | Send bulk email | Admin |

### Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/pending-approvals` | Patients awaiting approval | Admin |
| GET | `/api/admin/doctors` | List doctors | Admin |
| GET | `/api/admin/patient-queue-progress` | Queue analytics | Admin |
| POST | `/api/admin/clear-user-cache` | Clear Redis cache | Admin |

### Agent Clock

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/agent-clock/clock-in` | Clock in | Agent |
| POST | `/api/agent-clock/clock-out` | Clock out | Agent |
| GET | `/api/agent-clock/status` | Get clock status | Agent |
| GET | `/api/agent-clock/records` | Get clock history | Agent |

### Push Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/push/vapid-key` | Get VAPID public key | No |
| POST | `/api/push/subscribe` | Subscribe to notifications | Yes |
| POST | `/api/push/unsubscribe` | Unsubscribe | Yes |

### Public Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/public/available-states` | List available states | No |
| GET | `/api/public/validate-referral-code` | Validate referral code | No |
| POST | `/api/public/track-referral-visit` | Track referral page visit | No |

---

## Key Code Snippets

### Firebase Initialization (Lazy Loading)

```typescript
// server/firebase.ts
import { initializeApp, cert, type App } from 'firebase-admin/app';
import { Firestore } from '@google-cloud/firestore';

let _db: Firestore | null = null;

export function getDb(): Firestore {
  if (_db) return _db;
  
  console.log('🔥 Initializing Firestore client (lazy initialization)');
  
  _db = new Firestore({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL!,
      private_key: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    databaseId: 'chronicdocs'  // Custom database ID
  });
  
  return _db;
}
```

### Rate Limiting

```typescript
// server/routes.ts
import rateLimit from "express-rate-limit";

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,                    // 3 attempts per hour
  message: 'Too many registration attempts from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many payment attempts',
});

// Apply to routes
app.post("/api/auth/register", registrationLimiter, async (req, res) => { ... });
app.post("/api/payment/process", paymentLimiter, async (req, res) => { ... });
```

### Standard Route Pattern

```typescript
// Standard authenticated route with error handling
app.get("/api/example/:id", isAuthenticated, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    
    // Permission check
    if (user.userLevel < 3) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    // Business logic
    const db = getAdminFirestore();
    const doc = await db.collection('examples').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ message: "Not found" });
    }
    
    res.json({ data: doc.data() });
  } catch (error: any) {
    console.error('Error:', error);
    next(error);
  }
});
```

### Firestore Transaction Pattern

```typescript
// Atomic updates with transactions
export async function claimPatientAtomically(
  agentUid: string,
  queueEntryId: string
): Promise<boolean> {
  const db = getAdminFirestore();
  
  return db.runTransaction(async (transaction) => {
    const queueRef = db.collection('queueEntries').doc(queueEntryId);
    const queueDoc = await transaction.get(queueRef);
    
    if (!queueDoc.exists) {
      throw new Error('Queue entry not found');
    }
    
    const data = queueDoc.data()!;
    if (data.agentFirebaseUid) {
      throw new Error('Already claimed by another agent');
    }
    
    transaction.update(queueRef, {
      agentFirebaseUid: agentUid,
      agentClaimedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'with_agent'
    });
    
    return true;
  });
}
```

---

## Frontend Patterns

### Authentication Context

```typescript
// client/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Fetch user profile from API
        const token = await fbUser.getIdToken();
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          setUser(await response.json());
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const getIdToken = async () => {
    return firebaseUser ? await firebaseUser.getIdToken() : null;
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, login, logout, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### TanStack Query Setup

```typescript
// client/src/lib/queryClient.ts
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from './firebase';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  const token = await auth.currentUser?.getIdToken();
  
  const res = await fetch(queryKey[0] as string, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  
  await throwIfResNotOk(res);
  return res.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      }
    },
  },
});
```

### Data Fetching Pattern

```typescript
// Using TanStack Query for data fetching
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Fetch data
const { data: packages, isLoading } = useQuery<ServicePackage[]>({
  queryKey: ['/api/packages'],
  staleTime: 1000 * 60 * 5,
});

// Mutation with cache invalidation
const queryClient = useQueryClient();

const createPackageMutation = useMutation({
  mutationFn: async (data: CreatePackageInput) => {
    const res = await apiRequest('POST', '/api/admin/packages', data);
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
    toast({ title: 'Package created successfully' });
  },
  onError: (error: Error) => {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  }
});
```

### Form Handling with React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

type FormValues = z.infer<typeof formSchema>;

export function ProfileForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    await apiRequest('PUT', '/api/auth/update-profile', data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* More fields... */}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Save
        </Button>
      </form>
    </Form>
  );
}
```

### Toast Notifications

```typescript
// client/src/hooks/use-toast.ts usage
import { useToast } from '@/hooks/use-toast';

function MyComponent() {
  const { toast } = useToast();
  
  const handleAction = async () => {
    try {
      await someAction();
      toast({
        title: 'Success',
        description: 'Action completed successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };
}
```

---

## Required Dependencies

### Backend Dependencies

```json
{
  "dependencies": {
    "@google-cloud/firestore": "^7.11.3",
    "@sendgrid/mail": "^8.1.6",
    "authorizenet": "^1.0.10",
    "axios": "^1.9.0",
    "compression": "^1.8.1",
    "connect-redis": "^9.0.0",
    "express": "^4.21.2",
    "express-rate-limit": "^8.1.0",
    "express-session": "^1.18.1",
    "firebase": "^12.2.1",
    "firebase-admin": "^13.5.0",
    "helmet": "^8.1.0",
    "jsonwebtoken": "^9.0.2",
    "memorystore": "^1.6.7",
    "multer": "^2.0.0",
    "passport": "^0.7.0",
    "pdf-lib": "^1.17.1",
    "twilio": "^5.x",
    "web-push": "^3.x",
    "ws": "^8.x",
    "zod": "^3.x"
  },
  "devDependencies": {
    "@types/express": "4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/multer": "^2.0.0",
    "@types/ws": "^8.5.13",
    "tsx": "^4.x",
    "typescript": "^5.x"
  }
}
```

### Frontend Dependencies

```json
{
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@radix-ui/react-accordion": "^1.2.4",
    "@radix-ui/react-alert-dialog": "^1.1.7",
    "@radix-ui/react-avatar": "^1.1.4",
    "@radix-ui/react-checkbox": "^1.1.5",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-dropdown-menu": "^2.1.7",
    "@radix-ui/react-label": "^2.1.3",
    "@radix-ui/react-popover": "^1.1.7",
    "@radix-ui/react-select": "^2.1.7",
    "@radix-ui/react-tabs": "^1.1.4",
    "@radix-ui/react-toast": "^1.2.7",
    "@tanstack/react-query": "^5.60.5",
    "@twilio/voice-sdk": "^2.16.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "firebase": "^12.2.1",
    "framer-motion": "^11.13.1",
    "lucide-react": "^0.453.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.55.0",
    "react-router-dom": "^6.x",
    "tailwind-merge": "^2.x",
    "tailwindcss": "^4.x",
    "zod": "^3.x"
  }
}
```

---

## Environment Variables

### Required Variables

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Frontend Firebase (prefixed with VITE_ for Vite)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id

# Authorize.Net Payment Processing
AUTHORIZE_NET_API_LOGIN_ID=your-login-id
AUTHORIZE_NET_TRANSACTION_KEY=your-transaction-key
AUTHORIZE_NET_PUBLIC_CLIENT_KEY=your-client-key
AUTHORIZE_NET_ENVIRONMENT=sandbox  # or 'production'

# SendGrid Email
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Twilio (Video/Voice)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_API_KEY_SID=SKxxx
TWILIO_API_KEY_SECRET=xxx
TWILIO_PHONE_NUMBER=+1234567890

# Push Notifications
VAPID_PUBLIC_KEY=BPxxx
VAPID_PRIVATE_KEY=xxx

# Session & Security
SESSION_SECRET=your-secure-random-string
JWT_SECRET=your-jwt-secret

# Redis (Optional - falls back to MemoryStore)
REDIS_URL=redis://localhost:6379

# Application URLs
APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

# GoHighLevel CRM (Optional)
GOHIGHLEVEL_API_KEY=xxx
GOHIGHLEVEL_LOCATION_ID=xxx
GOHIGHLEVEL_PIPELINE_ID=xxx
GOHIGHLEVEL_ENABLED=true
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure

- [ ] Set up Node.js + Express server with TypeScript
- [ ] Initialize Firebase Admin SDK with lazy loading pattern
- [ ] Create Firebase Firestore collections structure
- [ ] Implement session management (Redis + MemoryStore fallback)
- [ ] Set up rate limiting middleware
- [ ] Configure CORS and security headers (Helmet)

### Phase 2: Authentication System

- [ ] Implement Firebase Authentication integration
- [ ] Create `isAuthenticated` middleware
- [ ] Set up user levels and permissions (1-5)
- [ ] Implement custom claims for role-based access
- [ ] Create user registration endpoint
- [ ] Create login/logout endpoints
- [ ] Implement password change functionality

### Phase 3: User Management

- [ ] Create `users` collection with full schema
- [ ] Implement user profile CRUD operations
- [ ] Add profile validation (required fields)
- [ ] Create admin user management endpoints
- [ ] Implement user search and filtering

### Phase 4: Workflow System

- [ ] Create `applicationStatus` collection
- [ ] Create `applicationSteps` collection
- [ ] Implement step progression logic
- [ ] Create `stepData` for accumulated data
- [ ] Add manual unlock/advance functionality
- [ ] Implement workflow reset capability

### Phase 5: Package System

- [ ] Create `servicePackages` collection
- [ ] Implement package CRUD endpoints
- [ ] Add state-specific package filtering
- [ ] Configure required documents per package
- [ ] Implement pricing logic

### Phase 6: Payment Processing

- [ ] Integrate Authorize.Net SDK
- [ ] Implement Accept.js tokenization
- [ ] Create payment processing endpoint
- [ ] Implement payment record storage
- [ ] Add refund/chargeback handling
- [ ] Create payment history endpoints

### Phase 7: Video Consultation

- [ ] Integrate Twilio Video SDK
- [ ] Create queue management system (`queueEntries`)
- [ ] Implement waiting room logic
- [ ] Create doctor claim/release functionality
- [ ] Add patient approval workflow
- [ ] Implement 15-minute timeout mechanism

### Phase 8: Form & Document Management

- [ ] Create `formAssignments` collection
- [ ] Implement form submission handling
- [ ] Create `documentStates` for uploads
- [ ] Integrate Firebase Cloud Storage
- [ ] Add document validation
- [ ] Create PDF generation (if needed)

### Phase 9: Messaging & Notifications

- [ ] Create `messages` collection
- [ ] Implement internal messaging system
- [ ] Set up SendGrid for emails
- [ ] Implement push notifications (web-push)
- [ ] Create bulk email functionality
- [ ] Add email templates

### Phase 10: Agent Features

- [ ] Create agent queue system
- [ ] Implement time tracking (`agentClockRecords`)
- [ ] Add referral code system
- [ ] Create commission tracking
- [ ] Implement agent-to-patient assignment

### Phase 11: Admin Dashboard

- [ ] Create admin-only endpoints
- [ ] Implement analytics/reporting
- [ ] Add user impersonation (if needed)
- [ ] Create system settings management
- [ ] Add bulletin/announcement system

### Phase 12: Frontend Integration

- [ ] Set up React + Vite + TypeScript
- [ ] Create AuthContext with Firebase
- [ ] Configure TanStack Query
- [ ] Set up shadcn/ui components
- [ ] Implement responsive layouts
- [ ] Create role-based routing

---

## Notes

- **Firebase UIDs**: Always use Firebase UID as the primary identifier for users
- **Timestamps**: Use `admin.firestore.FieldValue.serverTimestamp()` for consistency
- **Error Handling**: Log errors to `errorLogs` collection for debugging
- **Lazy Loading**: Initialize Firebase services on-demand to improve startup time
- **Type Safety**: Use TypeScript interfaces for all data structures

---

*This guide was generated from the ChronicDocs codebase. Last updated: January 2026*
