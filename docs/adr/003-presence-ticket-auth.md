# ADR 003: Short-lived presence tickets for WebSocket auth

**Status:** Accepted  
**Date:** 2026-06-02

## Context

Authenticating WebSockets via `?token=<jwt>` leaks credentials in proxy logs, browser history, and Referer headers.

## Decision

1. Client calls `POST /v1/presence/ticket` with Bearer JWT and optional `hall_id`.
2. API returns `{ "ticket": "...", "expires_at": "..." }` — single-use, TTL 60s, bound to user (and optionally hall).
3. Client opens `wss://presence.mneme.app/v1` and sends first message:

```json
{ "type": "auth", "payload": { "ticket": "..." } }
```

4. Gateway validates ticket with `auth` module / Redis, then allows `join_hall`.

**Do not** pass long-lived JWTs in query strings.

## Consequences

- Ticket store in Redis: `presence_ticket:{id}` with TTL.
- Rate-limit ticket issuance per user/IP.

## Related

- `ARCHITECTURE.md` §10.4, §11
- `SECURITY_PRIVACY.md` §5.1
