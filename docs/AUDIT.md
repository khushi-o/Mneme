# Mneme — Architecture audit (2026-06-02)

Audit of planning artifacts before implementation. **Remediation status:** documentation updated in this commit; application code not started (by design).

## Executive summary

| Area | Grade | Notes |
|------|-------|-------|
| Product / domain | A- | Reading Hall + privacy tiers are strong |
| Architecture doc | B+ → **A-** after RAG + ADR updates | |
| Security / privacy | B → **B+** after RAG + ticket auth | |
| RAG readiness | C- → **B** | pgvector pipeline specified |
| Scalability | B- | Monolith-first path documented |

## Resolved in documentation

| # | Finding | Resolution |
|---|---------|------------|
| 1 | Nine microservices on day one | [ADR 001](adr/001-modular-monolith.md) — modular monolith |
| 2 | Dual seat claim paths (REST + WS) | `ARCHITECTURE.md` §7.8 — hall-service single owner |
| 3 | JWT in WebSocket URL | [ADR 003](adr/003-presence-ticket-auth.md) |
| 4 | RAG underspecified | `ARCHITECTURE.md` §13 + [ADR 002](adr/002-rag-pgvector-mvp.md) |
| 5 | Missing `book_chunks` schema | `ARCHITECTURE.md` §9.1 |
| 6 | No idempotency table | `ARCHITECTURE.md` §9.1 |
| 7 | Seat occupancy index / audit | `released_at` + partial unique index |
| 8 | AI sync HTTP at scale | Async job + SSE documented §13.4 |
| 9 | RAG privacy / DSAR | `SECURITY_PRIVACY.md` §2, §5.2 |
| 10 | No testing strategy | [TESTING.md](TESTING.md) |

## Still open (implementation phase)

- [ ] `docker-compose.yml` (postgres + pgvector, redis, minio)
- [ ] `docs/openapi.yaml` from §10 APIs
- [ ] Application scaffold (`apps/api`, `apps/web`)
- [ ] k6 load tests for hall
- [ ] RAG eval dataset (50 Q / genre)

## RAG applicability (reference)

| Feature | RAG? |
|---------|------|
| In-reader Q&A, summary, quiz, flashcards | **Yes** — `book_chunks` |
| Catalog search | **Hybrid** — PG FTS MVP, OpenSearch later |
| Recommendations | **No** (vectors on metadata + behavior) |
| Reading Hall | **No** |

## Scale ladder (reference)

1. Modular monolith + pgvector + Redis + S3  
2. `presence-gateway` + embedding workers (queue)  
3. PG read replicas + OpenSearch (catalog FTS)  
4. Split `ai-service` + dedicated vector DB if needed  
5. Kafka for insights / leaderboard materialization  

See `ARCHITECTURE.md` §18 and §20.
