# Implementation log

## 2026-11-12 — Batch 0 baseline and Batch 1 preparation

Branch: `feat/business-responsive-demo`. Changes are being assembled for review; no production deployment or migration was performed. Final commit and PR information must be appended after they exist.

### Inspected

The three supplied product prompts and visual references; packaged FastAPI/vanilla-JavaScript architecture; duplicated root/package layouts; setup/CI commands; identity/tenancy/MFA; provider routing and cost; Council and persisted runtime; Brain and research; MCP grants/approval execution; registry/presets/marketplace; billing; computer-use contract; operations/security documentation. The audit identified stale historical documentation and separates code from externally verified services in `FEATURE_STATUS.md`.

### Changes

- Added current product vision, architecture assessment, capability matrix, customer-value metrics and prioritized roadmap with acceptance gates.
- Refreshed security review without claiming certification or external verification.
- Scoped MCP approval policy-version grant lookup to the current organisation; added regression for repeated seed-agent IDs across tenants. Own-tenant permission changes continue to change the policy version.
- Local onboarding work outside the checkout prepared separate PostgreSQL 15.19 development and test databases. Production GCP data was not connected or modified. PostgreSQL backup requires a client; the setup helper uses the matching client's container binary.

### Evidence available

| Check | Actual result |
|---|---|
| Pre-change SQLite CI-style baseline | 415 passed; test-only `CFA_POSTS_PER_MINUTE=10000`, `--import-mode=importlib`, mobile suite separate. |
| Targeted avatar/MFA/tenancy/agent-audit/phase-one SQLite suite | 37 passed, 7 warnings. Avatar failures did not reproduce. |
| Tenant policy fix + v7 security platform SQLite regressions | 32 passed, 7 warnings. |
| PostgreSQL policy-isolation regression | 1 passed, 7 warnings. |
| PostgreSQL full baseline | 412 passed, 1 skipped (SQLite-only WAL/restore test), 2 failed because pg_dump was unavailable. After supplying the matching container-client helper, both affected backup tests passed (2 passed, 9 warnings). This is a full baseline plus targeted prerequisite rechecks, not a claim of a fresh all-green full rerun. |
| Local PostgreSQL application smoke | Health `ok`, storage `postgresql`; `/` and `/app` HTTP 200 HTML; Chromium mobile login/composer surface rendered without overflow/JavaScript errors. |
| Existing real-browser mobile suite | 4 passed with system Chromium; seven-viewport Batch 1 coverage remains a separate acceptance gate. |
| Open PR inspection | GitHub API Forbidden; PR status unknown, not a pass. |
| Live Stripe/SMTP/model-provider workflows | Not exercised; mocks or local fixture behaviour are not live-service verification. |
| Production deployment/data migration | Not performed. |

### Batch 1 evidence to append

Record changed UI files, interactions actually exercised, required seven viewport results, desktop/tablet/phone screenshot paths, remaining UX issues, test commands/results, security implications and final commit/PR. Do not describe Batch 1 as complete until important acceptance gaps have been assessed. Keep the next detailed Business workflow plan in `PRODUCT_ROADMAP.md` consistent with those results.

## Batch 1 responsive UX increment — 2026-11-12

Changed app/static/site/index.html, site.css, site.js and three original local agent SVGs: restrained white/ink/blue hierarchy, existing sections/routes/pricing/SEO retained; readable initial HTML, three scripted agent conversations with switching, keyboard control and independent scroll. The demo cannot send messages or execute live work. Product previews use semantic sample content instead of screenshot placeholders.

Changed app/static/app.js and style.css: direct desktop navigation, Agent control plane hierarchy, responsive KPIs, modal focus containment and inert background, Escape dismissal, trigger focus restoration, correct sheet-to-desktop semantics. Existing avatars and features retained. Added tests/test_landing_demo.py and tests/test_responsive_workspace.py. Installed-browser failures fail tests; polling callbacks respect existing strict CSP, which was not weakened.

Validation:
- Final backend/static SQLite suite: 416 passed, 10 warnings (CI request limit, importlib mode, mobile and new browser suites run separately).
- Existing mobile browser suite: 4 passed with system Chromium.
- Public demo: seven widths plus JavaScript-disabled reading; switching, keyboard, scroll preservation, separate tabs, mobile menu, no writes/overflow/JS errors.
- Workspace: seven widths for navigation, modal/sheet keyboard access; dark/reduced-motion resizing; seven widths for real approve and reject decisions confirmed in backend test data. No external action execution.
- Additional audit: 14 combinations of light/dark and 360/390/430/768/1024/1366/1920; chat, details, Control, Brain, Research, Inventory and Settings without overflow/JS errors. Results: /workspace/artifacts/platform-responsive-results.json.
- JavaScript syntax and CRLF-aware Git whitespace checks passed.

Screenshots outside the checkout:
- /workspace/artifacts/shewiun/landing-hero-{390,768,1366}.png
- /workspace/artifacts/shewiun/landing-demo-{390,768,1366}.png
- /workspace/artifacts/platform-control-light-{390,768,1366}.png
- /workspace/artifacts/platform-control-dark-{390,768,1366}.png
- /workspace/artifacts/platform-chat-{390,768,1366}.png
Files named platform-before-* were overwritten during repeated audit and are not valid baseline comparisons.

Updated competitor evidence in COMPETITORS.md and COMPETITIVE_ANALYSIS.md: official CrewAI, OpenClaw and OpenAI Agents SDK sources retrieved; unverified names and blocked official product sources clearly marked. No invented benchmarks or superiority claims. BUSINESS_IMPLEMENTATION_PLAN.md details the next project-context/deliverable/review increments and acceptance gates.

This is a verified Batch 1 increment, not complete product readiness or full Batch 1 acceptance. The existing frontend lacks a complete project-to-deliverable editor/review workspace; these screens cannot be marked tested. Document/project workflows, broader action/error states, durable research, live providers, external integrations and desktop apps remain future work. No production deployment, migration, account split or production data access occurred.

Local PostgreSQL installation/start instructions and non-secret connection selectors are saved in the environment draft. Review/save/publish and fresh-task restoration are separate operations; the latter is unverified. Production Google Cloud data remains untouched.

Combined browser-run diagnosis: repeated fresh logins in every viewport test correctly hit the existing ten-attempt authentication throttle, causing two login timeouts. The browser tests now authenticate once and reuse the returned session state in isolated contexts. Authentication limits and assertions remain unchanged. A separate resize polling failure was fixed by using CSP-compatible function callbacks rather than string-eval expressions; production CSP was unchanged. Final browser rerun result is recorded below.

Final combined landing/workspace browser run: 23 passed in 21.44 seconds, including seven approve/reject viewport cases. Existing mobile suite remains separately 4 passed. Security fix commit: 9227b41 (tenant-scoped approval policy hash). UX/audit changes are committed separately on feat/business-responsive-demo; see Git history for their exact immutable commit. GitHub API access for PR creation remains blocked until the configured destination is available; no PR or deployment is claimed here.
