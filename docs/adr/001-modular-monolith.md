# ADR 001: Modular monolith for MVP

**Status:** Accepted  
**Date:** 2026-06-02  
**Deciders:** Mneme engineering

## Context

`ARCHITECTURE.md` describes multiple services (`auth-service`, `hall-service`, etc.). Deploying nine independent services before product-market fit adds operational cost, distributed debugging overhead, and slows iteration.

## Decision

**MVP (Phases 1–3)** ships as a **single deployable API** (NestJS or Express) with clear modules:

```
apps/api/src/modules/
  auth/
  library/
  reader/
  hall/
  ai/
  community/
  profile/
  notifications/
```

**Exceptions for Phase 2:**

- `presence-gateway` — separate process when WebSocket load justifies it (target: before 500 concurrent hall users in production).

**Phase 4+:** Extract `ai-service` and/or `hall-service` only when metrics show CPU/latency isolation need (not before).

## Consequences

- One PostgreSQL database with schemas or table prefixes per module (acceptable for MVP).
- Internal calls are in-process; replace with HTTP/gRPC when splitting services.
- OpenAPI and module boundaries must stay strict so extraction is mechanical later.

## Related

- ADR 002 (RAG / pgvector)
- ADR 003 (presence ticket auth)
- `ARCHITECTURE.md` §6, §20
