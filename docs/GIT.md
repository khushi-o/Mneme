# Git — What to push and what to ignore

Use this before every commit so the repo stays clean and safe for placements / open source.

---

## Push these (valid files)

### Root

| File / folder | Why push |
|---------------|----------|
| `README.md` | Project homepage |
| `ARCHITECTURE.md` | System design |
| `SECURITY_PRIVACY.md` | Security / privacy baseline |
| `demo.html` | UX planning demo |
| `docker-compose.yml` | Local infrastructure recipe |
| `package.json` | Root scripts + workspaces |
| `package-lock.json` | **Required** — locks exact dependency versions |
| `.env.example` | Template only (no secrets) |
| `.gitignore` | Tells Git what to skip |

### apps/api

| Push | Don't push |
|------|------------|
| `package.json`, `tsconfig.json` | `node_modules/` |
| `migrations/*.sql` | `dist/` (compiled JS) |
| `src/**/*.ts` | `.env` |

### apps/web

| Push | Don't push |
|------|------------|
| `package.json`, `tsconfig.json`, `vite.config.ts` | `node_modules/` |
| `index.html` | `dist/` (production build) |
| `src/**/*` | `*.tsbuildinfo` |

### packages/shared

| Push | Don't push |
|------|------------|
| `package.json`, `src/**/*` | `node_modules/` |

### docker/

| Push | Don't push |
|------|------------|
| `postgres/init.sql` | Docker volume data (never in repo) |

### docs/

| Push all `.md` and `adr/*` | — |

---

## Never push these

| Item | Reason |
|------|--------|
| **`node_modules/`** | Huge; run `npm install` instead |
| **`.env`** | Contains secrets (JWT, API keys, passwords) |
| **`dist/`** | Built output; run `npm run build` locally or in CI |
| **`*.tsbuildinfo`** | TypeScript cache |
| **`.env.local`, `.env.production`** | Secrets |
| **`commit-msg.txt`** | Local temp file |
| **IDE folders** (`.vscode/`, `.idea/`) | Personal editor settings |
| **OS junk** (`.DS_Store`, `Thumbs.db`) | Not project files |
| **Log files** (`*.log`) | Noise |
| **Docker volume data** | Lives on your disk, not in Git |

---

## Safe commit checklist

Before `git add`:

```bash
git status
```

Confirm you do **not** see:

- `node_modules`
- `.env` (only `.env.example` is OK)
- `apps/api/dist`
- `apps/web/dist`

If `dist/` appears, it should be ignored — we list `dist/` in `.gitignore`.

---

## Recommended first push (scaffold)

These are the files that **should** be in your next commit:

```
.gitignore
.env.example
package.json
package-lock.json
docker-compose.yml
docker/postgres/init.sql
README.md
ARCHITECTURE.md
SECURITY_PRIVACY.md
demo.html
docs/**/*
apps/api/**/*
apps/web/**/*
packages/shared/**/*
```

---

## Commands to commit (run in external terminal)

Avoid Cursor adding `Co-authored-by: cursoragent` — use **PowerShell outside Cursor**:

```powershell
cd "c:\Users\cushh\OneDrive\Desktop\readable library"

git status

git add .
git reset HEAD .env 2>$null
git reset HEAD node_modules 2>$null

git status

git commit -m "feat: monorepo scaffold, docker-compose, and project guide"

git push origin main
```

If `cursoragent` still appears in Contributors, rewrite the commit without co-author (see previous chat) then `git push --force origin main`.

---

## What recruiters / reviewers should see

A clean Mneme repo shows:

- Strong **documentation** (README, ARCHITECTURE, GUIDE)
- Real **code structure** (api + web modules)
- **Docker** for reproducible setup
- **No secrets**, no `node_modules`, no build artifacts
- **Your commits only** (Khushi-o)

---

## If something wrong was committed

| Mistake | Fix |
|---------|-----|
| Pushed `.env` | Rotate all secrets immediately; remove from Git history |
| Pushed `node_modules` | Add to `.gitignore`; `git rm -r --cached node_modules`; recommit |
| Pushed `dist/` | `git rm -r --cached apps/*/dist`; recommit |
| cursoragent as contributor | Rewrite commit message without `Co-authored-by`; force push |

---

*See also: [GETTING_STARTED.md](GETTING_STARTED.md) · [GUIDE.md](GUIDE.md)*
