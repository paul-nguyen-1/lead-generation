# Lead Generation Pipeline

Full-stack lead management platform for Tempus Solutions. Contractors log and review leads, draft outreach emails, and submit them for admin approval. Admins manage the approval queue, assign drafts, track who did what, and trigger SMTP delivery, all from a single dashboard.

## Repo Structure

```
lead-generation/
├── client/      # TanStack Start (React 19) frontend
├── service/     # NestJS backend
└── INTEGRATION.md
```

- [Client README](client/README.md) — routes, auth, contractor portal, lead pipeline
- [Service README](service/README.md) — API reference, modules, env vars
- [Integration Guide](INTEGRATION.md) — how client + service talk, auth flow, SMTP, CORS

## Quick Start

**Service**
```bash
cd service
npm install
cp .env.example .env   # fill in MongoDB URI, JWT secrets, SMTP credentials
npm run start:dev      # http://localhost:3000  |  Swagger: /api
```

**Client**
```bash
cd client
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:3000
npm run dev            # http://localhost:5173
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | TanStack Start, TanStack Router, React 19, Tailwind CSS 4 |
| Backend | NestJS 11, MongoDB (Mongoose), JWT auth |
| Email | Nodemailer — Gmail SMTP, STARTTLS port 587 |

## How It Works

### Roles

| Role | What they can do |
| --- | --- |
| **Admin** | Full access — manage contractors, review approvals, assign drafts, view analytics |
| **Contractor** | Permission-gated — log leads, review criteria, draft outreach emails |

Contractor permissions (`leadsAccess`, `draftEmailAccess`) are set per-account by an admin and take effect on the next page refresh — no re-login needed.

### Lead Lifecycle

```
new → contractor_review → pending_approval → completed | rejected
```

1. Contractor logs a lead and works through the review checklist.
2. If enabled, contractor drafts an outreach email in the Draft Email tab.
3. Admin reviews the submission in the Approvals queue, edits the draft if needed, then confirms approval (with their name recorded).
4. On approval the email is sent automatically via SMTP from `info@tempussolutions.io` to the lead's email address.

### Admin Pages

| Page | Purpose |
| --- | --- |
| **Home** | Contractor leaderboard — leads, drafts, approvals, efficiency score |
| **Workflow** | Browse all contractors and their lead queues |
| **Approvals** | Review pending leads, edit draft emails, confirm + send |
| **Completed** | Full timeline history per lead (logged by / reviewed by / approved by) |
| **Drafts** | Assign leads from the queue to contractors — auto or manual |
| **Contractors** | Manage accounts, toggle permissions, view per-contractor activity |

## Environment Variables (summary)

See [INTEGRATION.md](INTEGRATION.md) for the full list. Minimum required:

```
# service/.env
MONGODB_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
SMTP_USER=
SMTP_PASS=
CONTACT_TO_EMAIL=info@tempussolutions.io

# client/.env
VITE_API_URL=http://localhost:3000
```
