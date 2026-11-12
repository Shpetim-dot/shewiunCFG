# Product roadmap and prioritized issue list

Date: 2026-11-12. This is planned work, except explicit evidence in `IMPLEMENTATION_LOG.md`. Apply the more specific engineering brief: complete Batch 0, then Batch 1 before account separation. Keep existing Business functionality and use feature branches/PRs; never deploy to production without approval.

## Current and next batches

| Batch | Deliverable and acceptance gate |
|---|---|
| 0 — Audit/stability | Code-based architecture/status/security matrix, test baseline including avatars, known limitations, PR/CI access limits and responsive baseline. Fix confirmed small defects with regression coverage. |
| 1 — Responsive UX | Improve existing Business workspace and landing hierarchy, blue accents, agent identity and an interactive fixture demo. Real interactions and screenshots at 360/390/430/768/1024/1366/1920 px; preserve desktop and mobile functions. No account split. |
| 2 — Business productisation | Reuse projects/agents/knowledge; add a coherent client context and reviewable deliverable path. Define the data model and permissions before new surfaces. |
| 3 — Differentiated workflow | Validate one of proposal preparation, project intelligence or software delivery review with customers. Save/edit/version/export output linked to project, evidence and review. |
| 4 — Multi-model evaluation | Shared model routing/fallback semantics, priced cost/latency, controlled comparison fixtures and evaluation outcomes. No unmeasured “best model” claims. |
| 5 — Database safety | PostgreSQL already exists. Improve explicit migrations, staged upgrades, backup/restore, tenant isolation and rollback rehearsal; do not migrate live data in this UX task. |
| 6 — Durable execution | General task contracts, separate worker, leases/heartbeats, checkpoints, retries, resume/cancel, waiting approval, notifications and scheduling with idempotent side effects. |
| 7 — Evidence/governance | Join task, sources, decisions, approvals and outcomes into understandable Proof of Work; make audit failure visible. |
| 8 — Integrations/packs | Workflow-led GitHub/Drive/Slack/Notion/calendar/email/MCP connections; evaluated specialist packs with explicit prerequisites and limitations. |
| 9 — Desktop | Tauri 2, Windows/macOS/Linux, secure auth, updates, notifications, controlled file access and shared policies. |
| 10 — Personal | Separate mobile-first experience using shared backend; coding must be included, health specialisations Personal-only, strict personal/business data boundary. |
| 11 — Pilots/launch | 3–5 design partners, measurable outcomes, cost and willingness-to-pay validation; release gates and legal/operational review. |

## Prioritized engineering issues

| Priority / issue | Customer value | Technical impact | Dependencies | Complexity | Acceptance criteria |
|---|---|---|---|---|---|
| P0 — Cross-tenant approval policy hash | One team's changes cannot disrupt another team's approval | Scope grant hash by caller organisation | Existing tenancy context | S | Other-tenant grant leaves hash unchanged; own grant change invalidates it; SQLite and PG tests. Implemented in this batch, results in log. |
| P0 — Responsive workflow regressions | Work can be completed on the user's device | Shared navigation, drawers, tables, form/focus/scroll behaviour | Batch 0 baseline | M | Required seven viewports, keyboard/touch paths, no overflow, no hidden primary actions, screenshot artifacts. |
| P0 — Honest landing interaction | Visitor understands useful agent collaboration before sign-in | Isolated fixture state, accessible demo tabs and scroll | Existing server-rendered website | M | Switch conversations and views; clearly simulated data; no production APIs/writes; usable without animations and on keyboard/mobile. |
| P0 — Audit reliability | Reviewers can tell whether evidence is complete | Transactional outbox or explicit audit failure signal | Task identity and failure policy | M | Inject audit failure; system exposes missing evidence and never marks full proof verified. |
| P0 — Durable research | Research survives disconnect/restart | Persist research steps/sources/status in common runtime | General task contract; worker leases | L | Restart after source collection resumes without lost/duplicated artifacts; cancel and timeout tested. |
| P0 — Safe external-action recovery | Avoid duplicate customer updates/payments | Idempotency keys, claim leases, explicit uncertain outcome state | Provider contracts and approval binding | L | Crash around side effect cannot silently replay; expired/revoked permission blocks resume; uncertain outcome visible. |
| P1 — Project deliverable model | Customer receives editable finished work | Tenant/project-linked versioned artifacts and review records | Workflow interviews and project schema | L | Owner/permissions, version diff, review, export, evidence links and cross-tenant negative tests. |
| P1 — Claim evidence quality | Better decisions without false confidence | Claim/passage links, contradiction/unknown states, reviewer rubric | Saved source passages and safe provenance | L | Known supported/contradicted/unsupported fixtures classified; citation presence never equated to truth. |
| P1 — Unified provider/runtime modes | Consistent model selection and honest live/demo labels | Route persisted Council through shared provider semantics | Existing adapters and fallback tests | M | Per-agent provider honored; mixed/error modes match actual calls; usage recorded; restart tested. |
| P1 — MFA seed protection | Limit damage from a database disclosure | Encryption format and rotation/recovery policy | Managed encryption key and safe migration | M | New seeds protected, existing seeds migrated safely, login/recovery and key rotation verified. |
| P1 — Explicit schema migrations | Predictable production upgrades | Ordered, versioned migrations and rehearsals | PG integration CI, production-shaped backup | L | Upgrade a restored staging snapshot, verify rows/audit/tenancy, demonstrate rollback without data loss. |
| P1 — Evaluate experts and models | Users choose based on evidence | Versioned configs, fair evaluation fixtures and Expert Passport | Metrics rubric, reproducible runs | L | Publish test versions/results/limits; no certification without documented passing evaluation. |
| P2 — Personal/Business split | Personal simplicity with business data privacy | Account/workspace mode and strict context boundaries | Batch 1 done, shared task/artifact model | L | Personal coding retained, organisation data excluded, mobile/desktop flows independently tested. |

Complexity is relative (S/M/L), not a delivery promise. Customer recruitment, live integration credentials, external security review and production approval remain real prerequisites; documentation cannot substitute for them.
