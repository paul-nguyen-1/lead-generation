# Integration Guide

How the [`client`](client/README.md) (TanStack Start) and [`service`](service/README.md) (NestJS) talk to each other.

## Architecture

```
client (Vite, http://localhost:5173)  --HTTP-->  service (NestJS, http://localhost:3000)
```

- The client calls the service via `apiFetch` in `client/src/lib/api.ts`, targeting `import.meta.env.VITE_API_URL` (falls back to `http://localhost:3000`).
- The service must allow the client's origin via CORS (`CORS_ORIGIN` env var).

## Auth Flow

1. Client calls `POST /auth/login` with `{ email, password }`.
2. Service returns `{ accessToken, refreshToken, user }`.
3. Client persists **only the tokens** in `localStorage` under `lead-pipeline:auth`. The user object is not cached.
4. On every page load, the client calls `GET /auth/me` to fetch the current user fresh from the database. This guarantees contractor permissions are always current — no logout required after an admin changes them.
5. Every authenticated `apiFetch` call sends `Authorization: Bearer <accessToken>`.
6. On a `401`, the client calls `POST /auth/refresh` with the stored `refreshToken`, retries once with the new token, and logs the user out if the refresh also fails.
7. `POST /auth/logout` invalidates the session server-side; the client clears `localStorage`.

## RBAC

`user.role` is `admin` | `contractor`, matching `Role.Admin` | `Role.Contractor` on the service. Both `RequireAuth` (client) and `RolesGuard` + `@Roles()` (service) enforce role access.

Contractors also carry a `permissions` object (`leadsAccess`, `draftEmailAccess`) stored in MongoDB and returned by `GET /auth/me`. The client reads these to show/hide tabs in the contractor portal. The service re-validates them on the relevant endpoints (e.g. `PATCH /leads/:id/draft-email` returns `403` if the contractor lacks `draftEmailAccess`).

## Email Delivery

When an admin approves a lead (`PATCH /leads/:id/approve`):

1. The service records `approvedBy` (the admin's user ID) and sets `emailStatus: sent` on the lead.
2. If the lead has a draft email subject and a recipient email address, `EmailService` delivers it via Gmail SMTP using Nodemailer (STARTTLS, port 587).
3. The `From` address is `CONTACT_TO_EMAIL` (e.g. `info@tempussolutions.io`); `SMTP_USER`/`SMTP_PASS` are the Gmail credentials used for auth.
4. SMTP failures are logged but do not roll back the approval.

## CORS

The service enables CORS in `service/src/main.ts` using `CORS_ORIGIN` and `credentials: true`. Set `CORS_ORIGIN` to the client's URL (`http://localhost:5173` for local dev).

## Ports (local dev)

| App | Default Port | Configured via |
| --- | --- | --- |
| `service` | `3000` | `PORT` in `service/.env` |
| `client` | `5173` | `npm run dev` |

## Environment Variables

Key names only — fill in real values locally and never commit secrets.

### `service/.env`

```
PORT=
MONGODB_URI=
CORS_ORIGIN=

JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES_IN=
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=

SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_ADMIN_NAME=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
CONTACT_TO_EMAIL=
```

### `client/.env`

```
VITE_API_URL=
```

`VITE_API_URL` points at the running service (e.g. `http://localhost:3000`). `CORS_ORIGIN` on the service must match the client's origin (e.g. `http://localhost:5173`).

## API Docs

With the service running, Swagger UI is available at `http://localhost:3000/api`.
