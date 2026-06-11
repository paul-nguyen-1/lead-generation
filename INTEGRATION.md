# Integration Guide

How the [`client`](client/README.md) (TanStack Start) and
[`service`](service/README.md) (NestJS) talk to each other.

## Architecture

```
client (Vite, http://localhost:5173)  --HTTP-->  service (NestJS, http://localhost:3000)
```

- The client calls the service via `apiFetch` in `client/src/lib/api.ts`,
  which targets `import.meta.env.VITE_API_URL` (falls back to
  `http://localhost:3000`).
- The service must allow the client's origin via CORS.

## Auth Flow

1. Client calls `POST /auth/login` with `{ email, password }`.
2. Service returns `{ accessToken, refreshToken, user }`.
3. Client persists this in `localStorage` under `lead-pipeline:auth`
   (`client/src/lib/auth-store.tsx`).
4. Every authenticated `apiFetch` call sends
   `Authorization: Bearer <accessToken>`.
5. On a `401`, the client calls `POST /auth/refresh` with the stored
   `refreshToken`, retries the original request once with the new
   `accessToken`, and logs the user out if the refresh also fails.
6. `POST /auth/logout` invalidates the session server-side and the client
   clears `localStorage`.

`user.role` is `admin` | `contractor`, matching the service's `Role` enum
(`Admin`, `Contractor`) in lowercase. `RequireAuth` on the client and
`RolesGuard`/`Roles` on the service both enforce access by role.

## CORS

The service enables CORS in `service/src/main.ts` using `CORS_ORIGIN` and
`credentials: true`. Set `CORS_ORIGIN` to the client's URL
(`http://localhost:5173` for local dev).

## Ports (local dev)

| App | Default Port | Configured via |
| --- | --- | --- |
| `service` | `3000` | `PORT` in `service/.env` |
| `client` | `5173` | `npm run dev` (`vite dev --port 5173`) |

## Environment Variables

Only key names are listed below — fill in real values locally and never
commit secrets.

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
```

### `client/.env`

```
VITE_API_URL=
```

`VITE_API_URL` should point at the running `service` instance (e.g.
`http://localhost:3000` for local dev), and `CORS_ORIGIN` on the service
should match the client's origin (e.g. `http://localhost:5173`).

## API Docs

With the service running, Swagger UI is available at
`http://localhost:3000/api`.
