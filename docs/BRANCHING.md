# Branching & deployment

Mneme uses a **promotion pipeline**: work lands on `feature`, integrates on `dev`, validates on `staging`, and ships from `main`.

## Branches

| Branch | Purpose | Deploy |
|--------|---------|--------|
| `feature` | Active development (auth, reader, fixes) | CI only |
| `dev` | Integration / shared dev environment | Auto → **development** |
| `staging` | Pre-production QA | Auto → **staging** |
| `main` | Production | Auto → **production** |

## Workflow

```text
feature  ──PR──►  dev  ──PR──►  staging  ──PR──►  main
   │               │              │               │
  CI            deploy dev    deploy staging   deploy prod
```

1. Branch from `feature` (or commit directly on `feature` while bootstrapping).
2. Open PR **`feature` → `dev`** when a slice is ready to integrate.
3. Open PR **`dev` → `staging`** after dev deploy looks good.
4. Open PR **`staging` → `main`** for production release.

Keep PRs small and require green **CI** before merge.

## GitHub Environments

Create three environments in the repo (**Settings → Environments**):

| Environment | Branch trigger | Suggested protection |
|-------------|----------------|----------------------|
| `development` | push to `dev` | Optional reviewers |
| `staging` | push to `staging` | 1 reviewer |
| `production` | push to `main` | Required reviewers + wait timer |

## CI

**`.github/workflows/ci.yml`** runs on every push/PR to `feature`, `dev`, `staging`, and `main`:

- `npm ci`
- Build `@mneme/api` and `@mneme/web`

## Deploy

**`.github/workflows/deploy.yml`** runs on push to `dev`, `staging`, and `main` (not `feature`).

It builds Docker images and pushes to **GitHub Container Registry**:

```text
ghcr.io/<owner>/mneme-api:<branch>-<sha>
ghcr.io/<owner>/mneme-web:<branch>-<sha>
```

Also tagged as `<branch>-latest` (e.g. `dev-latest`).

### Manual deploy

**Actions → Deploy → Run workflow** and pick `development`, `staging`, or `production`.

### Run images locally

```bash
docker pull ghcr.io/<owner>/mneme-api:dev-latest
docker pull ghcr.io/<owner>/mneme-web:dev-latest
```

Set env vars (`DATABASE_URL`, `JWT_SECRET`, `S3_*`, `WEB_URL`, etc.) per `.env.example`, then run the API container on port 4000 and web on port 8080.

### Package visibility

After the first deploy, open **Packages** on GitHub and set container package visibility (public or private) for your org.

## First-time setup (maintainers)

```bash
# Create long-lived branches on GitHub (once)
git push -u origin feature
git push -u origin dev
git push -u origin staging
```

Configure branch protection on `main` and `staging` (require PR, require CI status).
