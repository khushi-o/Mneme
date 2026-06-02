# Mneme — Testing strategy (planning)

Testing approach aligned with `ARCHITECTURE.md` and audit recommendations. Implement when application code lands.

## 1) Test pyramid

| Layer | Scope | Tools (planned) |
|-------|--------|-----------------|
| Unit | Domain logic, chunking, seat state machine | Vitest / Jest |
| Integration | API + PG + Redis | Testcontainers |
| Contract | OpenAPI request/response | Schemathesis or Dredd |
| E2E | Critical flows (login → read → hall seat) | Playwright |
| Load | WS hall, seat claims | k6 |
| RAG eval | Retrieval quality | Custom harness (see §5) |

## 2) Critical paths (must have E2E)

1. Magic link / OAuth login → library → open reader
2. Claim seat → heartbeat → release seat (no ghost occupancy)
3. AI message with book context returns citations
4. DSAR delete removes user highlights and highlight vectors

## 3) Reading Hall tests

- **Unit:** Seat state machine transitions (`available` → `held` → `occupied`)
- **Integration:** Two concurrent `claim_seat` → exactly one `200`, one `409`
- **Load (k6):** 500 claims/min, 1k WS connections, measure p95 claim latency

## 4) Contract tests

Generate OpenAPI from `docs/openapi.yaml` (future) and run on every PR:

- Auth, library, hall REST
- Problem+json error shapes

## 5) RAG evaluation harness

Maintain **50 questions per genre** with expected `book_id` + `chapter_id` (or chunk range).

| Metric | Target (MVP) |
|--------|----------------|
| Recall@5 (correct chapter in top 5 chunks) | ≥ 80% |
| Citation click-through (manual QA) | Subjective pass |
| Hallucination rate (no unsupported claims) | < 10% on eval set |

Run eval before changing embedding model or chunk size.

## 6) CI gates (planned)

- Lint + typecheck
- Unit + integration (Testcontainers)
- SAST + dependency audit
- OpenAPI contract diff
- Optional: nightly k6 smoke on staging

## 7) Observability in tests

Assert trace spans exist: `hall.claim_seat`, `rag.retrieve`, `rag.generate`.
