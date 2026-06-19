# Lead Generation Service

NestJS backend for the lead pipeline platform. Provides JWT authentication with role-based access control (RBAC), user management, lead tracking, email draft workflows, and Gmail SMTP delivery.

## Tech Stack

- **NestJS 11** (Express)
- **MongoDB** via Mongoose
- **JWT auth** (`@nestjs/jwt`, `passport-jwt`) — access + refresh tokens
- **RBAC** via custom `Roles` decorator + `RolesGuard`
- **Nodemailer** for Gmail SMTP outreach email delivery
- **Swagger / OpenAPI** docs at `/api`

## Prerequisites

- Node.js v20+
- A running MongoDB instance (local or Atlas)

## Getting Started

```bash
npm install
cp .env.example .env   # fill in the values
npm run start:dev
```

API listens on `http://localhost:<PORT>` (default `3000`). Swagger UI is at `http://localhost:<PORT>/api`.

## Environment Variables

| Key | Description |
| --- | --- |
| `PORT` | HTTP server port |
| `MONGODB_URI` | MongoDB connection string |
| `CORS_ORIGIN` | Allowed CORS origin (client URL) |
| `JWT_ACCESS_SECRET` | Signing secret for access tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (e.g. `15m`) |
| `JWT_REFRESH_SECRET` | Signing secret for refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. `7d`) |
| `SEED_ADMIN_EMAIL` | Email for the admin seeded on first boot |
| `SEED_ADMIN_PASSWORD` | Password for the seeded admin |
| `SEED_ADMIN_NAME` | Display name for the seeded admin |
| `SMTP_HOST` | SMTP server host (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (e.g. `587` for STARTTLS) |
| `SMTP_USER` | SMTP auth username (Gmail address) |
| `SMTP_PASS` | SMTP auth password (Gmail app password) |
| `CONTACT_TO_EMAIL` | From address on outgoing emails (e.g. `info@tempussolutions.io`) |

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run start:dev` | Start in watch mode |
| `npm run start:prod` | Run compiled app (`dist/main.js`) |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | ESLint with `--fix` |
| `npm run test` | Unit tests (Jest) |
| `npm run test:e2e` | End-to-end tests |
| `npm run test:cov` | Tests with coverage |

## Modules

### Auth (`/auth`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public | Log in, returns access + refresh tokens |
| POST | `/auth/register` | Admin | Register a new user (admin or contractor) |
| POST | `/auth/refresh` | Public | Exchange refresh token for new tokens |
| POST | `/auth/logout` | Authenticated | Invalidate session server-side |
| GET | `/auth/me` | Authenticated | Fetch current user fresh from the database |

`GET /auth/me` always reads from MongoDB — never from the JWT payload — so contractor permission changes are reflected immediately without requiring a re-login.

Roles: `admin`, `contractor` (`src/common/enums/role.enum.ts`).

### Users (`/users`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/users` | Admin | List users, optionally filtered by `?role=admin\|contractor` |
| PATCH | `/users/:id/status` | Admin | Activate or deactivate an account |
| PATCH | `/users/:id/permissions` | Admin | Set contractor portal permissions |

#### Contractor permissions

Each contractor document carries a `permissions` object:

```ts
{
  leadsAccess: boolean       // can log leads, review criteria, submit for approval
  draftEmailAccess: boolean  // can draft outreach emails for admin review
}
```

Permissions are read live from the DB on every page load (`GET /auth/me`), so toggling them via `PATCH /users/:id/permissions` takes effect on the contractor's next request with no logout required.

### Leads (`/leads`)

Manages the full lead lifecycle from logging through review, email drafting, admin approval, and SMTP delivery.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/leads/analytics` | Admin | Per-contractor efficiency stats and rankings |
| POST | `/leads` | Admin, Contractor | Log a new lead |
| GET | `/leads` | Admin, Contractor | List leads (filterable by `status`, `search`; paginated) |
| GET | `/leads/:id` | Admin, Contractor | Get a lead |
| PATCH | `/leads/:id/status` | Admin, Contractor | Update pipeline status |
| PATCH | `/leads/:id/assign` | Admin | Assign a lead to a contractor |
| PATCH | `/leads/:id/auto-assign-draft` | Admin | Auto-assign to eligible contractor with fewest leads |
| PATCH | `/leads/:id/criteria` | Admin, Contractor | Toggle a review criterion |
| PATCH | `/leads/:id/contractor-notes` | Admin, Contractor | Update contractor review notes |
| PATCH | `/leads/:id/admin-notes` | Admin | Update internal admin notes |
| PATCH | `/leads/:id/draft-email` | Admin, Contractor\* | Save or update the outreach email draft |
| PATCH | `/leads/:id/submit` | Admin, Contractor | Submit lead for admin approval |
| PATCH | `/leads/:id/send-back` | Admin | Return lead to contractor for more review |
| PATCH | `/leads/:id/approve` | Admin | Approve lead → sends email via SMTP, records approver |
| PATCH | `/leads/:id/reject` | Admin, Contractor | Reject lead |

\* Contractors must have `draftEmailAccess` enabled. Saving a draft also auto-assigns the lead to the calling contractor.

#### Lead pipeline statuses

`new` → `contractor_review` → `pending_approval` → `completed` | `rejected`

- **`new`** — just logged. Toggling a criterion or saving contractor notes moves it to `contractor_review`.
- **`contractor_review`** — contractor is working the checklist and notes.
- **`pending_approval`** — contractor submitted it; admin reviews in the Approvals queue.
- **`completed`** — admin approved. `emailStatus` is set to `sent`, `approvedBy` records the admin's user ID.
- **`rejected`** — rejected by admin or contractor.

#### Email status

`not_sent` → `draft` → `sent`

- A contractor saves a draft → `emailStatus: draft`, `draftEmailCreatedAt` set.
- Admin approves → `emailStatus: sent`, SMTP email delivered automatically from `CONTACT_TO_EMAIL` to the lead's email address. SMTP failures are logged but do not block the approval.

#### Auto-assign draft

`PATCH /leads/:id/auto-assign-draft` selects the eligible contractor (active, both permissions enabled) with the fewest currently assigned leads and assigns the lead to them.

#### Analytics

`GET /leads/analytics` returns per-contractor stats ranked by efficiency score:

| Field | Description |
| --- | --- |
| `totalLeads` | Total leads created |
| `completedLeads` | Approved leads |
| `rejectedLeads` | Rejected leads |
| `inProgressLeads` | Leads still in the pipeline |
| `draftLeads` | Leads where a draft email was created |
| `approvalRate` | `completedLeads / (completedLeads + rejectedLeads)` as a percentage |
| `leadsLast7Days` | Leads created in the past 7 days |
| `avgReviewHours` | Average hours from creation to contractor submission |
| `efficiencyScore` | Composite ranking score |
