# Feature status — implementation, not promises

Assessment: 2026-11-12. Read with `ARCHITECTURE_ASSESSMENT.md`. “Tested” means repository/local test evidence; it does not mean a connected production provider or external audit.

| Capability | Status | Evidence and remaining boundary |
|---|---|---|
| Business workspace, agents, chat | Implemented, locally tested | `cfa_core.py`, agent endpoints and tests. No-key responses are demo, not live AI. |
| Password identity, sessions, roles, CSRF | Implemented, locally tested | `auth.py`, auth/hardening suites; mail requires SMTP configuration. |
| TOTP and recovery codes | Implemented, locally tested | `auth.py`, `tests/test_mfa.py`; SSO/SAML/SCIM absent. |
| Organisation isolation | Implemented with application SQL, locally tested | `TENANT`, `org_id`, tenancy tests. Policy-hash cross-tenant interference fixed in this batch. Not PostgreSQL RLS or a formal isolation proof. |
| Personal/Business account products | Missing as distinct experiences | Existing organisation workspace is Business foundation. No account split in Batch 1. |
| Agent registry and accountability | Implemented | Bot metadata, owner/sponsor/purpose/model/scopes/spaces; no duplicate registry needed. |
| Agent configuration version history | Missing as comprehensive snapshots | Note versioning is not agent configuration versioning. |
| Brain provenance, review, version rollback | Implemented, locally tested | `governance.py`, `brain.py`, tests for links/search/memory permissions. No general freshness/expiry/conflict engine. |
| Semantic retrieval | Optional/partial | Embedding provider required for hybrid Brain search; agent chat uses keyword retrieval. PostgreSQL lacks SQLite FTS5 and uses fallback. |
| Multi-role Council | Implemented, locally tested | Existing direct and streaming Council, demo/live/mixed behaviour. Expertise quality not independently benchmarked. |
| Persistent Council runtime | Partial | Stored runs/events, checkpoints, retries, cancellation, restart recovery. In-process worker, no separate worker lease/scheduler or all-task durability. |
| Research search and source reader | Implemented/partial | Search providers, full-text extraction, domain diversity, gap retries, saved reports. Real web search requires credentials. Reader is text, not browser automation. |
| Citation auditing | Partial | Flags uncited numeric-like sentences and unknown references. Does not verify source entailment, factual accuracy or all numbers. |
| Evidence Graph and independent research review | Missing | No complete claim/passage/support/contradiction graph or independently evaluated truth checks. |
| Tool policy and grants | Implemented, locally tested | Per-agent grants, suspended-agent refusal, secret-tool denial, deterministic risk classification. |
| Human approval of exact tool write | Implemented, locally tested | Payload hash, policy version, TTL, revalidation, atomic claim; crash recovery/idempotency incomplete. |
| Control self-test and evidence share | Implemented, locally tested | Own-app probes, reports and scoped share capability. Not certification of arbitrary third-party agents. |
| Audit integrity | Implemented/partial | Org and per-agent hash chains, export, PG advisory locks. No external witness; agent-log errors can be swallowed. |
| Unified Proof of Work | Missing as complete platform capability | Existing audits/events are reusable foundations, not task-level acceptance verification. |
| OpenAI-compatible, Anthropic, Gemini providers | Implemented, mock-tested | Adapters, retries/fallback, usage. Live keys/provider contracts were not exercised during onboarding. |
| Cost and budget | Partial | Sourced price records and usage, unknown cost stays NULL; priced-spend caps are not a complete per-task compute budget. |
| Automatic quality routing and evaluation lab | Missing | No fair model/agent benchmark establishes superiority or certification. |
| MCP live tools | Implemented, mock/in-process tested | Streamable HTTP server connection, grants and review gates. Requires an actual authorized connected endpoint. |
| Slack/Notion/etc. native connections | Demo/catalog unless MCP-connected | Logos and catalog cards do not establish OAuth or live integrations. |
| Marketplace and presets | Implemented/partial | Curated presets/import with trust labels. No certified Expert Passport, fair benchmarks, signed agent versions or abuse-resistant ratings. |
| Computer/browser-use execution | Unconfigured/contract only | `computer_use.py`; no bundled isolated provider, session endpoint refuses with 501. |
| Projects and tasks | Implemented foundation | Existing project/task resources. Client-linked, editable, versioned, approved deliverables remain a productisation batch. |
| Billing and entitlements | Implemented, mock-tested; live unverified | Stripe handlers and plan metering. No real payment or live/test-mode Stripe walkthrough claimed. Existing prices are code configuration, not newly validated packaging. |
| PostgreSQL | Implemented, local app smoke tested | `dbx.py`, PostgreSQL 15.19 dev/test databases. Production use reported by user; no production access performed. Full test results tracked separately. |
| Backup | Implemented with environment prerequisite | SQLite snapshots; PG custom dumps require `pg_dump`. Development helper uses matching container client. Production restore drill still separate. |
| Security controls | Implemented foundation | Headers, fail-closed production API, rate limits, GDPR endpoints. No pentest, compliance certification or blanket production-readiness claim. |
| Responsive UX | In progress in Batch 1 | Existing mobile suite plus new interaction/evidence work. Final viewport evidence belongs in implementation log. |
| Interactive marketing demo | Batch 1 implementation target | Simulated fixture chats, navigation and scrolling; must be labelled demo and must not impersonate live execution. |
| Tauri desktop applications | Missing/out of scope | Future Windows/macOS/Linux batch, after stable web workflows. |
