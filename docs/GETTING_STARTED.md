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
```

Seed creates demo user `reader@mneme.local` and three sample books.

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
| auth     | `/v1/auth`     | 1     |
| library  | `/v1/books`    | 1     |
| reader   | `/v1/reader`   | 1     |
| hall     | `/v1/halls`    | 2     |
| ai       | `/v1/ai`       | 3     |

## Stop services

```bash
npm run docker:down
```

## Next build steps

1. Auth (magic link or OAuth)
2. Protected `/me/library`
3. Reader with chapter content from MinIO

See [ARCHITECTURE.md](../ARCHITECTURE.md) and [docs/AUDIT.md](../docs/AUDIT.md).
