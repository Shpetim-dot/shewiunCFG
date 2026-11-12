# Competitors: evidence and comparison protocol

Reviewed 2026-11-12. This supersedes earlier unsupported rankings, fixed source counts, prices and claims that competitors lack governance. No comparative superiority has been demonstrated.

## Official sources retrieved

These sources were retrieved successfully in this review. They describe vendor capabilities, not independent performance measurements; main-branch documents can change.

| Product | Official source | Documented capabilities | Implication |
|---|---|---|---|
| CrewAI | [README](https://github.com/crewAIInc/crewAI/blob/main/README.md), Control Plane / AMP / Crews and Flows | Crews, event-driven Flows, memory, knowledge, checkpointing, MCP/A2A; commercial AMP advertises deployment, observability, governance and security; Control Plane free entry point | Multiple agents and governance alone do not differentiate Shewiun. Plan-specific limits need separate verification. |
| OpenClaw | [README](https://github.com/openclaw/openclaw/blob/main/README.md), overview / Security | Personal/shared gateway, messaging channels, local state/memory, model/harness plugins. Explicitly warns that main-session tools run on the host unless sandboxing is configured | Learn from continuity and channel access; keep policy outside agent instructions and untrusted execution isolated. Self-hosting alone does not guarantee safety. |
| OpenAI Agents SDK | [README](https://github.com/openai/openai-agents-python/blob/main/README.md), Core concepts | Provider-agnostic agents, handoffs, tools/MCP, guardrails, human-in-the-loop, sessions, tracing and sandbox agents | Do not claim it lacks human review or is necessarily vendor-locked. Developer SDK comparisons differ from finished workspace comparisons. |

## Evidence gaps

| Requested product | Observed evidence | Outstanding verification |
|---|---|---|
| Grok Bots | User screenshots show navigation, chat, details and computer/voice controls. Official x.ai/grok retrieval blocked by proxy, 403 | Current capabilities, availability, plans, pricing, execution isolation. Screenshots are design references, not reliability benchmarks. |
| CrewAI managed platform | Commercial positioning confirmed in official project README; docs.crewai.com retrieval blocked, 403 | Plan-specific approvals, governance, tenancy and pricing. |
| ChatGPT | openai.com/chatgpt/overview retrieval blocked, 403 | Current product features and comparable workflow evaluation. Agents SDK findings do not establish ChatGPT features. |
| OpenAI Dots | Official product identity/URL not established | Authoritative reference required; do not silently substitute another OpenAI product. |
| Openmausbot | Name ambiguous; OpenClaw official source reviewed separately | Confirm whether this refers to OpenClaw or another product. |
| Town / Townies | Official product identity/URL not established | Authoritative reference required before assigning capabilities or weaknesses. |

No competitor account, paid plan, pricing, privacy certification, quality ranking or measured latency was verified. Unknown does not mean absent. Consult FEATURE_STATUS.md for Shewiun's actual implementation.

## Differentiation hypothesis

Specialised agents plus a project-to-deliverable workspace: brief, project knowledge, plan, evidence, editable result, human review and a record of authorised actions. An independent control plane governs permissions while the runtime performs work. This is a customer-value hypothesis, not proof competitors cannot do it.

Validate one initial workflow with design partners: client proposal, project status report or software review. Compare the customer's current process and relevant products, not only agent frameworks.

## Fair evaluation protocol

Use identical synthetic project packets, dated source snapshots, prompts, model/budget constraints and predefined acceptance criteria. Run at least five independent repetitions. Record product/version, plan, settings, date, failed attempts and human interventions. Do not use private customer data without authorisation.

| Dimension | Measure |
|---|---|
| Completion | Fraction meeting acceptance criteria; complete, partial and failed separately |
| Evidence | Supported material claims / checked material claims; inspect original source passages |
| Quality | Blind review of correctness, usefulness, assumptions and required rework |
| Efficiency | Wall-clock time, active human minutes and total cost per accepted result including retries |
| Control | Correct allow/deny decisions for changed payload, expired approval, revoked grant and cross-tenant requests |
| Reliability | Interrupt/restart, cancellation, provider failure and duplicate external action outcomes |
| UX | Time to first useful output, task completion across phone/tablet/desktop, accessibility defects |

Results pending. Do not publish invented scores, agent certifications or best-model claims.
