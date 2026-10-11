# Library360 3.0 — implementation and verification audit

## Included in the current source package

### Roles, identity, and profiles
- Roles: `ADMIN`, `LIBRARIAN`, `FACULTY`, `STUDENT` are seeded in V2. Role-aware sign-in requests optionally name the expected account type; the backend checks it only after password authentication.
- Public registration supports Student and Faculty only and always creates `approval_status='PENDING'`. Login rejects non-approved accounts. Admin/Librarian approval can approve or reject pending signups and sends an in-app notification.
- Sign-up field rules are stored in `signup_field_settings`. Admin can toggle display/required state and ordering for available Student/Faculty college fields; the server enforces fields marked required.
- V5 adds student college profile fields and `app_settings`; V6 adds first/last name, Faculty ID, employee number, department/designation, approval status, signup field rules, and private support conversation/message tables.
- Authenticated `/api/v1/profile/me` GET/PUT is scoped to JWT subject. Password change validates current password and strong new-password requirements, then revokes refresh-token sessions.
- Admin can create Student/Faculty/Librarian accounts, change non-admin roles, suspend/reactivate approved accounts, soft-disable users while preserving history, and issue a one-time randomly generated temporary password (with active refresh sessions revoked). Admin accounts are protected from these operations.

### Library operations
- Existing catalog, copies, circulation, reservation, fines and payment-ledger flows are retained.
- Reservation assignment prioritizes Faculty, then FIFO within the same priority tier. Student/Faculty borrowing policies are separately configurable by Admin through `/api/v1/admin/loan-policies`.
- Scheduled maintenance updates overdue status/accrued fines and expires reservation holds; a daily notification scheduler creates private due-soon and overdue in-app alerts.
- `/api/v1/analytics/overview` returns database-derived inventory, availability, issued/overdue, due-today, reservation, member, fine and user/role data with upcoming/overdue loan rows, monthly issuance counts and popular books.
- Staff can send manual in-app reminders to active approved Students, one searched Student/Faculty recipient, all overdue accounts and upcoming deadlines; analytics exposes a per-loan reminder action and identifies borrowers by college ID/role. Issue, return and reservation-ready transactions emit per-account notifications after commit. Pending/suspended accounts cannot receive new loans/holds; queue assignment skips inactive accounts, and suspension cancels queued/ready holds and frees/reassigns copies.

### Communication and AI
- `/api/v1/support/**` implements private Student/Faculty helpdesk conversations. A requester only sees their own tickets; Admin/Librarian can handle the helpdesk. Messages create notifications for the other side.
- `/api/v1/assistant/chat` proxies to OpenRouter. The API key is AES-GCM encrypted in `app_settings`; only Admin can update/check key configuration. A single Admin-controlled model is used server-side. Chat uses role-specific instructions and may receive public catalog search results; it does not receive private account records or transaction tools.
- The AI contains request and output guards for common private-data/harmful prompts. These checks are defense in depth, not a guarantee of perfect safety/privacy. The model must not be trusted as an authorization mechanism.

### Frontend
- Redesigned public landing/auth screens; login role selector for Student, Faculty, Librarian/Library management and Admin; self-signup form for Student/Faculty with configured college fields and pending-state screen.
- Pages/routes include role-aware dashboard with live staff operations metrics, catalog, circulation, members, reservations, fines, profile/password settings, searchable/paginated user administration, one-time account password reset, registration approval, signup requirements, loan/fine policies, analytics, private support chat with 12-second message refresh, notifications and AI assistant/provider settings.
- Admin navigation exposes account/settings/policy controls; Librarian navigation exposes approval, operational analytics, circulation and support; Student/Faculty navigation exposes personal workflows.
- CSV export, dark/light mode, responsive layout and clear API error feedback retained/added.

## Removed
- No container-image files, compose manifests, container-specific web-server config or container-ignore files are present in this source package. Local setup relies on installed Java/Maven, Node/npm, and MySQL.

## Checks actually performed in this environment
- TypeScript/TSX parser (`typescript.transpileModule`) was run over all 32 frontend TypeScript/TSX source files after the final edits: zero syntax diagnostics. This is a syntax/transpilation check, not a full Vite typecheck or production build.
- Source tree searches found no Docker/compose filenames and no Docker references in project text. The app uses local services without container files.
- Environment includes Java 21 and Node 22.
- A real frontend production build was attempted; it failed immediately because `vite/client` and `node` type packages were absent, and dependency installation stalled. This is an environment/dependency limitation, not a passing production build.
- `javac -proc:none` was attempted against the backend source: dependency/type resolution is blocked by 2,271 errors because framework/dependency jars are absent; no Java syntax-pattern diagnostics were found in that output. Maven is not installed, so `mvn test`, Flyway execution, Spring startup, and live database/API integration could not be run here. This does not count as a successful Java compile.

## Latest static validation summary
- Validated `package.json`, `package-lock.json`, and `tsconfig.json` as JSON, and `pom.xml` as XML.
- Confirmed V1–V6 migration files are present.
- Confirmed the updated analytics CSV export contains member role, admission/roll/faculty identifiers, branch/class/section and outstanding fine fields.
- Support messages now refresh every 12 seconds while a conversation is selected; users can still refresh manually.

## Required verification before submission
1. Configure a disposable MySQL 8 database and fresh random `JWT_SECRET` and `APP_SETTINGS_ENCRYPTION_KEY`; run the migrations with `mvn spring-boot:run` and confirm V1–V6 are recorded successfully.
2. Run `mvn test` in `library360-api`.
3. Run `npm ci`, `npm run build`, and `npm run lint` in `library360-ui`.
4. Test accounts for all four roles and confirm role boundaries with network/API calls, not just hidden menu items.
5. Test approval + rejection; profile update + password change; account suspension and refresh-token revocation; create/update book; issue/return/renew; reservation queue/expiry; due/overdue fine accrual; reminder inbox; support privacy; per-loan reminders; configurable policies; and OpenRouter key/model access.
6. Run prompt injection/privacy tests against the AI endpoint. The assistant is restricted by policy and contains simple request/output guards, but no general-purpose model filter guarantees absolute refusal or privacy.

## Known deployment dependencies / caveats
- Actual SMTP email/SMS delivery, a payment gateway, SSO/OAuth, and integration with the college SIS/student database are not active; in-app notifications and the existing staff payment ledger are implemented.
- Signup configuration controls predefined supported fields. It does not yet support arbitrary new custom field definitions without a schema/API extension.
- Book catalog retrieval supplied to AI uses public catalog fields only and is best-effort; users should use the catalog page for authoritative availability.
- Faculty-priority reservation assignment is implemented and should be confirmed by college policy owners before production.
- Profile uniqueness checks are backed by unique DB indexes. Race-condition conflicts can still surface as database constraint errors under simultaneous submissions and should be handled in production API exception mapping.
- Admin password reset generates a temporary secret once and revokes refresh sessions. Deliver that secret through a verified private channel and require the user to rotate it immediately; the app does not yet enforce a first-login password-change flag.
