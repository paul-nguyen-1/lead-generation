# Lead Generation Service

NestJS backend for the lead generation platform. It provides JWT-based
authentication with role-based access control (RBAC), user management, and a
scraper module that discovers leads from business directories and company
websites.

## Tech Stack

- **NestJS 11** (Express)
- **MongoDB** via Mongoose
- **JWT auth** (`@nestjs/jwt`, `passport-jwt`) with access + refresh tokens
- **RBAC** via a custom `Roles` decorator + `RolesGuard`
- **BullMQ + Redis** for the scraper job queue
- **axios + cheerio** for static page fetching/parsing, with **Playwright**
  (Chromium) as a headless-browser fallback for JS-rendered pages
- **robots-parser** for robots.txt compliance
- **Swagger / OpenAPI** docs

## Prerequisites

- Node.js (v20+ recommended)
- A MongoDB instance (local or Atlas)
- A Redis instance (required for the scraper job queue)
- Playwright's Chromium browser binary:

  ```bash
  npx playwright install chromium
  ```

## Getting Started

```bash
npm install
cp .env.example .env   # then fill in the values for your environment
npm run start:dev
```

The API listens on `http://localhost:<PORT>` (default `3000`), and Swagger
docs are available at `http://localhost:<PORT>/api`.

## Environment Variables

Copy `.env.example` to `.env` and fill in the values below. **Never commit a
`.env` file with real secrets.**

| Key | Description |
| --- | --- |
| `PORT` | Port the HTTP server listens on |
| `MONGODB_URI` | MongoDB connection string |
| `CORS_ORIGIN` | Allowed origin for CORS (the client's URL) |
| `JWT_ACCESS_SECRET` | Signing secret for access tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (e.g. `15m`) |
| `JWT_REFRESH_SECRET` | Signing secret for refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. `7d`) |
| `SEED_ADMIN_EMAIL` | Email for the admin user seeded on first boot |
| `SEED_ADMIN_PASSWORD` | Password for the seeded admin user |
| `SEED_ADMIN_NAME` | Display name for the seeded admin user |
| `REDIS_HOST` | Redis host used by BullMQ |
| `REDIS_PORT` | Redis port used by BullMQ |
| `REDIS_PASSWORD` | Redis password (leave blank if none) |
| `REDIS_TLS` | Set to `true` for TLS-only providers (e.g. Upstash) |
| `SCRAPER_USER_AGENT` | User-Agent string sent with scrape requests and checked against `robots.txt` |
| `SCRAPER_DEFAULT_CRAWL_DELAY_MS` | Fallback per-domain delay (ms) when `robots.txt` has no `Crawl-delay` |
| `SCRAPER_REQUEST_TIMEOUT_MS` | Timeout (ms) for page fetches |
| `SCRAPER_WORKER_CONCURRENCY` | Number of scrape tasks processed concurrently per worker |

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run start:dev` | Start in watch mode |
| `npm run start:prod` | Run the compiled app (`dist/main.js`) |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | Run ESLint with `--fix` |
| `npm run test` | Run unit tests (Jest) |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:cov` | Run tests with coverage |

## Modules

### Auth (`/auth`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public | Log in with email/password, returns access + refresh tokens |
| POST | `/auth/register` | Admin | Register a new user |
| POST | `/auth/refresh` | Public | Exchange a refresh token for new tokens |
| POST | `/auth/logout` | Authenticated | Invalidate the current session |
| GET | `/auth/me` | Authenticated | Get the current authenticated user |

Roles are defined in `src/common/enums/role.enum.ts`: `Admin`, `Contractor`.

### Users (`/users`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/users` | Admin | List users, optionally filtered by `role` |
| PATCH | `/users/:id/status` | Admin | Activate/deactivate a user account |

### Scraper (`/scraper`)

Discovers and tracks leads from configured sources. Each **source**
describes where to crawl, a **job** is one crawl run of a source, and a
**lead** is a record extracted during a job.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/scraper/sources` | Admin | Create a scrape source |
| GET | `/scraper/sources` | Admin | List scrape sources |
| GET | `/scraper/sources/:id` | Admin | Get a scrape source |
| PATCH | `/scraper/sources/:id` | Admin | Update a scrape source |
| DELETE | `/scraper/sources/:id` | Admin | Delete a scrape source |
| POST | `/scraper/sources/:id/run` | Admin | Enqueue a crawl run for a source |
| GET | `/scraper/jobs` | Admin | List job runs (optionally filtered by `sourceId`) |
| GET | `/scraper/jobs/:id` | Admin | Get a job run and its stats |
| GET | `/scraper/leads` | Admin, Contractor | List leads (filterable by `sourceId`, `status`, `search`, paginated) |
| GET | `/scraper/leads/:id` | Admin, Contractor | Get a lead |
| PATCH | `/scraper/leads/:id/status` | Admin, Contractor | Update a lead's pipeline status |
| PATCH | `/scraper/leads/:id/assign` | Admin | Assign a lead to a user |

#### Source types

`type` on a `ScrapeSource` is one of:

- **`directory`** — a listing page (e.g. a business directory) is scraped
  using CSS `selectors` to pull out one entry per listing.
- **`company-site`** — a company's own website is crawled looking for
  contact pages, and contact details are extracted heuristically (mailto/tel
  links, email/phone regex, page title/og:site_name).

#### Creating a directory source

```json
{
  "name": "Local Contractor Directory",
  "type": "directory",
  "startUrls": ["https://example.com/directory"],
  "allowedDomains": ["example.com"],
  "selectors": {
    "listItem": ".listing",
    "name": ".listing-name",
    "phone": ".listing-phone",
    "address": ".listing-address",
    "website": "a.listing-website",
    "email": ".listing-email",
    "contactName": ".listing-contact",
    "nextPage": "a.next-page"
  },
  "maxDepth": 2,
  "isActive": true
}
```

#### Creating a company-site source

```json
{
  "name": "Cold Outreach List",
  "type": "company-site",
  "startUrls": ["https://example-company.com"],
  "allowedDomains": ["example-company.com"],
  "contactPaths": ["/contact", "/contact-us", "/about"],
  "maxDepth": 1
}
```

#### Job and lead status

- **Job status** (`src/scraper/enums/job-status.enum.ts`): `running`,
  `completed`, `failed`.
- **Lead status** (`src/scraper/enums/lead-status.enum.ts`): `new`,
  `reviewed`, `contacted`, `qualified`, `rejected`. Leads are deduplicated
  per source by email/website.

#### How a run works

1. `POST /scraper/sources/:id/run` enqueues a `ScrapeJob` and the source's
   `startUrls` onto the BullMQ `scrape` queue.
2. `ScrapeProcessor` (a BullMQ `WorkerHost`) pulls tasks off the queue. For
   each URL it:
   - Checks `robots.txt` via `RobotsService` and skips disallowed URLs.
   - Waits its turn for that domain via `DomainThrottleService`, which
     enforces the crawl delay from `robots.txt` (or
     `SCRAPER_DEFAULT_CRAWL_DELAY_MS`) using Redis.
   - Fetches the page via `FetcherService` — a static `axios` request first,
     falling back to a headless Chromium page (Playwright) if the static
     response looks like an empty client-rendered shell.
   - Extracts data with `ExtractorService` (directory listings via CSS
     selectors, or contact info via mailto/tel/regex heuristics).
   - Upserts `Lead` documents and enqueues any newly discovered URLs (next
     page, contact pages, etc.) up to `maxDepth`.
3. Job stats (pages visited, leads found, errors) are tracked on the
   `ScrapeJob` document, which is marked `completed` or `failed` once the
   job's tasks finish.

#### Running the scraper locally

1. Start Redis (e.g. `redis-server`, or via Docker) and make sure
   `REDIS_HOST`/`REDIS_PORT` in `.env` point to it.
2. Install the Playwright browser binary: `npx playwright install chromium`.
3. Set a real, identifying `SCRAPER_USER_AGENT` (include a contact URL/email)
   — this is checked against `robots.txt` and sent on every request.
4. Create a source with `POST /scraper/sources`, then trigger a run with
   `POST /scraper/sources/:id/run`.
5. Poll `GET /scraper/jobs/:id` for progress and `GET /scraper/leads` for
   results.
