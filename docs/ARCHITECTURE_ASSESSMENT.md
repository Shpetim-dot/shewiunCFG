# Architecture assessment — Batch 0

Assessment date: 2026-11-12. Branch: `feat/business-responsive-demo`. This is a code and local-test assessment, not a production security certification. The current application is the Business foundation; no second application, account split, desktop client, production migration or production deployment is part of this batch.

## Architecture and reuse

| Layer | Actual implementation | Assessment |
|---|---|---|
| HTTP application | `app/main.py`, FastAPI, startup schema initialization, mounted routers | Keep the existing API; 189 statically decorated HTTP handlers across `app/*.py` before this batch (not an OpenAPI operation count). |
| Website | `app/site.py`, HTML under `app/static/site/`, escaped server substitutions, sitemap and structured metadata | Public content is already delivered in initial HTML. Next.js is not required to make the landing page crawlable. |
| Workspace | `app/static/app.js`, `style.css`, vanilla JavaScript | Large shared state/render functions and append-only CSS make broad rewrites risky. Improve shared navigation, layout, dialogs and accessible controls incrementally. |
| Persistence | `app/dbx.py`, SQLite or psycopg PostgreSQL pool, SQL compatibility adapter | PostgreSQL exists today. FTS5 falls back to a plain scan on PostgreSQL. The adapter translates SQL rather than providing explicit, versioned migration files. |
| Identity and tenancy | `app/auth.py`, `cfa_core.TENANT`, organisation predicates in business queries | Sessions, roles and row-level tenancy exist. Isolation is enforced in application SQL, not PostgreSQL RLS; each new query must preserve it. |
| Agent registry | `bots`, model/scopes/spaces/status/owner/sponsor metadata, governance endpoints | Reuse this registry; no need to introduce another agent directory. Full configuration version snapshots and evaluation passports remain future work. |
| Model gateway | `providers.py`, `gateway.py`, `cfa_core.llm` | Native OpenAI-compatible, Anthropic and Gemini formats; retries, fallback, usage and sourced prices. Unknown prices remain unknown. No independently measured automatic quality router. |
| Control plane | `governance.py`, `mcp_apps.py`, `auth.py`, audit helpers | Scopes, memory review, risk classes, exact-payload approvals, expiry and execution revalidation already form a foundation. They are modules within one process, not a separate service. |
| Execution | Council direct/streaming paths plus `main.runtime_worker` and persisted runtime tables | Persisted Council checkpoints, retry/cancel/recovery exist. Research and other direct streams do not thereby become durable. One in-process worker remains the supported topology. |
| Evidence | Organisation audit, per-agent chain, runtime events, research citation audit | Useful components, but no unified task acceptance contract or complete cross-module Proof of Work ledger. A hash chain is not an externally signed immutable ledger. |
| Integration | MCP Streamable HTTP and explicit per-agent grants | Live capability requires a connected service. Catalog entries and demos are not OAuth integrations. |
| Computer use | `computer_use.py` provider protocol and readiness contract | Unconfigured. No bundled provider; session handler returns 501. Agent commands must never run on the application server. |

The proposed Agent Control Plane should join existing identity, registry, policy, grant, approval and audit decisions around a task identifier. The runtime executes permitted steps; agents must not assign their own permissions. A separate worker can follow once task contracts, leases, idempotency and recovery semantics are tested. Naming ten new engines without those connections would add complexity without completing a workflow.

## Findings and technical debt

1. Root-level Python modules and `app/` duplicate deployment paths. Some pairs are identical; `main.py`, `governance.py` and `cfa_core.py` differ. Root and packaged frontend copies also coexist. Establish the active path before editing; do not silently remove fallback deployment support.
2. Root-level tests and `tests/` repeat filenames, sometimes with different expectations. Use `--import-mode=importlib` as the active SQLite CI does. Keep both test sets until ownership and coverage are deliberately consolidated.
3. Schema changes are performed at startup through CREATE/ALTER and schema markers. A future migration batch needs explicit migration identifiers, rollback decisions, production-size staging rehearsal and backups; an empty development database proves none of those.
4. Policy-version calculation in `mcp_apps.py` read grants without `org_id`. Because seed-agent IDs repeat, another organisation's grants could invalidate an unrelated approval. This batch adds the missing predicate and a regression test, retaining permission-change invalidation within the caller's organisation.
5. `agent_audit.append` intentionally swallows logging failures. This favours availability but means successful requests do not guarantee complete agent evidence. Before promising complete Proof of Work, define durable audit failure reporting or an outbox.
6. Pending tool writes atomically claim execution, but a crash after claim may leave `executing` indefinitely. There is no provider-side idempotency key or safe replay protocol. Do not automatically replay consequential actions.
7. The persisted Council worker uses a global default-model-key live flag and an older model-reply path. This is distinct from the newer per-agent multi-model Council flow. Unify behaviour only with live/demo/mixed and provider-failure regression tests.
8. Research includes bounded gap retries, domain diversification, full-page extraction and citation-presence checks. It does not prove source entailment, numeric correctness or contradiction resolution. A cited sentence is not automatically a verified fact.
9. MFA TOTP exists; the seed is stored in `users.mfa_secret`. Database access therefore exposes that second-factor seed. Plan encryption and key rotation before broader hosting; do not change encryption formats casually in a UX batch.
10. Existing documentation mixes historical snapshots with current claims. `AUTH.md`, `KNOWN_LIMITATIONS.md`, `STATUS-REPORT.md`, `RUNBOOK.md`, `SECURITY-QUESTIONNAIRE.md` and the older technical audit contain statements superseded by current code (PostgreSQL, tenancy, MFA, runtime, durable organisation limits). Treat them as historical where they conflict with this assessment and `FEATURE_STATUS.md`; operational instructions must be reconciled before a release.

## Test evidence and limits

The onboarding SQLite baseline completed with **415 passed** using the documented CI rate-limit override. The initial run without that override produced eight rate-limit failures; this was configuration, not eight proven product defects. Code compilation and dependency consistency checks passed.

Batch 0 targeted SQLite run: **37 passed** across both avatar test files, MFA, tenancy, agent audit and prior phase-one regressions. The previously mentioned avatar failures did not reproduce. The policy-isolation fix then passed **32 tests** across tenancy and v7 platform regression files. The new PostgreSQL policy-isolation regression passed (1 test). The full PG baseline completed with 412 passed, 1 SQLite-only skip and 2 missing-pg_dump failures; both affected tests passed after the environment prerequisite was supplied. Detailed outcomes are in `IMPLEMENTATION_LOG.md`; a targeted recheck is not a fresh full-suite pass.

A running PostgreSQL 15.19 development instance and a separate `cfa_test` database were prepared outside the checkout. The local app returned `status: ok` and `storage: postgresql`; `/` and `/app` returned HTML, and Chromium rendered the mobile login/composer surface without overflow or JavaScript exceptions. This is current-instance evidence, not production validation or a complete responsive interaction audit.

GitHub pull-request API inspection returned Forbidden in this environment. Existing PR status is therefore unknown. No production credentials, GCP SSH session or production database were used.

## Responsive acceptance boundary

Batch 1 must exercise 360, 390, 430, 768, 1024, 1366 and 1920 px with real interactions: agent switching, chat, navigation, details drawers, Escape/focus, forms, tables, project views, approvals and document content. Capture desktop, tablet and phone images. Report unsupported surfaces explicitly; screenshots alone do not establish functionality. Evidence and remaining issues belong in the implementation log.
