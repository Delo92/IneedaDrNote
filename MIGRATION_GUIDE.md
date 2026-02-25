# Automated Doctor's Note Workflow — Full Migration Guide

This guide covers every piece of the fully automated pipeline: Patient registers with complete profile → Profile gate enforced → Selects note type → Auto-assigns to doctor via round-robin → SendGrid emails sent to doctor + admin → Doctor approves via token link → Auto-generates document using doctor's form template (pre-filled with doctor credentials, patient data substituted via `{{placeholder}}` syntax) → Patient notified by email and dashboard.

Use this as a reference when setting up a new project from scratch or migrating an existing white-label platform.

---

## Table of Contents

1. [Environment Variables](#1-environment-variables)
2. [Firestore Collections](#2-firestore-collections)
3. [Extended Registration (Frontend)](#3-extended-registration-frontend)
4. [AuthContext — Firebase Auth + Custom Token Fallback](#4-authcontext--firebase-auth--custom-token-fallback)
5. [Backend Registration Endpoint](#5-backend-registration-endpoint)
6. [Profile API (GET/PUT /api/profile)](#6-profile-api-getput-apiprofile)
7. [Profile Page (Self-Service)](#7-profile-page-self-service)
8. [Profile Gate on New Application](#8-profile-gate-on-new-application)
9. [Auto-Fill Application Data](#9-auto-fill-application-data)
10. [Package Custom Fields](#10-package-custom-fields)
11. [SendGrid Email Service](#11-sendgrid-email-service)
12. [Admin Notification Email Setting](#12-admin-notification-email-setting)
13. [Auto-Send to Doctor (Round-Robin)](#13-auto-send-to-doctor-round-robin)
14. [Doctor Review Token System](#14-doctor-review-token-system)
15. [Doctor Profile Management (Admin)](#15-doctor-profile-management-admin)
16. [Form Template + Placeholder Substitution](#16-form-template--placeholder-substitution)
17. [Auto-Generate Document on Approval](#17-auto-generate-document-on-approval)
18. [Patient Notification on Approval](#18-patient-notification-on-approval)
19. [Auth Fix: Pre-existing Users Without Firebase Auth](#19-auth-fix-pre-existing-users-without-firebase-auth)
20. [Application Status Flow](#20-application-status-flow)

---

## 1. Environment Variables

Required secrets:

| Variable | Purpose |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Admin SDK service account JSON |
| `VITE_FIREBASE_API_KEY` | Firebase client API key (frontend) |
| `VITE_FIREBASE_APP_ID` | Firebase client App ID (frontend) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID (frontend) |
| `SENDGRID_API_KEY` | SendGrid API key for transactional emails (optional — emails skip gracefully if not set) |
| `SENDGRID_FROM_EMAIL` | From address for emails (defaults to `noreply@ineedadrnote.com`) |

---

## 2. Firestore Collections

| Collection | Purpose |
|---|---|
| `users` | All platform users (patients, doctors, admins, owners) |
| `packages` | Service offerings with pricing and optional `formFields` array |
| `applications` | User applications linked to packages |
| `applicationSteps` | Workflow step tracking per application |
| `documents` | Generated documents with metadata and `generatedHtml` |
| `doctorProfiles` | Doctor credentials, `formTemplate` (HTML with placeholders) |
| `doctorReviewTokens` | Secure tokens for async doctor review (32-byte, 7-day expiry) |
| `adminSettings` | Platform settings including `notificationEmail`, `lastAssignedDoctorId` |
| `autoMessageTriggers` | Automated in-app messages triggered on status changes |
| `notifications` | User notifications (in-app) |
| `messages` | Internal messaging system |
| `activityLogs` | Audit trail |

---

## 3. Extended Registration (Frontend)

**File: `client/src/pages/Register.tsx`**

The registration form collects ALL fields upfront in 5 sections:

### Section 1: Personal Information
- `firstName` (required), `middleName` (optional), `lastName` (required)
- `email` (required), `phone` (required), `dateOfBirth` (required, type="date")

### Section 2: Address
- `address` (required), `city` (required), `state` (required, dropdown of US states), `zipCode` (required)

### Section 3: Medical Information
- `medicalCondition` (required), `driverLicenseNumber` (required)
- `ssn` (optional), `hasMedicare` (checkbox), `isVeteran` (checkbox)

### Section 4: Account Security
- `password` (min 8 chars), `confirmPassword` (must match)
- `referralCode` (optional, pre-filled from `?ref=` URL param)

### Section 5: Required Consents (all 4 must be checked)
- `smsConsent` — SMS text message consent
- `emailConsent` — Email communication consent
- `chargeUnderstanding` — Acknowledge charges
- `patientAuthorization` — Patient authorization for records

Zod schema validates all fields. The 4 consent checkboxes use `.refine(val => val === true, {...})`.

The `onSubmit` handler calls `register()` from AuthContext with all fields spread:

```typescript
await register({
  email: data.email,
  password: data.password,
  firstName: data.firstName,
  middleName: data.middleName,
  lastName: data.lastName,
  phone: data.phone,
  dateOfBirth: data.dateOfBirth,
  address: data.address,
  city: data.city,
  state: data.state,
  zipCode: data.zipCode,
  medicalCondition: data.medicalCondition,
  driverLicenseNumber: data.driverLicenseNumber,
  hasMedicare: data.hasMedicare,
  ssn: data.ssn,
  isVeteran: data.isVeteran,
  smsConsent: data.smsConsent,
  emailConsent: data.emailConsent,
  chargeUnderstanding: data.chargeUnderstanding,
  patientAuthorization: data.patientAuthorization,
  referralCode: data.referralCode,
});
```

---

## 4. AuthContext — Firebase Auth + Custom Token Fallback

**File: `client/src/contexts/AuthContext.tsx`**

### RegisterData Interface

```typescript
interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  medicalCondition?: string;
  driverLicenseNumber?: string;
  hasMedicare?: boolean;
  ssn?: string;
  isVeteran?: boolean;
  smsConsent?: boolean;
  emailConsent?: boolean;
  chargeUnderstanding?: boolean;
  patientAuthorization?: boolean;
  referralCode?: string;
}
```

### Register Function

1. Try `createUserWithEmailAndPassword(auth, email, password)` — get `firebaseUid`
2. If Firebase Auth fails (e.g. email already in Firebase), log warning but continue
3. POST to `/api/auth/register` with `{ ...data, firebaseUid }`
4. Set user state from response

### Login Function (with pre-existing user fallback)

```typescript
const login = async (email: string, password: string): Promise<User> => {
  try {
    // Normal flow: sign in with Firebase Auth first
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    setUser(data.user);
    return data.user;
  } catch (error: any) {
    // Fallback: user exists in DB but NOT in Firebase Auth
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
      const response = await apiRequest("POST", "/api/auth/login", {
        email, password, createFirebaseAccount: true,
      });
      const data = await response.json();
      setUser(data.user);
      if (data.customToken) {
        await signInWithCustomToken(auth, data.customToken);
      }
      return data.user;
    }
    throw error;
  }
};
```

### onAuthStateChanged Listener

Watches Firebase auth state. When a user signs in, fetches `/api/auth/me` with the Bearer token to get the full user object from the backend.

---

## 5. Backend Registration Endpoint

**File: `server/routes.ts` — `POST /api/auth/register`**

Accepts all extended fields:

```typescript
const {
  email, password, firstName, lastName, phone, referralCode, firebaseUid,
  middleName, dateOfBirth, address, city, state, zipCode,
  driverLicenseNumber, medicalCondition, ssn,
  hasMedicare, isVeteran,
  smsConsent, emailConsent, chargeUnderstanding, patientAuthorization
} = req.body;
```

Computes `registrationComplete` flag:

```typescript
const registrationComplete = !!(
  firstName && lastName && phone && dateOfBirth &&
  address && city && state && zipCode &&
  smsConsent && emailConsent && chargeUnderstanding && patientAuthorization
);
```

Creates user with `userLevel: 1` (patient), generates `referralCode` and `profileId`.

---

## 6. Profile API (GET/PUT /api/profile)

**File: `server/routes.ts`**

### GET /api/profile (requireAuth)

Returns the current user's full profile from Firestore with `passwordHash` stripped.

```typescript
app.get("/api/profile", requireAuth, async (req, res) => {
  const user = await storage.getUser(req.user!.id);
  res.json({ ...user, passwordHash: undefined });
});
```

### PUT /api/profile (requireAuth)

Accepts any subset of profile fields and updates only the ones provided:

```typescript
app.put("/api/profile", requireAuth, async (req, res) => {
  const {
    firstName, middleName, lastName, phone, dateOfBirth,
    address, city, state, zipCode,
    driverLicenseNumber, medicalCondition, ssn,
    hasMedicare, isVeteran,
    smsConsent, emailConsent, chargeUnderstanding, patientAuthorization,
    registrationComplete, referralCode
  } = req.body;

  const updates: Record<string, any> = {};
  // Only set fields that are explicitly provided (not undefined)
  if (firstName !== undefined) updates.firstName = firstName;
  // ... repeat for all fields ...

  const user = await storage.updateUser(req.user!.id, updates);
  res.json({ ...user, passwordHash: undefined });
});
```

---

## 7. Profile Page (Self-Service)

**File: `client/src/pages/dashboard/applicant/RegistrationPage.tsx`**

Full profile editing page with:

- Fetches data from `GET /api/profile`
- Shows green banner when profile complete, amber when incomplete
- `isProfileComplete()` function checks 9 required fields + 4 consents:

```typescript
function isProfileComplete(data: Partial<RegistrationFormData>): boolean {
  const requiredFields = [
    "firstName", "lastName", "email", "phone",
    "dateOfBirth", "address", "city", "state", "zipCode",
  ];
  const requiredConsents = [
    "smsConsent", "emailConsent", "chargeUnderstanding", "patientAuthorization",
  ];
  // Check all required fields are non-empty strings
  // Check all consents are true
  return allFieldsFilled && allConsentsChecked;
}
```

- "Order Doctor's Note" button is disabled when profile is incomplete
- Saves via `PUT /api/profile`
- Calls `refreshUser()` after save to update AuthContext

---

## 8. Profile Gate on New Application

**File: `client/src/pages/dashboard/applicant/NewApplication.tsx`**

Before showing the application wizard, checks profile completeness:

```typescript
const { data: profile } = useQuery({ queryKey: ["/api/profile"] });
const profileComplete = isProfileComplete(profile);

if (!profileComplete) {
  return (
    <Card>
      <CardTitle>Complete Your Profile First</CardTitle>
      <Link href="/dashboard/applicant/registration">
        <Button>Complete My Profile</Button>
      </Link>
    </Card>
  );
}
```

---

## 9. Auto-Fill Application Data

When creating the application, ALL profile data is merged into `formData`:

```typescript
const formData = {
  ...customFields,                          // Package-specific custom fields
  fullName: `${profile.firstName} ${profile.middleName} ${profile.lastName}`,
  firstName: profile.firstName,
  middleName: profile.middleName,
  lastName: profile.lastName,
  email: profile.email,
  phone: profile.phone,
  dateOfBirth: profile.dateOfBirth,
  address: profile.address,
  city: profile.city,
  state: profile.state,
  zipCode: profile.zipCode,
  driverLicenseNumber: profile.driverLicenseNumber,
  medicalCondition: profile.medicalCondition,
  ssn: profile.ssn,
  hasMedicare: profile.hasMedicare,
  isVeteran: profile.isVeteran,
  reason,                                   // User-entered purpose of note
  additionalInfo,                           // Optional additional details
};
```

Step 2 of the wizard shows the auto-filled data as a read-only summary with an "Edit Profile Information" link.

---

## 10. Package Custom Fields

**File: `client/src/pages/dashboard/admin/PackagesManagement.tsx`**

Admins can define per-package custom form fields stored in the package's `formFields` JSON array:

```typescript
interface CustomFormField {
  name: string;      // Auto-generated slug from label
  label: string;     // Display label
  type: string;      // "text" | "textarea" | "select" | "date" | "email" | "phone" | "number"
  required: boolean;
  options?: string[]; // For select type only
}
```

These fields are rendered dynamically in the application wizard (Step 2) and their values are merged into `formData` alongside profile data.

---

## 11. SendGrid Email Service

**File: `server/email.ts`**

### Setup

```typescript
import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@ineedadrnote.com";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

function isEmailConfigured(): boolean {
  return !!SENDGRID_API_KEY;
}
```

All email functions check `isEmailConfigured()` first and skip gracefully if SendGrid is not configured.

### 3 Email Functions

**`sendDoctorApprovalEmail(data)`** — Sent to the assigned doctor:
- Blue header ("I Need A Dr Note")
- Patient info box (name, email, package, application ID)
- Full application details table (all formData key/value pairs)
- Green "Review & Approve" button linking to `/review/:token`
- "No login required" note

**`sendAdminNotificationEmail(data)`** — Sent to the configured admin email:
- Purple header
- Assignment details (patient, doctor, package)
- Same application details table
- Same "Review & Approve" button (admin can also approve)

**`sendPatientApprovalEmail(data)`** — Sent to patient after doctor approves:
- Green header ("Your Application Has Been Approved!")
- "What's Next?" box explaining document is ready
- Blue "View My Dashboard" button linking to `/dashboard/applicant/documents`

### formatFormData Helper

Converts formData object into an HTML table for emails, skipping internal keys like `autoSendToDoctor` and `packageId`:

```typescript
function formatFormData(formData: Record<string, any>): string {
  const skipKeys = new Set(["autoSendToDoctor", "packageId"]);
  let html = '<table>';
  for (const [key, value] of Object.entries(formData)) {
    if (skipKeys.has(key) || !value) continue;
    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
    html += `<tr><td>${label}</td><td>${value}</td></tr>`;
  }
  html += "</table>";
  return html;
}
```

---

## 12. Admin Notification Email Setting

**File: `client/src/pages/dashboard/shared/SettingsPage.tsx`**

Admin (Level 3+) can set a `notificationEmail` in settings. This email receives a copy of every doctor review request.

Backend endpoints:
- `GET /api/admin/settings` — Returns `adminSettings` document
- `PUT /api/admin/settings` — Updates `adminSettings` document

The `notificationEmail` field is stored in the `adminSettings` Firestore collection.

---

## 13. Auto-Send to Doctor (Round-Robin)

**File: `server/routes.ts` — inside `POST /api/applications`**

When the application is created with `autoSendToDoctor: true`:

```typescript
if (autoSendToDoctor) {
  // 1. Get next doctor via round-robin
  const doctor = await storage.getNextDoctorForAssignment();

  // 2. Create 32-byte review token with 7-day expiry
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await storage.createDoctorReviewToken({ applicationId, doctorId, token, status: "pending", expiresAt });

  // 3. Update application status
  await storage.updateApplication(applicationId, { status: "doctor_review", assignedReviewerId: doctorId });

  // 4. Send emails
  sendDoctorApprovalEmail({ doctorEmail, doctorName, patientName, patientEmail, packageName, formData, reviewUrl, applicationId });
  sendAdminNotificationEmail({ adminEmail: notificationEmail, ... });

  // 5. Fire auto-message triggers
  fireAutoMessageTriggers(applicationId, "doctor_review");
}
```

### Round-Robin Assignment (Storage)

```typescript
async getNextDoctorForAssignment(): Promise<Record<string, any> | undefined> {
  const doctors = await this.getActiveDoctors();
  if (doctors.length === 0) return undefined;

  const settings = await this.getAdminSettings();
  const lastAssignedDoctorId = settings?.lastAssignedDoctorId || null;

  if (!lastAssignedDoctorId) {
    await this.updateAdminSettings({ lastAssignedDoctorId: doctors[0].userId });
    return doctors[0];
  }

  const lastIndex = doctors.findIndex(d => d.userId === lastAssignedDoctorId);
  const nextIndex = (lastIndex + 1) % doctors.length;
  const nextDoctor = doctors[nextIndex];

  await this.updateAdminSettings({ lastAssignedDoctorId: nextDoctor.userId });
  return nextDoctor;
}
```

Active doctors are filtered by `isActive !== false` and exclude placeholder records.

---

## 14. Doctor Review Token System

### Token Generation

- 32-byte cryptographic random token via `randomBytes(32).toString("hex")`
- 7-day expiry
- Stored in `doctorReviewTokens` Firestore collection

### Public Review Portal — `GET /api/review/:token`

No authentication required. Token IS the authentication:

1. Look up token in `doctorReviewTokens`
2. Validate: status must be `"pending"`, not expired
3. Fetch associated application and patient data
4. Return all data needed for the review page

### Doctor Decision — `POST /api/review/:token/decision`

```typescript
{ decision: "approved" | "denied", notes?: string }
```

On **approval**:
1. Update token status to `"approved"`
2. Update application status to `"doctor_approved"`
3. Auto-generate document (see section 17)
4. Fire auto-message triggers for `"doctor_approved"`
5. Create in-app notification for patient
6. Send patient approval email via SendGrid

On **denial**:
1. Update token status to `"denied"`
2. Update application status to `"doctor_denied"`
3. Fire auto-message triggers for `"doctor_denied"`
4. Create in-app notification with denial reason

### Admin Manual Trigger — `POST /api/admin/applications/:id/send-to-doctor`

Admins can also manually send applications to a specific doctor or use round-robin. This generates the same token and sends the same emails.

---

## 15. Doctor Profile Management (Admin)

**File: `client/src/pages/dashboard/admin/UsersManagement.tsx`**

### Add User Dialog (Tabbed Interface)

When creating a new user with Level 2 (Doctor) selected, the dialog shows 3 tabs:

1. **Account** — email, password, name, phone, role selector
2. **Credentials** — fullName (on documents), licenseNumber, NPI, DEA, specialty, office phone, fax, address, state
3. **Form Template** — HTML template editor with placeholder reference

Backend endpoint `POST /api/admin/users` creates both the user account (with Firebase Auth) and the doctor profile in one request:

```typescript
const payload = {
  email, password, firstName, lastName, phone, userLevel: 2,
  doctorProfile: {
    fullName, licenseNumber, npiNumber, deaNumber,
    phone, fax, address, specialty, state, formTemplate,
  },
};
```

### UserProfileModal — Doctor Tab

**File: `client/src/components/shared/UserProfileModal.tsx`**

When viewing a Level 2 user, a "Doctor" tab appears showing:
- Doctor credentials (editable fields)
- Active/Inactive badge
- Form template editor with placeholder reference
- "Save Doctor Profile" button

Fetches from `GET /api/doctor-profiles`, saves via `PUT /api/doctor-profiles/:id` or creates via `POST /api/doctor-profiles`.

---

## 16. Form Template + Placeholder Substitution

### Available Placeholders (25+)

| Placeholder | Source |
|---|---|
| `{{doctorName}}` | Doctor profile `fullName` |
| `{{doctorLicense}}` | Doctor profile `licenseNumber` |
| `{{doctorNPI}}` | Doctor profile `npiNumber` |
| `{{doctorDEA}}` | Doctor profile `deaNumber` |
| `{{doctorPhone}}` | Doctor profile `phone` |
| `{{doctorFax}}` | Doctor profile `fax` |
| `{{doctorAddress}}` | Doctor profile `address` |
| `{{doctorSpecialty}}` | Doctor profile `specialty` |
| `{{doctorState}}` | Doctor profile `state` |
| `{{patientName}}` | Patient `firstName` + `lastName` |
| `{{patientFirstName}}` | Patient `firstName` |
| `{{patientLastName}}` | Patient `lastName` |
| `{{patientMiddleName}}` | Patient `middleName` |
| `{{patientDOB}}` | Patient `dateOfBirth` or formData |
| `{{patientPhone}}` | Patient `phone` |
| `{{patientEmail}}` | Patient `email` |
| `{{patientAddress}}` | Patient `address` or formData |
| `{{patientCity}}` | Patient `city` or formData |
| `{{patientState}}` | Patient `state` or formData |
| `{{patientZipCode}}` | Patient `zipCode` or formData |
| `{{patientSSN}}` | Patient `ssn` or formData |
| `{{patientDriverLicense}}` | Patient `driverLicenseNumber` or formData |
| `{{patientMedicalCondition}}` | Patient `medicalCondition` or formData |
| `{{reason}}` | formData `reason` or `notes` |
| `{{packageName}}` | Application `packageName` |
| `{{date}}` | Today's date (long format: "February 25, 2026") |
| `{{dateShort}}` | Today's date (short format: "2/25/2026") |
| `{{applicationId}}` | Application ID |

Plus any custom key from `formData` is also available as a placeholder.

### fillFormTemplate Function

```typescript
function fillFormTemplate(template: string, placeholders: Record<string, string>): string {
  let filled = template;
  for (const [key, value] of Object.entries(placeholders)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    filled = filled.replace(regex, value || '');
  }
  return filled;
}
```

Handles whitespace inside braces (e.g., `{{ patientName }}`) and is case-insensitive.

---

## 17. Auto-Generate Document on Approval

**File: `server/routes.ts` — `autoGenerateDocument(applicationId, doctorId)`**

Called automatically when a doctor approves an application:

```typescript
async function autoGenerateDocument(applicationId: string, doctorId: string) {
  const app = await storage.getApplication(applicationId);
  const doctorProfile = await storage.getDoctorProfileByUserId(doctorId);
  const patient = app.userId ? await storage.getUser(app.userId) : null;
  const formData = app.formData || {};

  // Build placeholders from doctor profile + patient data + formData
  const placeholders = {
    doctorName: doctorProfile?.fullName || "Physician",
    doctorLicense: doctorProfile?.licenseNumber || "",
    // ... all 25+ placeholders ...
    patientName: `${patient?.firstName} ${patient?.lastName}`,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  };

  // Also add any custom formData keys as placeholders
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === 'string' || typeof value === 'number') {
      placeholders[key] = String(value);
    }
  }

  // Fill the doctor's HTML template
  let generatedHtml = "";
  if (doctorProfile?.formTemplate) {
    generatedHtml = fillFormTemplate(doctorProfile.formTemplate, placeholders);
  }

  // Store document in Firestore
  await storage.createDocument({
    applicationId,
    userId: app.userId || "",
    name: `${app.packageName} - Auto Generated`,
    type: "auto_generated",
    status: "completed",
    fileUrl: "",
    metadata: JSON.stringify({
      applicationId,
      packageName: app.packageName,
      patientName: placeholders.patientName,
      doctorName: placeholders.doctorName,
      generatedAt: new Date().toISOString(),
      status: "auto_generated",
      generatedHtml,
    }),
  });
}
```

---

## 18. Patient Notification on Approval

After document generation, the system sends both:

### In-App Notification

```typescript
await storage.createNotification({
  userId: application.userId,
  type: "application_approved",
  title: "Application Approved",
  message: "Your application has been approved by the reviewing doctor. Your documents are being prepared.",
  isRead: false,
});
```

### Email Notification

```typescript
sendPatientApprovalEmail({
  patientEmail: patient.email,
  patientName: `${patient.firstName} ${patient.lastName}`,
  packageName: pkg?.name || "Doctor's Note",
  applicationId: tokenRecord.applicationId,
  dashboardUrl: `https://${host}/dashboard/applicant/documents`,
});
```

---

## 19. Auth Fix: Pre-existing Users Without Firebase Auth

**Problem:** Users created before Firebase Auth integration had no Firebase Auth account. When they tried to log in, `signInWithEmailAndPassword` threw `auth/user-not-found`, and all subsequent API calls failed because `auth.currentUser` was `null` (so no Bearer token could be generated).

**Solution:** Two-part fix:

### Frontend (AuthContext login)

When Firebase Auth throws `auth/invalid-credential` or `auth/user-not-found`:

1. Call backend with `{ email, password, createFirebaseAccount: true }`
2. Backend creates Firebase Auth account, returns `customToken`
3. Frontend calls `signInWithCustomToken(auth, customToken)` to establish Firebase session

### Backend (login endpoint)

```typescript
if (createFirebaseAccount) {
  const adminAuth = getAdminAuth();
  let firebaseUid;
  try {
    const fbUser = await adminAuth.getUserByEmail(email);
    firebaseUid = fbUser.uid;
  } catch {
    // User doesn't exist in Firebase Auth — create them
    const fbUser = await adminAuth.createUser({ email, password });
    firebaseUid = fbUser.uid;
  }
  if (firebaseUid) {
    await storage.updateUser(user.id, { firebaseUid });
    customToken = await adminAuth.createCustomToken(firebaseUid);
  }
}
```

The response includes `{ user, customToken }` so the frontend can establish both the app session and the Firebase Auth session.

---

## 20. Application Status Flow

```
pending → doctor_review → doctor_approved → completed
                        → doctor_denied
                        → rejected
```

| Status | Trigger | Actions |
|---|---|---|
| `pending` | Application created | — |
| `doctor_review` | Auto-send or admin "Send to Doctor" | Token created, emails sent to doctor + admin |
| `doctor_approved` | Doctor clicks "Approve" on review portal | Document auto-generated, patient notified (email + in-app) |
| `doctor_denied` | Doctor clicks "Deny" on review portal | Patient notified with reason (in-app) |
| `completed` | Manual admin action | — |
| `rejected` | Manual admin action | — |

---

## Key API Endpoints Summary

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register with all profile fields |
| `POST` | `/api/auth/login` | Public | Login, supports `createFirebaseAccount` fallback |
| `GET` | `/api/auth/me` | Bearer | Get current user from Firebase token |
| `GET` | `/api/profile` | Bearer | Get own profile |
| `PUT` | `/api/profile` | Bearer | Update own profile |
| `GET` | `/api/packages` | Public | List active packages |
| `POST` | `/api/applications` | Bearer | Create application (supports `autoSendToDoctor`) |
| `GET` | `/api/admin/settings` | Level 3+ | Get admin settings |
| `PUT` | `/api/admin/settings` | Level 3+ | Update admin settings |
| `GET` | `/api/doctor-profiles` | Level 3+ | List all doctor profiles |
| `POST` | `/api/doctor-profiles` | Level 2+ | Create doctor profile |
| `PUT` | `/api/doctor-profiles/:id` | Level 2+ | Update doctor profile |
| `GET` | `/api/doctors` | Level 3+ | List active doctors with user info |
| `POST` | `/api/admin/applications/:id/send-to-doctor` | Level 3+ | Manual send to doctor |
| `GET` | `/api/review/:token` | Public | Get review data (token is auth) |
| `POST` | `/api/review/:token/decision` | Public | Submit approval/denial (token is auth) |
