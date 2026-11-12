# Security review — Batch 0 refresh

Reviewed 2026-11-12 against the packaged `app/` implementation. This replaces the earlier v7 statement that tenancy and MFA were absent. It is a local code/test assessment, not a penetration test or compliance certification.

## Existing verified controls

- Sessions and API keys, Argon2id passwords, login throttling/lockout, role checks, revocation, cookie CSRF plus Origin checks, and fail-closed production API behaviour (`auth.py`, `cfa_core.py`, auth/hardening tests).
- TOTP and hashed single-use recovery codes (`tests/test_mfa.py`). MFA seeds themselves remain readable in the database; see risks below.
- Organisation context and scoped business queries, including negative two-organisation tests (`tests/test_tenancy.py`). New queries still require review; this is not database-enforced RLS.
- Tool grants, suspension, secret-tool denial, payload hashes, approval expiry, policy-change revalidation and atomic execution claims (`mcp_apps.py`, v7 platform/tenancy tests).
- Draft/quarantined memory, space filters, verification, version history and rollback. Instruction-like detection is heuristic, not comprehensive prompt-injection prevention.
- Encrypted stored model/MCP keys, URL destination guards, no arbitrary agent shell execution, explicit unconfigured computer-use status.
- Organisation and per-agent hash chains with PostgreSQL advisory locking, export and integrity checks. Chains detect edits within the trust boundary; an administrator able to rewrite all data can recompute them.
- Durable per-organisation request counters plus separate in-process burst/login controls. These are distinct mechanisms; raising the test-only burst limit does not disable assertion coverage.

## Confirmed issue fixed in this batch

`mcp_apps.policy_version` hashed grants from all organisations sharing a bot/app identifier. Another tenant could therefore change an unrelated approval's policy version. The query now includes `org_id=pf.org()`; a regression proves that other-tenant grants leave the hash unchanged while own-tenant changes still invalidate it. This is cross-tenant availability/interference, not demonstrated unauthorized tool execution. Test outcomes are recorded in `IMPLEMENTATION_LOG.md`.

## Material remaining risks

| Risk | Consequence | Required follow-up |
|---|---|---|
| Agent audit append catches all exceptions | Successful action can lack a per-agent evidence entry | Durable outbox or explicit incomplete-evidence state and fault-injection tests. |
| Tool-call crash after `executing` claim | Outcome may be unknown; replay may duplicate external work | Provider idempotency, reconciliation, lease/uncertain state and restart tests. |
| MFA seed stored as plain text | DB compromise exposes second-factor seeds | Versioned encryption, key management, safe migration and rotation tests. |
| Application-only tenant predicates | Missing predicate can join tenant state unexpectedly | Query audit, common scoped access helpers, adversarial cross-tenant tests; evaluate RLS separately. |
| URL guard does not establish request-time DNS pinning | Destination changes can weaken initial SSRF validation | Resolve/pin at call time and test redirects/rebinding for every outbound path. |
| In-process worker and rate/login state | Multi-worker behaviour is not a supported scaling claim | Separate leased worker, durable throttling where needed, concurrency tests. |
| Citation checks are syntactic | Cited false/unsupported claims can look trustworthy | Source-passage entailment review, uncertainty labels and independent evaluation. |
| Backups are operator/instance scope | Backup export can expose all tenants | Keep operator-only; restore drills, offsite encryption and access policy. |
| Automatic startup schema evolution | Unexpected production data transformation | Explicit migrations, staging snapshots and rollback rehearsals. |

No new production network access or live data migration was used for this batch. The development PostgreSQL databases are independent of the user's running GCP deployment. Marketing demos must contain only fixture data and must never imply real approval or external execution.

## Release work not established here

A complete production backup/restore drill, externally verified SMTP/Stripe/provider flows, external penetration testing, SSO/SAML/SCIM, managed key rotation, WAF/DDoS/incident operations and formal compliance evidence are not established by unit tests. Dependency-audit CI configuration exists, but this review does not claim its latest remote result. Open-PR inspection was denied by the GitHub API in this environment. Do not call the product enterprise-grade or production-ready based on this document.
