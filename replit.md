# ChronicDocs - Asynchronous Doctor's Note Service Platform

## Overview

ChronicDocs is a white-label platform offering an asynchronous doctor's note purchasing service. It features a 4-tier user hierarchy and automates the entire workflow from patient application and payment to doctor review, document generation, and messaging. The platform aims to streamline the process of obtaining doctor's notes, providing a robust solution for both patients and medical professionals, with comprehensive workflow automation and white-label customization for various deployments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Design
The platform is a full-stack TypeScript application utilizing React for the frontend, Express.js for the backend, and Firebase Firestore as the primary data store. The workflow is automated, guiding users through registration, package selection, payment, form auto-fill, doctor review/approval, and automated document generation.

### Frontend
- **Framework**: React 18 with TypeScript, Vite, Wouter for routing.
- **State Management**: TanStack Query for server state.
- **UI/UX**: shadcn/ui with Radix UI and Tailwind CSS for a modern, customizable interface supporting light/dark modes.
- **Architecture**: Context-based for authentication, white-label configuration, and theming.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript.
- **Authentication**: Firebase Auth with bcrypt for password hashing.
- **Email Service**: SendGrid for transactional emails.
- **API**: RESTful endpoints.

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect.
- **Schema**: Shared between frontend and backend using `shared/schema.ts`.
- **Validation**: Zod schemas generated from Drizzle.

### User Hierarchy (4 Levels)
1.  **Patient**: Purchases notes, submits applications.
2.  **Doctor**: Reviews applications, approves/denies.
3.  **Admin**: Manages users, packages, queues, settings.
4.  **Owner**: Full platform control, white-label configuration.
Role names are configurable.

### Key Features
-   **Automated Application Workflow**: From submission to document generation, including doctor assignment via round-robin.
-   **Doctor Review Token System**: Secure, token-based asynchronous review process via email links for doctors, eliminating login requirements.
-   **White-Label Customization**: Owners can configure branding, role names, contact info, and more.
-   **Payment Processing**: Integrated Authorize.Net for credit card payments, with client-side tokenization.
-   **PDF Auto-Fill System (Gizmo)**: Renders and auto-fills PDF forms based on patient data, supporting both AcroForm fields and placeholder tokens. Doctors can upload state-specific PDF templates.
-   **Diagnostics System**: Owner-only `/dashboard/owner/diagnostics` page with two tabs — Analytics (GA4 Data API) and Error Logs (Firestore `errorLogs` collection). Global API intercept middleware auto-logs all 4xx/5xx responses. Global crash handler logs unhandled server errors. `logClientError()` in `client/src/lib/clientErrorLogger.ts` for manual frontend error reporting. Requires `GA4_PROPERTY_ID` secret for analytics tab.
-   **Role-Based Dashboards**: Unique dashboards for each user level with tailored functionalities.
-   **Comprehensive User and Application Management**: Admins can manage users, applications, and settings.
-   **Draft Saving**: Patients can save application progress.

## External Dependencies

-   **Database**: Firebase Firestore (primary data store).
-   **Email**: SendGrid (`@sendgrid/mail`).
-   **Payment Gateway**: Authorize.Net (via Accept.js for client-side tokenization).
-   **UI Libraries**: shadcn/ui, Radix UI, Tailwind CSS.
-   **Form Management**: react-hook-form, Zod.
-   **Date Utilities**: date-fns.
-   **Charting**: Recharts.
-   **PDF Processing**: pdfjs-dist, pdf-lib.
-   **Authentication**: bcryptjs, Firebase Admin SDK.
-   **File Uploads**: multer (for gallery images, stored in Firebase Storage).