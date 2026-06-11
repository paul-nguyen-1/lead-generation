# Lead Pipeline Client

A TanStack Start (React 19) frontend for the lead generation platform. It
gives admins and contractors a shared dashboard for managing leads as they
move through the review/approval pipeline, plus contractor account
management.

## Tech Stack

- **TanStack Start** + **TanStack Router** (file-based routing)
- **React 19**
- **Vite**
- **Tailwind CSS 4**
- **Vitest** + Testing Library

## Prerequisites

- Node.js (v20+ recommended)
- The [backend service](../service/README.md) running and reachable

## Getting Started

```bash
npm install
cp .env.example .env   # set VITE_API_URL to point at the backend
npm run dev
```

The app runs at `http://localhost:5173`.

## Environment Variables

| Key | Description |
| --- | --- |
| `VITE_API_URL` | Base URL of the backend API (e.g. the service's `http://localhost:3000`) |

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server on port 5173 |
| `npm run build` | Build for production |
| `npm run preview` | Preview a production build |
| `npm run generate-routes` | Regenerate `src/routeTree.gen.ts` from `src/routes` |
| `npm run test` | Run tests with Vitest |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier and fix lint issues |
| `npm run check` | Check formatting with Prettier |

## Authentication

Auth state is managed by `AuthProvider` (`src/lib/auth-store.tsx`):

- `login()` calls `POST /auth/login` and stores `{ accessToken, refreshToken,
  user }` in `localStorage` under the key `lead-pipeline:auth`.
- `logout()` calls `POST /auth/logout` and clears local storage.
- All authenticated requests go through `apiFetch` (`src/lib/api.ts`), which
  attaches `Authorization: Bearer <accessToken>`. On a `401`, it transparently
  calls `POST /auth/refresh`, retries the original request once, and logs the
  user out if the refresh also fails.
- `RequireAuth` (`src/components/RequireAuth.tsx`) guards routes by role
  (`admin` | `contractor`).
- `useGoHome()` redirects an admin to `/` and a contractor to
  `/workflow/$contractorId`.

## Routes

| Route | Access | Description |
| --- | --- | --- |
| `/login` | Public | Login form |
| `/` | Admin | Dashboard / lead overview |
| `/contractors` | Admin | View and activate/deactivate contractor accounts |
| `/workflow` | Admin/Contractor | Lead workflow overview |
| `/workflow/$contractorId` | Admin/Contractor | A specific contractor's lead queue |
| `/approvals` | Admin | Review leads submitted for approval |
| `/completed` | Admin/Contractor | Completed leads |
| `/about` | Public | About page |

## Lead Pipeline

Leads move through the following statuses (see `src/data/leads.ts`):

`new` → `contractor_review` → `pending_approval` → `completed` | `rejected`

- Contractors work a lead's checklist (`CriteriaChecklist`), add notes, and
  submit it for approval.
- Admins review submissions in `/approvals`, approving (which marks the lead
  `completed` and triggers the email step) or rejecting it.
- `LeadQueueList` and `StatusPill` render the queue and status badges across
  these views.

> Lead data currently lives in local component state / `localStorage`
> (`src/lib/leads-store.tsx`) seeded from `src/data/leads.ts`. Leads produced
> by the backend's [scraper module](../service/README.md#scraper-scraper) are
> served via `/scraper/leads` and are a separate, backend-persisted data set.
