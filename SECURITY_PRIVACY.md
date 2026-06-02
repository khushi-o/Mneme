# Security and Privacy Framework - Mneme

This document combines:

- Security controls and technical safeguards
- Privacy policy draft (user-facing baseline)
- Compliance and governance checklists

> This is a product and engineering baseline, not legal advice. Have local counsel review policy text before launch.

## 1) Security Principles

- Privacy by design and by default
- Least privilege for users, services, and operators
- Defense in depth at network, app, and data layers
- Secure defaults for every new feature
- Full auditability for sensitive actions

## 2) Data Classification

- Public: marketing content, non-sensitive catalog metadata
- Internal: operational metrics, aggregated analytics
- Sensitive: user profile attributes, reading history, highlights, AI prompts/responses
- Sensitive (RAG): indexed book chunks (licensed corpus), query embeddings (transient), `highlight_chunks` vectors
- Restricted: auth credentials, refresh tokens, presence tickets, encryption keys, payment artifacts

Controls strengthen as classification sensitivity increases.

## 3) Core Security Controls

### Authentication and Session Security

- OAuth + email magic links, with optional MFA and passkeys
- Short-lived access tokens and rotating refresh tokens
- Device/session visibility and remote logout
- Brute-force protection and account lockout thresholds

### Authorization

- Role-based and ownership-based checks on all protected resources
- Service-to-service authentication via signed tokens or mTLS
- Policy checks centralized in middleware and verified in tests

### Encryption

- TLS 1.2+ in transit
- AES-256 encryption at rest for databases and storage
- Secret management via vault/KMS; no secrets in code
- Field-level encryption for high-sensitivity attributes

### Application Security

- Input validation and output encoding on all user inputs
- CSRF protection for cookie-auth flows
- SQL injection and XSS protections via parameterized queries and sanitized rendering
- Dependency vulnerability scanning in CI

### Infrastructure Security

- Network segmentation (public edge vs private services)
- Firewall rules with explicit allowlists
- WAF in front of public APIs
- Immutable infrastructure and hardened base images

### Monitoring and Incident Response

- Security event logging for auth, policy denials, and data exports
- Real-time alerting for suspicious behavior patterns
- Incident triage runbook with severity matrix
- Post-incident reviews and control updates

## 4) Privacy Policy Draft (User-Facing Baseline)

## 4.1 Information We Collect

- Account data: name, email, login identifiers
- Reading data: books viewed, progress, highlights, bookmarks
- AI interaction data: prompts, context snippets, generated responses
- Device/technical data: app version, browser type, crash diagnostics
- Optional social data: club memberships, challenge participation
- **Reading Hall presence:** seat identifier, display mode (initials/avatar/anonymous), reading status (active/paused/away), hall membership timestamps — not book page content by default

## 4.2 How We Use Information

- Provide and improve core reading features
- Personalize recommendations and insights
- Generate AI responses based on your selected context
- Maintain security, prevent abuse, and enforce policies
- Send notifications you choose to receive
- Operate Reading Halls (seat assignment, presence to other readers in the same hall per your visibility settings)

## 4.3 Legal Bases (GDPR-Style)

- Contract: to provide requested product features
- Consent: for optional personalization, AI context depth, and marketing
- Legitimate interest: security, reliability, and anti-abuse operations
- Legal obligation: compliance and lawful requests

## 4.4 AI-Specific Processing

- AI responses are generated from **retrieved book excerpts** (RAG), not full books in the prompt
- Sensitive categories are minimized and redacted where possible
- Users can control AI context sharing via settings (including highlight-derived chunks)
- Provider usage is logged for reliability and abuse prevention
- Embeddings sent to third-party providers require DPAs; self-hosted embedding option documented for enterprise
- Rate limits: default 50 RAG requests per user per day (configurable by tier)

## 4.5 Data Sharing

- Service providers under data-processing agreements
- No sale of personal data
- Limited disclosure if required by law
- Business transfers with continuity of privacy commitments

## 4.6 Data Retention

- Account and reading data retained while account remains active
- AI conversation logs retained for product quality and safety windows
- Users can request deletion and export where applicable
- Backups follow fixed retention and secure destruction schedules

## 4.7 User Rights

- Access, correction, deletion, portability
- Restrict or object to processing where applicable
- Withdraw consent without affecting prior lawful processing
- Appeal or complain to supervisory authority where required

## 4.8 Children

- Platform is not intended for children below required legal age in target region
- Parent/guardian process required where law mandates

## 4.9 Contact

- Provide dedicated support and privacy contact channels before launch.

## 5) Privacy Engineering Requirements

- Consent banners and preference center implemented before analytics activation
- Granular toggles for:
  - AI context depth
  - Personalization and recommendation tracking
  - Community visibility controls
  - **Reading Hall:** anonymous seat, friends-only presence, hide book hints, disable highlight pulse
- Data export endpoint and deletion workflow
- Hall session logs retained only as long as needed for abuse investigation (configurable window)
- Purpose limitation documented per feature

## 5.2) RAG and vector data — controls

- Index only books with `rag_indexable = true` (licensed rights)
- `book_chunks` deleted on book removal (`ON DELETE CASCADE`)
- **DSAR delete cascade:** user account → `highlights` → `highlight_chunks` (vectors) → `ai_conversations` / `ai_messages`
- Query embeddings: do not persist by default; if logged for debug, TTL ≤ 7 days and redact prompt text
- Chunk text in prompts wrapped as data (`<excerpt>`) to reduce prompt-injection impact
- `ai_prompt_runs` stores `chunk_ids_used[]` for audit, not full corpus text

## 5.1) Reading Hall — Security and Privacy Controls

- Seat claims require authenticated session; rate-limited per user/IP
- WebSocket connections authenticated via **short-lived presence ticket** (not JWT in URL); idle disconnect
- `POST /v1/presence/ticket` rate-limited; tickets single-use, 60s TTL, stored in Redis
- No broadcast of book text, CFI, or highlights unless explicit opt-in per session
- Moderation: ability to remove user from hall and revoke seat without exposing reason publicly
- Redis seat locks and heartbeats must not store PII beyond opaque user IDs
- Audit log for hall kicks, repeated claim abuse, and bot-like connection patterns

## 6) AI Security and Safety Controls

- Prompt injection resistance and context isolation
- Prompt templates with strict instruction boundaries
- Safety filters for abusive or disallowed output classes
- PII masking prior to storage/logging when feasible
- Rate limits and abuse throttling on AI endpoints
- Red-team evaluation before major release

## 7) Compliance Readiness Checklist

- [ ] Terms of Service draft finalized
- [ ] Privacy Policy legally reviewed
- [ ] Data Processing Agreements signed with all processors
- [ ] Cookie and tracking disclosures implemented
- [ ] DSAR workflow tested (access, delete, export)
- [ ] Incident response tabletop exercise completed
- [ ] Penetration test and remediation complete
- [ ] Secrets rotation policy and cadence enforced

## 8) Operational Security Checklist

- [ ] SAST + dependency scan in CI
- [ ] DAST scan in pre-production
- [ ] Audit logging enabled and retained
- [ ] Backups encrypted and restoration tested
- [ ] Least-privilege IAM policies applied
- [ ] Alerting coverage for auth and AI abuse spikes

## 9) Recommended Security Backlog

1. Add passkey support and adaptive authentication
2. Add anomaly detection for account takeover
3. Implement tamper-evident audit logs
4. Add automatic data retention enforcement jobs
5. Add zero-trust internal service authentication

## 10) Launch Gate

Do not launch publicly until:

- Critical and high vulnerabilities are closed
- Privacy docs and legal notices are approved
- Incident response ownership is assigned
- Monitoring and alerting are live in production
