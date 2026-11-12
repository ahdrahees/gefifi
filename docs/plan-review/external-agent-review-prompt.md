# External Review Prompt — Gefifi v3 Plans

> **How to use:** Give this entire document to the external reviewing agent, along with read access to the repository. Ask it to write its review to `docs/plan-review/external/2026-11-03-agent-review.md` and to **not** modify any plan file.
>
> **Status:** This prompt was executed on 2026-11-08 against the pre-revision plan. It is kept as a record, not as current scope. The revised plan is in `docs/plan/made-by-opencode/`, and the disposition of each review item is in README §16. In particular, full real-time chat and voice notes are now non-negotiable MVP scope, and the certificate is HTML, not PDF. **For a second opinion on the revised plan, use [external-agent-review-prompt-v2.md](external-agent-review-prompt-v2.md).**

---

## Role

You are an independent principal engineer and product reviewer. You have no loyalty to either plan. Your job is to find what is wrong, what is missing, what is over-engineered, and what is unproven — then recommend a consolidated plan that a solo founder can actually execute.

You are reviewing two competing/overlapping plans for **Gefifi v3**, a rewrite of an Indian construction marketplace:

- **Plan A — OpenCode:** `docs/plan/made-by-opencode/`
- **Plan B — Antigravity:** `docs/plan/made-by-antigravity/architecture/`

Do not assume Plan A is correct because it is newer. Do not assume Plan B is correct because it is more detailed. Treat both as proposals.

---

## Context: the product

Gefifi is a two-sided construction marketplace in India:

- **Customers** post work requests and material requests, compare quotes, sign contracts, and track milestones.
- **Experts** (contractors/tradespeople) quote for work.
- **Suppliers** quote for materials.
- **Admins** verify providers and handle disputes.
- The product also has an AI assistant, real-time chat, file uploads (photos, PDFs, DWG/DXF), and WhatsApp communication.

Current v2 is a prototype:

- SvelteKit SPA + Express API + Firestore + Python Google ADK agent.
- Roughly 190 source files, 0 automated tests, no CI workflows.
- Every capability is duplicated as a REST route and a Python HTTP tool.
- Human-in-the-loop safety is prompt-based, not server-enforced.
- There is no confirmed production data or serious user base; this must be validated, not assumed.

---

## Context: the original brief

This is the exact first prompt the founder gave to OpenCode, before any plan existed:

````text
we need to rewrite, rethink, redesign the entire gefifi.
now is the AI agentic software era. and our Gefifi need to be ready for it.

I need your help. but first what we have to do is plan?, how we are going to execute it?, what will be expected outcome?, will it be scalable, durable, super fast and very less development time?, which cloud should we use? devops method should we use?

you see that above I have all these kind of question.

```markdown
Category
Technologies
Backend
Go, Rust, TypeScript (NestJS / Encore.ts)
Database
PostgreSQL, Convex DB
Message Brokers & Event Streaming
RabbitMQ, Apache Kafka
Error Reporting Tools
Sentry
Observability & Monitoring (New)
Prometheus, Grafana
Agent
Frontend framework
React, Next.js, sveltekit
UI
[reui.io](https://reui.io) https://ui.shadcn.com
Cloud that im biased
Cloudflare
```

these are the technologies I'm thinking of using in my project. but i can be wrong and some technologies is not needed now maybe later, or some technologies dont match with the stack and we need to find a new. i dont know what im doing here. guide me first

after when we finalize the plan you can add plan in a markdown file at docs/plan/made-by-opencode
````

---

## Context: decisions the founder made

After the initial guidance, the founder answered six scoping questions:

| Decision | Answer | Implication |
|---|---|---|
| **Primary goal** | Launch a real business | Optimise for liquidity, trust, and learning — not hypothetical scale. |
| **Team & timeline** | Solo developer + AI coding agents, 16–20 weeks | Scope must be ruthlessly cut; no large team parallelism. |
| **Existing data** | Clean start | No migration pipeline; v2 is a prototype and can be frozen. |
| **Frontend** | React 19 + React Router v7 | Leave Svelte; shadcn/reui and agent-UI ecosystem are React-first. |
| **Channels** | All roles on web/PWA; experts and suppliers also get WhatsApp alerts + 1-tap signed mobile cards | Customer uses web; supply uses low-bandwidth, passwordless cards. |
| **Cloud & budget** | Cloudflare + Supabase Postgres (Mumbai), <$100/month infra | Managed, low-ops; LLM/WhatsApp/SMS are variable costs outside the cap. |

These decisions produced the following plan positions. Review whether they are justified.

### Decisions in Plan A (OpenCode)

1. **Clean rewrite**, v2 frozen, no data migration.
2. **TypeScript modular monolith**: Hono API + React 19/React Router v7 PWA + Postgres.
3. **Cloudflare + Supabase Postgres (Mumbai)**: Workers, R2, Queues, Cron, Hyperdrive, AI Gateway; no Kafka, RabbitMQ, Convex, Kubernetes, or microservices in the MVP.
4. **One action catalog** powering UI, agent, and later MCP. Four server-enforced risk tiers: `READ`, `SAFE_WRITE`, `NEEDS_APPROVAL`, `HUMAN_ONLY`.
5. **Customer agent in MVP**; experts/suppliers use WhatsApp templates + 1-tap signed mobile cards, not a chatbot.
6. **Postgres is the single source of truth** for business state, chat, agent state, approvals, audit, and outbox.
7. **Chat via Postgres + SSE/polling**; no Durable Objects, Workflows, or Agents SDK in the MVP.
8. **Contracts** are a "Digital Agreement with Audit Trail": immutable versions, SHA-256 terms hash, dual OTP signatures, hash-chained events, PDF certificate. Not Aadhaar eSign.
9. **Payments** are an offline UPI ledger; no escrow or fund custody.
10. **18 weeks**: 16 build + 2 buffer; explicit cut list if behind.
11. **Business success metric**: 10 signed contracts in 90 days, one city, three categories; guardrail: if <30% of published requests receive a quote after 8 weeks, pause feature work and fix supply.
12. **Execution docs**: build plan, rewrite playbook, engineering rules, permissions matrix, and an `AGENTS.md` operating contract.

### Decisions in Plan B (Antigravity)

Read the files directly. Broadly, Plan B proposes a similar agent-native action catalog but leans more heavily on Cloudflare-native primitives (Durable Objects, Workflows, Queues, Agents SDK), a 12–20 week timeline, Supabase Mumbai, React/TanStack or React Router, and a broader scope including admin, WhatsApp, voice notes, and advanced contracts.

---

## Files to read

### Plan A — OpenCode

- `docs/plan/made-by-opencode/README.md`
- `docs/plan/made-by-opencode/rewrite-playbook.md`
- `docs/plan/made-by-opencode/engineering-rules.md`
- `docs/plan/made-by-opencode/permissions-matrix.md`
- `docs/plan/made-by-opencode/AGENTS.md`

### Plan B — Antigravity

- `docs/plan/made-by-antigravity/architecture/gefifi_v3_strategy.md`
- `docs/plan/made-by-antigravity/architecture/gefifi_v3_master_blueprint.md`
- `docs/plan/made-by-antigravity/architecture/gefifi_v3_permissions_matrix.md`
- `docs/plan/made-by-antigravity/architecture/gefifi_v3_definition_of_done.md`

### Inputs both plans rely on

- `notes/What does “agent-native” mean, and what is in or out of v3?.md`
- `notes/Who is the primary user and channel?.md`
- `notes/What are the hard constraints?.md`
- `notes/What is the legal or commercial bar for contracts and money?.md`
- `notes/How will we know it works?.md`
- `docs/plan-review/opencode/round-2-review.md` (a prior review; treat as evidence, not authority)
- `ai_agent_capabilities_tracker.md`
- v2 code evidence where useful: `backend/src/interfaces.ts`, `backend/src/routes/`, `agents/build_assist_agent/`

### Repository

- Root: the repository containing this file.
- Current branch may still be v2. Plan A recommends a clean v3 repo; Plan B may assume in-place execution. Note any mismatch between the plan and the actual repository state.

---

## What to review

Review both plans along the axes below. For each axis, state what each plan gets right, what it gets wrong, and what is missing from both.

### 1. Product and business

- Is the MVP scope credible for **one developer + AI agents in 16–20 weeks**?
- Is the launch wedge (one city, three categories, 10 contracts in 90 days) realistic?
- Is the customer-web / supply-WhatsApp asymmetry correct? What evidence would falsify it?
- Is the customer-only agent the right MVP boundary, or does supply need an agent sooner?
- What is missing from the business plan: supply acquisition, trust/verification, pricing/monetization, support, refunds/disputes, legal, metrics?
- What should be cut, and what should not be cut?

### 2. Architecture and stack

- Is a TypeScript modular monolith the right call versus Go/Rust/NestJS/Encore/microservices?
- Is Cloudflare Workers + Supabase Mumbai + Hyperdrive the right deployment shape?
- Is the action catalog the right core abstraction, or is it over-engineering for a solo MVP?
- Is Postgres + SSE/polling sufficient for chat, or are Durable Objects/Workflows/Queues actually required?
- Is the agent runtime (Vercel AI SDK + Postgres state) sufficient, or does it need Agents SDK/LangGraph/Temporal?
- What are the real Cloudflare limits, cold starts, CPU/memory, DB latency, and vendor lock-in risks?
- What assumptions about Supabase Mumbai, Hyperdrive, WhatsApp, SMS/DLT, and LLM latency need verification?

### 3. Data model and correctness

- Are the tables, relationships, constraints, and indexes sufficient?
- Are contract versions, signatures, hash chains, milestones, payments, disputes, consent, audit, outbox, idempotency, and multi-role users modeled correctly?
- Are quote line items, tax/GST, rounding, currency, and partial payments handled?
- Are transaction boundaries and concurrency controls correct (quote acceptance, signing, milestone confirmation)?
- What is missing or wrong in the state machines?
- What data should be separated for privacy (addresses, contact details, verification docs)?

### 4. Security, permissions, and compliance

- Is the action-level permission matrix complete and enforceable?
- Are ownership, participation, role, state, field-level masking, and admin/support access correct?
- Are magic links, WhatsApp webhooks, uploads, rate limits, CSRF/CORS, and prompt injection handled?
- Is the agent prevented from `HUMAN_ONLY` actions in a way that cannot be bypassed?
- Is the contract evidence model defensible in India without Aadhaar eSign? Are the claims accurate?
- Is the no-escrow/offline-UPI model compliant? What must be reserved in the schema?
- Is DPDP consent/retention/deletion/export covered?
- What legal review is still required before launch?

### 5. Agent safety and evaluation

- Are the four risk tiers and `PendingAction` semantics sufficient?
- Can the agent leak PII, see competing quotes, or be prompt-injected through files/messages?
- Are the eval gates meaningful and testable (zero unapproved writes, tool correctness, PII, injection, budget)?
- Is the model choice/model-agnostic approach practical? What about cost, latency, fallback, and evals?
- Is the customer-only agent scope coherent with the action catalog and the supply channel?

### 6. Delivery and execution

- Is the 18-week plan realistic? Which phase is most likely to slip?
- Is the first-10-days plan a true walking skeleton?
- Is the vertical-slice order correct? What dependency is missing?
- Is the parity checklist complete? What v2 behaviour is at risk of being lost?
- Is the cut list ordered correctly? What is the true minimum launchable product?
- Is the testing/CI/DevOps plan sufficient for a solo developer?
- Is the rewrite-playbook actionable, or still too abstract?

### 7. Cost and operations

- Is <$100/month realistic? What variable costs are hidden?
- What is the cost per signed contract at MVP volume?
- What is the on-call/support burden for a solo founder?
- What breaks first at 10×, 100×, and 1,000× volume?
- What is the rollback and disaster-recovery story?

### 8. Comparison and consolidation

- Where do Plan A and Plan B **disagree**? List each disagreement and recommend one side.
- Where do they agree but both are wrong?
- What is over-engineered in each plan?
- What is missing from both?
- Which plan is more executable by a solo founder? Why?
- What should the consolidated plan keep, cut, and add?
- What are the top 5 decisions the founder must make before writing code?

---

## Review rules

1. **Be adversarial but fair.** Your job is to find failure modes, not to praise.
2. **Cite evidence.** Use `file:line` references and quote exact passages. Do not make claims without pointing to the plan or the code.
3. **Separate fact from assumption.** Mark anything that needs vendor verification or user validation.
4. **Do not produce a generic architecture essay.** Every finding must change a decision or an execution step.
5. **Prioritise.** A review with 40 low-severity nits is useless. Lead with the 5–10 findings that could kill the project.
6. **Check for contradictions.** Plans that disagree with themselves (timeline, scope, channels, stack) are a red flag.
7. **Check the business, not just the tech.** A technically elegant plan for a marketplace with no liquidity is a failure.
8. **Do not edit the plan files.** Write a separate review.
9. **If you have web access, verify vendor claims** (Cloudflare limits, Supabase Mumbai, Convex architecture, React Router v7 status, AI SDK, MCP, WhatsApp/Meta, DLT). If you cannot verify, mark it "unverified."
10. **State your confidence and limits.** Say what you could not check.

---

## Required output

Write your review to:

```text
docs/plan-review/external/2026-11-03-agent-review.md
```

Use this structure:

```markdown
# External Review — Gefifi v3 Plans

## 1. Verdict
- Plan A (OpenCode): [strong / directionally right / not executable / wrong]
- Plan B (Antigravity): [strong / directionally right / not executable / wrong]
- Overall recommendation: [consolidate / pick one / rewrite the plan / proceed with changes]
- Confidence: [high / medium / low], with reasons.

## 2. What I read
List files and code paths, with dates/commits if available.

## 3. Decision audit
Table: decision, plan, rationale, verdict (keep/change/drop), evidence.
Cover the founder's six answers and the 12 Plan A positions.

## 4. Top findings
Table: ID, severity (Blocker/High/Medium/Low), category, plan, evidence (file:line), finding, recommendation.
Order by severity. Lead with what could kill the project.

## 5. Side-by-side comparison
Table: dimension (product, architecture, data, security, agent, delivery, cost, ops), Plan A, Plan B, recommendation.

## 6. What both plans miss
Bullet list, each with why it matters and what to add.

## 7. What to cut
Bullet list, ordered. Distinguish "cut now" from "defer."

## 8. Recommended consolidated plan
A 1–2 page decision summary:
- stack
- architecture
- scope (in/out)
- team/timeline
- channels
- agent boundary
- data/security non-negotiables
- success metrics
- top 5 risks
- first 10 days

## 9. Questions for the founder
Only questions whose answers change the plan. Maximum 10.

## 10. Fact-checks and assumptions
Table: claim, source, status (verified/unverified/false), impact.

## 11. Confidence and limits
What you could not verify; what would change your verdict.
```

---

## Specific questions to answer directly

1. Is the **18-week solo timeline** credible? If not, what is the real minimum and what must be cut?
2. Is **Cloudflare + Supabase Mumbai** the right cloud, or should the founder choose a more boring Node/Postgres host? What is the exit ramp?
3. Is **Postgres + SSE/polling** enough for chat, or is cutting Durable Objects a mistake?
4. Is the **action catalog** the right core abstraction, or is it a premature platform?
5. Is **customer-only agent in MVP** the right boundary, or should supply get an agent first?
6. Are **contracts + dual OTP + SHA-256 + PDF** legally and technically defensible in India? What claims must be removed?
7. Is the **offline UPI ledger** sufficient, or does the product need a payment partner before launch?
8. Is **WhatsApp + magic links** viable for supply, given Meta verification, template approval, and DLT? What is the fallback?
9. What is the **smallest launchable product** that can produce 10 signed contracts in 90 days?
10. What are the **top 5 things that will make this rewrite fail**, and what should the founder do first?

---

## Final instruction

Do not summarise the plans back to the founder. They wrote them. Tell them what is wrong, what is missing, what to cut, what to verify, and what to do next. If the plans are broadly right, say so — but still give the smallest set of changes that materially improves the odds of launch.
