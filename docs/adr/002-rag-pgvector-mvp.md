# ADR 002: RAG on PostgreSQL + pgvector (MVP)

**Status:** Accepted  
**Date:** 2026-06-02

## Context

Mneme needs grounded AI: in-reader Q&A, summaries, quizzes, and flashcards tied to licensed book text. Full-book prompts do not scale in cost, latency, or accuracy.

## Decision

| Phase | Retrieval store | When to change |
|-------|-----------------|----------------|
| MVP | **pgvector** in primary PostgreSQL | Default through ~5M chunks |
| Scale | Qdrant or OpenSearch k-NN | p95 retrieval > 100ms or >5M chunks |

**Ingestion:** Async worker on `book.ingested` event — chunk → embed → `book_chunks`.

**Not RAG:** Reading Hall presence, leaderboards, pure recommendations (use behavioral + metadata embeddings separately).

## Consequences

- Enable `CREATE EXTENSION vector` in all environments.
- Book deletion must `CASCADE` chunks and embeddings.
- User highlight embeddings are personal data; separate table with user-scoped delete on DSAR.

## Related

- `ARCHITECTURE.md` §13 (AI / RAG subsystem)
- `SECURITY_PRIVACY.md` §2, §5.2
