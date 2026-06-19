# Lead Pipeline Client

TanStack Start (React 19) frontend for the lead pipeline platform. Gives admins and contractors a shared workspace for logging leads, reviewing them, drafting outreach emails, and tracking approvals through to completion.

## Tech Stack

- **TanStack Start** + **TanStack Router** (file-based routing)
- **React 19**
- **Vite**
- **Tailwind CSS 4**

## Prerequisites

- Node.js v20+
- The [backend service](../service/README.md) running and reachable

## Getting Started

```bash
npm install
cp .env.example .env   # set VITE_API_URL to point at the backend
npm run dev
```

App runs at `http://localhost:5173`.

## Environment Variables

| Key | Description |
| --- | --- |
| `VITE_API_URL` | Base URL of the backend API (e.g. `http://localhost:3000`) |

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server on port 5173 |
| `npm run build` | Build for production |
| `npm run preview` | Preview a production build |
| `npm run generate-routes` | Regenerate `src/routeTree.gen.ts` from `src/routes` |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier and fix lint issues |
| `npm run check` | Check formatting with Prettier |

## Authentication

Auth state is managed by `AuthProvider` (`src/lib/auth-store.tsx`):

- Only JWT tokens (`accessToken`, `refreshToken`) are persisted to `localStorage` under the key `lead-pipeline:auth`. The user object is **never** cached locally.
- On every page load, `GET /auth/me` is called to fetch the current user fresh from the database. This ensures contractor permission changes (made by an admin) are reflected immediately on refresh with no logout required.
- `logout()` calls `POST /auth/logout` and clears stored tokens.
- All authenticated requests go through `apiFetch` (`src/lib/api.ts`), which attaches `Authorization: Bearer <accessToken>`. On a `401`, it transparently calls `POST /auth/refresh`, retries the original request once, and logs the user out if the refresh also fails.
- `RequireAuth` (`src/components/RequireAuth.tsx`) guards routes by role (`admin` | `contractor`) or with a custom `allow` predicate.

## Routes

| Route | Access | Description |
| --- | --- | --- |
| `/login` | Public | Login form |
| `/` | Admin | Contractor leaderboard — efficiency stats and rankings |
| `/workflow` | Admin | All contractors overview |
| `/workflow/$contractorId` | Admin / own contractor | Contractor's lead queue and history |
| `/approvals` | Admin | Review leads pending approval, edit email draft, confirm approver |
| `/completed` | Admin | Approved and rejected leads with full timeline history |
| `/drafts` | Admin | Assign leads from the queue to contractors for email drafting |
| `/contractors` | Admin | Manage contractor accounts, permissions, and activity stats |
| `/about` | Public | About page |

## Contractor Portal

When a contractor logs in they are redirected to `/workflow/$contractorId`. Tabs shown depend on permissions granted by an admin:

| Permission | Tab shown |
| --- | --- |
| `leadsAccess` only | My Leads — log leads, review criteria, submit for approval |
| `draftEmailAccess` only | Draft Email — compose outreach emails for admin review |
| Both | My Leads + Draft Email tabs |
| Neither | Locked — contact admin message |

Permissions are read live from the DB on page load, so an admin granting access takes effect on the contractor's next refresh.

## Lead Pipeline

```
new → contractor_review → pending_approval → completed | rejected
```

- Contractors work a lead's checklist (`CriteriaChecklist`), add notes, and submit for approval.
- Contractors with `draftEmailAccess` can also draft outreach emails on their leads. Saving a draft sets `emailStatus: draft` and auto-assigns the lead to them.
- Admins review submissions in `/approvals` — they can edit the draft email, then click **Approve & Send Email**, which opens a confirmation modal showing who is approving (the logged-in admin's name) before sending via SMTP.
- Approving records the admin's identity (`approvedBy`) on the lead and sends the email automatically from `info@tempussolutions.io` to the lead's email address.
- The `/completed` view shows the full timeline for each lead: **Logged by [contractor]**, **Contractor Review by [contractor]**, **Approved/Rejected by [admin]**, **Email Sent**.

## Drafts Queue (`/drafts`)

Admin-only page for assigning leads that need email drafting to contractors:

- **Auto-assign** — picks the eligible contractor (active, both permissions enabled) with the fewest current leads.
- **Manual assign** — drop any lead onto a specific contractor. Eligible contractors are marked with ✓ in the selector.

## Key Source Files

| File | Purpose |
| --- | --- |
| `src/lib/auth-store.tsx` | Auth context, token persistence, `/auth/me` bootstrap |
| `src/lib/leads-store.tsx` | Leads context, all lead CRUD and workflow actions |
| `src/lib/contractor-analytics.ts` | Fetches per-contractor stats for the leaderboard |
| `src/lib/contractors.ts` | Fetches contractor user list |
| `src/data/leads.ts` | Lead, LeadStatus, EmailStatus type definitions |
| `src/components/RequireAuth.tsx` | Route-level auth + role guard |
| `src/components/StatusPill.tsx` | Status badge component |
