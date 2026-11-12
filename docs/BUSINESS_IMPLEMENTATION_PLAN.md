# Next batch: CFA Business project-to-deliverable workspace

This is an implementation proposal after the responsive UX increment, not a list of completed capabilities. Keep the existing Business application and shared backend. Personal account separation, Tauri and production migration remain later work.

## Primary workflow candidate

Project Intelligence: turn approved project updates into a client-ready status report. It reuses existing projects, Brain, agents, Council and review controls. Validate this choice with design partners before committing to proposal-generation or code-review integrations. Record the user's objective, intended audience and acceptance checks before starting any model work.

## Increment 2A — Project context

Extend the existing project model only after inspecting its current API and tenant ownership. Introduce explicit versioned migrations for new tables/columns, exercised on SQLite and PostgreSQL. Add optional stakeholder/client metadata, project-to-knowledge links and assigned-agent references. A project workspace exposes Overview, Context, Work and Deliverables with adaptive tabs/drawers rather than a new application.

Acceptance: create/update a project, attach authorised knowledge, assign an agent and reopen the workspace without lost state. Another tenant cannot discover project IDs, linked knowledge, files or assignments. Existing project API clients remain compatible. All seven viewports retain primary actions.

## Increment 2B — Reviewable deliverables

Add tenant/project-owned deliverables, immutable revision records, explicit draft/in-review/approved states and reviewer comments. Record objective, source references, assumptions, unknowns and agent/model contributions separately from the editable content. Store original source snapshots or stable excerpt references where authorised; a URL alone does not prove support. Use optimistic concurrency so simultaneous editing cannot silently overwrite work.

Acceptance: save, edit, compare two revisions, request review, reject/approve and export a report; preserve review history and identify exactly which revision was approved. Tests cover stale revisions, cross-tenant access and untrusted text rendering. Markdown/text export comes before complex document formats.

## Increment 2C — One connected work path

Reuse the persisted runtime through a task contract rather than creating a second queue: project, objective, acceptance checks, allowed sources/tools, budget, deadline and required review. Separate execution records from policy decisions. The worker revalidates permissions on resume and before each external action. A pending review is not successful execution; an uncertain external outcome is not automatically retried.

The first project-status workflow gathers permitted context, identifies blockers/unknowns, drafts a report and routes its saved revision to human review. Missing provider configuration uses an explicit sample/demo path, never an invented live result. External sharing remains a separate, payload-bound approval.

Acceptance: trace an objective to source context, run, saved revision, reviewer decision and export. Interrupt/restart, cancel, revoked permissions, provider failure and budget exhaustion have observable, truthful outcomes. Do not claim general durable research until research checkpoints are implemented.

## Increment 2D — Evidence and customer validation

Show a compact work record: planned, attempted, completed, verified and failed. Include source support, uncertainties, actual model usage/cost where priced and remaining review checks. Do not expose raw secrets or chain-of-thought. Audit-write failure must visibly prevent a complete-evidence claim.

Run a synthetic reference project against a human baseline, then recruit 3–5 authorised design partners. Measure active human time, accepted reports, rework, unsupported material claims and cost per accepted result. No invented benchmark scores, final prices or agent certifications.

## Release gate

Backend integration and tenant-negative tests on both databases; browser tests for project context, editor, review, tables, dialogs and export at 360/390/430/768/1024/1366/1920 px; accessible keyboard and touch flows; staging backup/restore and migration rehearsal; source/evidence review. Use a feature branch and pull request. Production deployment requires a separate approval after reviewable changes and staging evidence exist.
