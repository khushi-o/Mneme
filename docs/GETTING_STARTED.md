# Getting started

Local development setup for the Mneme monorepo.

## Prerequisites

- **Node.js** 20+
- **Docker Desktop** (for PostgreSQL, Redis, MinIO)

## 1. Clone and install

```bash
git clone https://github.com/khushi-o/Mneme.git
cd Mneme
npm install
```

## 2. Environment

```bash
cp .env.example .env
```

Edit `.env` if needed — defaults match `docker-compose.yml`.

## 3. Start infrastructure

```bash
npm run docker:up
```

Wait until Postgres, Redis, and MinIO are healthy:

```bash
docker compose ps
```

| Service  | Port  |
|----------|-------|
| Postgres | 5432  |
| Redis    | 6379  |
| MinIO    | 9000 (API), 9001 (console) |

MinIO console: http://localhost:9001 — login `mneme` / `mneme_secret`

## 4. Database

From repo root:

```bash
npm run db:migrate
npm run db:seed
npm run db:seed-content
```

Seed creates demo user `reader@mneme.local` and three sample books.  
`db:seed-content` uploads chapter HTML to MinIO (required for the reader).

## 5. Run apps

**Terminal A — API:**

```bash
npm run dev:api
```

**Terminal B — Web:**

```bash
npm run dev:web
```

Or both:

```bash
npm run dev
```

| App | URL |
|-----|-----|
| Web | http://localhost:5173 |
| API | http://localhost:4000 |
| Health | http://localhost:4000/health |
| Books | http://localhost:4000/v1/books |

## 6. Sign in (auth)

1. Open http://localhost:5173
2. Enter **`reader@mneme.local`** to see seeded library books
3. Click **Send magic link** → click the **dev magic link** on screen
4. After sign-in you should see **My library** (3 books)
5. Click a book to open the reader — scroll, change theme/font, then leave and return; progress is restored

Run after pull: `npm run db:migrate` (applies `002_auth_tokens.sql`).  
First time or after reset: also run `npm run db:seed-content`.

**Multi-chapter reader:** after updating chapter seed data, run both `npm run db:seed` and `npm run db:seed-content` (Docker must be running).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ECONNREFUSED` on `db:seed` or `db:seed-content` | Start **Docker Desktop**, then `npm run docker:up` and wait until `docker compose ps` shows healthy services |
| Reader: "Chapter file missing in MinIO" | `npm run db:seed-content` (with Docker up) |
| Reader: "Could not load chapters" | Restart API (`npm run dev:api`) after pulling code; sign in again |
| API offline in the app header | `npm run dev:api` in a separate terminal |

| Method | Path | Notes |
|--------|------|-------|
| POST | `/v1/auth/magic-link` | `{ "email" }` |
| POST | `/v1/auth/verify` | `{ "token" }` → JWT pair |
| GET | `/v1/auth/me` | Bearer required |
| GET | `/v1/me/library` | Bearer required |
| GET | `/v1/reader/books/:slug/chapters` | Chapter list (Bearer + library) |
| GET | `/v1/reader/books/:slug/chapters/:index/content` | Chapter HTML (Bearer + library) |
| GET/PUT | `/v1/me/reading-sessions/:bookId` | Reading progress |
| GET/PATCH | `/v1/me/reader-preferences` | Theme, font size |

## Monorepo layout

```
Mneme/
├── apps/
│   ├── api/          # Express modular monolith (@mneme/api)
│   └── web/          # React + Vite (@mneme/web)
├── packages/
│   └── shared/       # Shared types (@mneme/shared)
├── docker/
│   └── postgres/     # pgvector init
├── docs/             # ADRs, audit, testing
├── docker-compose.yml
└── package.json      # npm workspaces root
```

### API modules (scaffold)

| Module   | Route prefix   | Phase |
|----------|----------------|-------|
| health   | `/health`      | 1     |
| auth     | `/v1/auth`     | 1 ✅  |
| library  | `/v1/books`, `/v1/me/library` | 1 |
| reader   | `/v1/reader`, `/v1/me/reading-sessions`, `/v1/me/reader-preferences` | 1 ✅ |
| hall     | `/v1/halls`    | 2     |
| ai       | `/v1/ai`       | 3     |

## Stop services

```bash
npm run docker:down
```

## Next build steps

1. Book detail page (overview tab)
2. Bookmarks and highlights
3. Reading Hall (Phase 2)

See [ARCHITECTURE.md](../ARCHITECTURE.md), [docs/BRANCHING.md](./BRANCHING.md), and [docs/AUDIT.md](../docs/AUDIT.md).
