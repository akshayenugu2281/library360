# Library360 3.0 — College Library Management System

Library360 is a full-stack college-library platform built with **Spring Boot 3 / Java 21**, **MySQL 8 / Flyway**, and **React / TypeScript / Vite**. It has four role-based experiences: **Student, Faculty, Librarian, and Admin**. The project uses locally installed services and contains no container-orchestration or container-image assets.

## Role capabilities

### Student
- Public sign-up with first and last name, email, password, and Admin-configurable college fields.
- Account remains pending until a Librarian/Admin verifies the submitted details.
- Browse/search the public catalog, save a personal reading list, reserve eligible titles, and see personal loans/returns, due dates, renewals, reservations and fine balances.
- Update their own college profile and phone number; change password with current-password verification.
- Receive private notifications and contact the library through a support conversation.
- Use a role-aware AI assistant for library guidance and public-catalog discovery; no access to other users' records.

### Faculty
- Same account-approval and private-profile safeguards as Students, with Faculty ID, employee number, department and designation fields.
- Higher default borrowing limits and loan duration, plus priority when queued reservations are assigned a returned copy.
- Personal loans, holds, fine information, support chat and AI assistance remain restricted to their own account context.

### Librarian
- Full circulation operations: issue books to eligible members, record returns, handle reservations, add/update catalog books and manage member-facing library workflows.
- Review and approve/reject Student and Faculty registrations.
- View operational analytics, due/overdue loan queues, and outstanding fine exposure.
- Send a reminder to all active approved Students, a selected Student/Faculty account, all overdue accounts, upcoming deadlines, or a specific overdue loan from analytics.
- Handle private Student/Faculty support conversations. Librarians cannot change Admin-only configuration or view provider API secrets.

### Admin
- All staff operations plus account creation for Student/Faculty/Librarian, role changes among non-admin roles, suspend/reactivate, and soft-disable while preserving audit/circulation history.
- Configure which pre-defined college fields appear and which are required on Student/Faculty sign-up.
- Configure OpenRouter model/API key (the key is encrypted before storage and is never sent back to the browser).
- Configure Student and Faculty lending limits, renewal/reservation caps, fine-per-day/cap/block threshold, and reservation pickup windows.
- See application user counts, approval status, account-role counts, library aggregates and circulation trends.
- Admin identities cannot be suspended/deleted or escalated through normal user-management endpoints.

## Major functional areas

- **Identity and approval:** role-aware sign-in selection is checked against the authenticated account; public registration supports Student/Faculty only; approval status is checked before login. Passwords need at least 6 characters with both letters and numbers; signed-in users change their own password, Admins issue one-time temporary passwords, and anyone locked out can reset via email plus the mobile number/date of birth on their college profile (`/forgot-password`).
- **Reservations:** faculty-priority, FIFO-within-tier queue with server-computed positions (`Queued #2 of 9`), live 12-hour pickup countdowns, honest availability estimates, and automatic reassignment on expiry. Queue allocation is row-locked so one copy is never assigned twice.
- **College profile:** full name, first/last name, admission number, roll number, branch, academic year, class/programme, section, date of birth, phone, Faculty ID, employee number, department and designation.
- **Catalog/copies:** discover public titles with truthful per-title counts (total, available, issued, on hold, waitlist); every physical copy carries a backend-generated unique accession number (`ACC-<year>-<id>`) plus its barcode. Privileged users manage catalog and copies, list all copies of a title, and retire/recover copies (lost, damaged, maintenance, withdrawn) with a reason note. Copy status determines availability.
- **Circulation:** librarian issues/returns by barcode, personal loan list with live due countdowns, renewal eligibility, due dates (20-day student standard, configurable), overdue fine accrual, and reservation queue/hold lifecycle with a 12-hour pickup window.
- **Notifications:** private inbox and read state; one-click manual due/overdue reminders; scheduled in-app due/overdue alerts. Email/SMS delivery is not enabled by default.
- **Support chat:** database-backed private conversations; a requester can only see their own tickets; Admin/Librarian staff can handle library tickets. New messages create inbox notifications.
- **Analytics:** server-computed inventory, copy availability, active loans, due/overdue counts, reservations, members, open fine balance, circulation trend and popular titles. Admins also see account counts.
- **Library360 AI:** OpenRouter calls are proxied through the backend; model and API key are Admin-controlled; public catalog matches can ground book recommendations. No personal-record retrieval tools are exposed to the model.
- **Admin policies:** Admin can configure Student/Faculty lending, reservation and fine rules.
- **UI:** responsive role-aware navigation, reading list, quick navigation, dark/light mode, CSV exports for supported data tables and clear API failure states.

## Prerequisites

- Java 21 or newer
- Maven 3.9 or newer
- Node.js 22 or newer and npm
- MySQL 8.0 or newer
- Optional: an OpenRouter API key for the AI assistant

## Local setup (Windows PowerShell or terminal)

1. Create a MySQL database/user for `library360` (or use a dedicated local dev account). Do not use a production database while testing.
2. Copy `.env.example` to `.env` and replace all placeholders. `.env` is ignored by Git.
3. Generate **different random values** for `JWT_SECRET` and `APP_SETTINGS_ENCRYPTION_KEY`. For example in modern PowerShell:

   ```powershell
   [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
   [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
   ```

   Use the first result for `JWT_SECRET` and second for `APP_SETTINGS_ENCRYPTION_KEY`. Keep both secret. The encryption key must decode to exactly 32 bytes; losing/changing it makes the stored OpenRouter key unreadable.

4. Start the backend in `library360-api` with environment variables loaded into your shell, then run:

   ```powershell
   mvn spring-boot:run
   ```

   Spring Boot does not automatically load `.env`. Either set each variable in your shell/process environment or use the helper `scripts/run-backend.ps1`, which reads the root `.env` for the current PowerShell process and launches Maven.

5. In a separate terminal, run the frontend:

   ```powershell
   cd library360-ui
   npm ci
   npm run dev
   ```

   Open `http://localhost:5173`. Vite proxies `/api` requests to `http://localhost:8081` for local development. If you set a different backend address, define `VITE_API_BASE_URL` in `library360-ui/.env.local`.

6. Admin seeding uses `ADMIN_EMAIL`/`ADMIN_PASSWORD` and librarian seeding uses `LIBRARIAN_EMAIL`/`LIBRARIAN_PASSWORD` (both need 6+ characters with letters and numbers); both seed only when the account does not exist yet. Use strong unique passwords. Public signup cannot create an Admin or Librarian.

Flyway applies database migrations V1–V8 on backend startup. V7 backfills unique accession numbers for existing copies and moves untouched defaults to the 12-hour pickup window and 20-day student loans (admin-customized policies are preserved). V8 adds the extended 24-title college catalog. For an existing development DB, back it up first and inspect Flyway migration history before upgrading. Do not manually rerun migrations already recorded as applied.

## Configure OpenRouter

1. Generate and configure `APP_SETTINGS_ENCRYPTION_KEY` before starting the backend.
2. Sign in as Admin and open **AI provider**.
3. Save an OpenRouter API key and a model identifier supported by your account.
4. Other roles can use the assistant but cannot read/change the saved key or model settings.

The key is encrypted server-side using AES-GCM and the browser receives only a configured/status flag and model name. AI answers are not an authorization mechanism. The assistant is intentionally not given private user data or tools that execute library transactions; it cannot actually issue/return/reserve/pay/approve/send messages on the user's behalf. Safety checks and role instructions reduce risk but cannot guarantee every model output is safe, so the assistant must not be used as a privileged workflow or policy authority.

## Security and real-world limitations

- Use HTTPS in deployments and `COOKIE_SECURE=true`. Keep database credentials, JWT secret, encryption key and OpenRouter key outside source control.
- User deletion is a soft-disable to protect loan, payment and audit history.
- Date of birth and personal identifiers are sensitive; expose them only in owner profile views and authorized registration review/admin workflows.
- Email/SMS delivery, payment-gateway integration, identity-provider OAuth, and external college SIS integration require credentials and institution-specific setup; they are not claimed as active features.
- The in-app notification scheduler runs daily for due-soon/overdue alerts; staff can manually send in-app reminders. It requires the backend to remain running and the database to be available.
- Reservation assignment uses Faculty priority first, then FIFO within each priority tier. Confirm this operational policy with the college before production use.
- The v3 changes have had static source checks in this environment; full Maven tests and a Vite production build could not be completed here because Maven and installed npm dependencies were unavailable. Follow the validation steps below before a college demo.

## Validation checklist

Backend, from `library360-api`:

```powershell
mvn test
mvn spring-boot:run
```

Frontend, from `library360-ui`:

```powershell
npm ci
npm run build
npm run lint
```

Then test with four distinct accounts and a disposable MySQL database: Student/Faculty pending login rejection and approval; Librarian circulation/returns/reservations; Student ownership/privacy on loans, fines and messages; Admin user/suspension/role/required-field/policy/AI settings; scheduled reminders; and OpenRouter unavailable/invalid-key errors. Never test by altering production accounts or real fine records.
