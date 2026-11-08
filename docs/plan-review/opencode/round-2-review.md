# OpenCode Review — Round 2

> **Independent review.** This file does not modify `docs/architecture/gefifi_v3_*` or `notes/*`. Those remain authoritative until you decide otherwise.
>
> **Date:** 2026-10-28  
> **Scope:** the v3 plan, notes, permissions matrix, DoD, and v2 code evidence.

---

## 1. Verdict

- The rewrite is justified.
- The current blueprint is directionally right but **not executable as written**.
- The 16–20 week target is credible **only with the cuts below**.
- The biggest planning error is treating the engineering DoD as the business success definition.
- The biggest technical risk is the **missing domain model**, not the choice of Cloudflare or React.

---

## 2. Evidence and contradictions

### 2.1 Files read

- `notes/What does “agent-native” mean, and what is in or out of v3?.md`
- `notes/Who is the primary user and channel?.md`
- `notes/What are the hard constraints?.md`
- `notes/What is the legal or commercial bar for contracts and money?.md`
- `notes/How will we know it works?.md`
- `docs/architecture/gefifi_v3_master_blueprint.md`
- `docs/architecture/gefifi_v3_definition_of_done.md`
- `docs/architecture/gefifi_v3_permissions_matrix.md`
- `docs/architecture/gefifi_v3_strategy.md`
- `docs/security/vulnerability-hardening-audit.md`
- v2 evidence: `backend/src/interfaces.ts`, `backend/src/routes/quotes.ts`, `agents/build_assist_agent/tools/quote.py`

### 2.2 Timeline and document contradictions

| # | Where | Contradiction | Consequence |
|---|---|---|---|
| 1 | Blueprint Gantt | M0 marked `done`, M1 `active` | The repo is still v2. The plan starts from a false baseline. |
| 2 | Strategy vs constraints | Strategy says 12 weeks; constraints say 16–20 | Coding agents get two different deadlines. |
| 3 | Blueprint §6 vs M4/M5 | Three apps in the tree, five apps in the milestones | Deployment and ownership are unclear. |
| 4 | Auth | Google primary + WhatsApp OTP binding | Supply-side users on budget Android may not have Google/email. |
| 5 | Agent scope | Core 9 includes supplier/expert tools; notes say supply uses WhatsApp cards | Extra tool surface and evals with no MVP user. |
| 6 | DoD M4 | Voice extraction ≥92%; notes say drop voice notes if 8–10 weeks | Scope conflict; “differs by >0%” is not a test. |

### 2.3 Domain-model gaps

| # | Gap | Why it blocks execution |
|---|---|---|
| 1 | `quotes` has only `amount` | Material quotes need line items, quantities, units, tax fields. |
| 2 | No `request_items` | Material requests cannot express what is being bought. |
| 3 | No `contract_versions` / `contract_signatures` | A revision invalidates the hash and signatures; the audit seal is mutable. |
| 4 | No `contract_events` hash chain | “Tamper-evident” is asserted, not implemented. |
| 5 | No `audit_events` (general) | Admin actions and state transitions have no audit trail. |
| 6 | No `outbox_events` | Quote acceptance, timeline messages, and notifications can diverge. |
| 7 | No `idempotency_keys` | Retries can double-submit quotes or double-accept. |
| 8 | No `jobs` table | Reminders/digests depend on Cloudflare Workflows. |
| 9 | No `user_roles` / active role | Multi-role users (expert who is also a customer) are unsupported. |
| 10 | No `provider_documents` | Admin verification has no storage model. |
| 11 | No `disputes` | The dispute viewer has no entity to view. |
| 12 | No `consent_records` | DPDP consent/withdrawal cannot be evidenced. |
| 13 | No `plans` / `user_plans` / `usage_events` | Subscription and token-cost metering cannot be added without a retrofit. |
| 14 | `pending_actions` lacks approver, payload hash, execution result, expiry semantics | Agent approval is not auditable or idempotent. |
| 15 | Permissions are field-level only | Illegal state transitions are still possible. |
| 16 | `getQuoteAction` returns the raw quote row | Violates the field-masking rules in the permissions matrix. |
| 17 | Exact addresses live on `requests` | A careless `select *` leaks them. Separate the private address table. |
| 18 | No `whatsapp_contacts` / opt-in record | WhatsApp compliance and STOP handling are undefined. |

### 2.4 Quality-gate problems

| # | Gate | Problem | Better gate |
|---|---|---|---|
| 1 | 100% jailbreak rejection on 10 attacks | Not statistically meaningful | 200+ adversarial cases × 3 runs, zero unapproved writes; server invariants tested separately |
| 2 | Chat delivery <50ms | Not user-perceivable; adds DO complexity | <2s P95 UI update with Postgres + polling/SSE |
| 3 | First token <1.2s | Aggressive and vendor-dependent | <2.5s P95, <4s P99 |
| 4 | OTP <10s P95 | Vendor-dependent | <30s P95 with SMS fallback; >98% within 60s |
| 5 | Audio extraction ≥92% | Deferred feature; “differs by >0%” is undefined | Cut for MVP; if it returns, exact amount/duration field accuracy with human confirmation |
| 6 | 24h 500-error rate <0.05% | Smoke test, not an error budget | 7-day error budget + synthetic checks on quote → contract → sign |
| 7 | CI <3 min including E2E | Unrealistic | Fast CI <3 min; full CI <10 min |
| 8 | 100% Turnstile bot blocking | Not provable | Measure challenge rate and false positives; keep rate limits |

---

## 3. Five-axis review

### 3.1 Rewrite vs strangler

**Verdict: clean rewrite.**

Why:

- v2 is a prototype with no serious users (your Q3).
- The stack is split across Svelte, Express, Firestore, and a Python ADK agent. A strangler would require dual-running two auth systems, two data stores, and two agent stacks.
- The codebase is not agent-friendly (your Q1). A strangler preserves the structure that makes coding agents fail.
- The asset is the **domain knowledge**, not the code. Reuse workflows, statuses, and edge cases; rewrite the implementation.

Conditions:

- Freeze v2 and tag/archive it. No new features.
- No data migration. Export reference data only if it helps; do not build a migration pipeline for a prototype.
- Write ADR-0001 (rewrite) and ADR-0002 (stack).
- Do not copy v2 code. Mine it for status enums and edge cases into a glossary.

Risks:

- Scope creep. Mitigate with one city, three categories, vertical slices, and the cut list.
- Losing undocumented behavior. Mitigate by writing a domain glossary from the v2 code and the notes, not by porting code.

### 3.2 Cloudflare vs boring stack

**Verdict: Cloudflare edge + boring core.** Keep commodity primitives; cut proprietary stateful primitives.

| Primitive | MVP? | Replace with | Exit ramp |
|---|---:|---|---|
| Workers | Yes | Hono on Node/Docker | Easy; same code |
| Hyperdrive | Yes | pgBouncer / direct Postgres | Easy; connection string |
| R2 | Yes | S3 | Easy; S3 API |
| Cron Triggers | Yes | any scheduler | Easy; cron endpoint |
| Turnstile | Yes | hCaptcha/Recaptcha | Easy; swap widget |
| AI Gateway | Yes (optional) | direct provider SDK | Easy; base URL |
| Agents SDK | **No** | AI SDK + Postgres | Hard; cut |
| Agent DO | **No** | Postgres state | Hard; cut |
| Chat DO | **No** | Postgres + polling/SSE | Hard; cut |
| Workflows | **No** | Cron + `jobs` table | Hard; cut |
| Queues | **No** | `outbox_events` + cron | Medium; cut |
| Supabase Auth/Realtime/Storage | **No** | Better Auth / Postgres / R2 | Hard; cut |

Why:

- The hard-to-exit primitives are also the ones that add the most ops burden for a solo non-coder.
- The “agent-native” core is the **action catalog**, not the Agents SDK.
- Construction chat is low-volume. 2–3s polling is fine. Add SSE or a DO later only if data proves it.
- Reminders and digests are simple. A `jobs` table with `FOR UPDATE SKIP LOCKED` is observable and portable.

Risks:

- Workers CPU/memory limits for PDF generation. Spike `pdf-lib` in M0/M1.
- Hyperdrive latency. Measure it; fall back to a direct connection if needed.
- WhatsApp/Meta business verification lead time. Start in Week 1, not M4.

### 3.3 React vs Svelte

**Verdict: React 19 + React Router v7 framework mode; retire Svelte.**

Why:

- Larger hiring pool and more AI-agent training data. This matters for the 1-year handover.
- shadcn/ui + reui.io give accessible, copy-paste primitives.
- React Router v7 is battle-tested on Workers. No need for TanStack Start.
- One language across web, API, and agent; shared Zod schemas and DTOs.

Conditions:

- No TanStack Start, no React Server Components, no experimental React features.
- Freeze dependencies; pin versions; use framework-mode loaders/actions.
- The mobile card is SSR HTML in `apps/api`, not React, to stay under 40KB.
- PWA with a service worker; no native app.

Risks:

- Bundle size. Use SSR, code splitting, and a separate lightweight card.
- React ecosystem churn. Pin and upgrade quarterly.
- SvelteKit is technically capable. If you personally prefer Svelte, the cost is hiring and agent familiarity, not capability. Confirm the trade-off.

### 3.4 Action/HITL contract

**Verdict: one action catalog, four server-enforced tiers, customer-only agent, deterministic supply cards, and `quote.accept` / `contract.sign` as HUMAN_ONLY for the agent.**

Core rules:

- Every capability is defined once in TypeScript with Zod input/output.
- Every caller goes through `executeAction`: web, mobile card, agent, admin, system.
- The server enforces risk; the prompt never does.
- Actions return role-specific DTOs, never raw database rows.
- Every mutation writes an audit event and an outbox event in the same transaction.
- Mutations accept an `Idempotency-Key`; retries return the original result.

Risk tiers:

| Tier | Agent behavior | Examples |
|---|---|---|
| `READ` | Execute immediately | `request.browse`, `quote.compare`, `profile.get` |
| `SAFE_WRITE` | Execute immediately; labeled receipt | `request.createDraft`, `request.updateDraft`, `chat.sendMessage` |
| `NEEDS_APPROVAL` | Create `PendingAction`; human approves | `request.publish`, `contract.draft` |
| `HUMAN_ONLY` | Agent blocked; human with step-up auth | `quote.accept`, `contract.sign`, `payment.*`, `admin.*` |

Agent tools in MVP:

| Tool | Risk | Note |
|---|---|---|
| `request.createDraft` | `SAFE_WRITE` | Creates a draft only |
| `request.updateDraft` | `SAFE_WRITE` | Own draft only |
| `request.publish` | `NEEDS_APPROVAL` | Approval card |
| `request.browse` | `READ` | Own requests only |
| `quote.compare` | `READ` | Own request only; no phone/email |
| `contract.draft` | `NEEDS_APPROVAL` | Draft only; no signature |
| `chat.sendMessage` | `SAFE_WRITE` | Labeled “via Gefifi Assistant”; contact-info filter |
| `profile.get` | `READ` | Own profile |

Supply-side actions (`request.browseMatching`, `interest.express`, `quote.submit`) are **not agent tools** in MVP. They are human actions on the signed mobile card.

Why `quote.accept` is `HUMAN_ONLY` for the agent:

- Acceptance is a binding commercial step: it rejects competitors and creates a contract.
- A `NEEDS_APPROVAL` card is still an agent-initiated commitment. For acceptance, the human should tap the action in the UI after reviewing the comparison.
- The agent can compare and recommend; it cannot stage acceptance.

`PendingAction` semantics:

- Fields: `id`, `user_id`, `agent_thread_id`, `agent_message_id`, `action_id`, `payload_json`, `payload_hash` (SHA-256 canonical JSON), `summary`, `status`, `expires_at`, `approved_by`, `approved_at`, `executed_at`, `execution_result`, `error`, `idempotency_key`.
- Statuses: `pending`, `approved`, `rejected`, `expired`, `stale`, `executed`, `failed`.
- Expiry: 15 minutes.
- The payload is immutable. Editing creates a new pending action.
- Approval endpoint checks: authenticated user, `user_id = approved_by`, status `pending`, not expired, payload hash unchanged, actor still authorized, domain state still valid.
- On failure, return `409` with a machine-readable reason and mark `stale`/`expired`. Never execute a stale action.
- Execution is single-use and idempotent. Duplicate approval returns the original result.
- Every transition writes an audit event.

WhatsApp boundary:

- Outbound utility templates only: new lead, quote received, quote accepted, signature reminder, payment milestone.
- URL button to `gefifi.in/m/<token>`; token is random 256-bit, stored hashed in `magic_links`, scoped to user + request + purpose, expires in 7 days, revocable, single-use for quote submission.
- The card is SSR HTML in `apps/api`: masked customer/request summary, quote form, confirmation screen.
- Inbound webhook only for delivery status and STOP/opt-out. No free-form text parsing, no voice extraction, no conversational state machine.
- In-app voice notes may be stored and played without transcription. WhatsApp voice notes are post-MVP.
- If a provider replies with text, auto-reply with the card link; log it; do not parse it.

Roles with the agent:

- Customer web only.
- Supply uses deterministic cards.
- Admin uses the ops console.
- Post-MVP: supply WhatsApp agent only if data shows demand.

### 3.5 Data ownership and consistency

**Verdict: Postgres is the single source of truth for all business state.**

Scope:

- Users, roles, profiles, projects, requests, quotes, contracts, payments, chat, agent threads/messages, pending actions, audit, outbox, notifications, usage.
- No Durable Object SQLite as source.
- No Supabase Realtime as source.
- No Firestore.

Quote acceptance transaction:

1. `SELECT ... FOR UPDATE` on the request row.
2. Verify request status is `open`/`under_review`; quote is `submitted`/`under_review`; quote is not expired.
3. Set the chosen quote to `accepted`.
4. Set all other quotes on the request to `rejected`.
5. Set the request to `contracted`.
6. Insert the contract draft.
7. Insert `audit_events` and `outbox_events` (quote accepted, contract created, chat timeline).
8. Commit.

Add a partial unique index: `unique (request_id) where status = 'accepted'`. Use an idempotency key on acceptance.

Outbox:

- Domain mutations write `outbox_events` in the same transaction.
- A cron worker claims events with `FOR UPDATE SKIP LOCKED`, dispatches notifications/timeline messages, and marks them processed.
- Consumers are idempotent; at-least-once delivery is acceptable.

Contracts:

- `contracts` holds current state.
- `contract_versions` holds immutable terms JSON/text and `terms_hash`.
- `contract_signatures` holds one row per party per version.
- `contract_events` is a hash chain (`prev_hash`, `event_hash`) for the audit certificate.
- On revision, create a new version and reset signatures. Never mutate a signed version.

Quotes and materials:

- `request_items`: description, quantity, unit, notes (for material requests).
- `quote_line_items`: kind (`labour`/`material`/`other`), description, quantity, unit, unit_price, amount.
- `quotes` keeps `subtotal`, `tax_amount`, `total_amount`, `currency`, `valid_until`.
- Expert quotes may be a single amount or line items. Supplier quotes use line items.

State transitions:

- Explicit matrix in `packages/core/src/state-machines`.
- Each transition has a role guard and a domain guard.
- Examples: only the customer owner can accept a quote; only the provider can submit/revise; both parties must sign; the system can expire; admin can suspend/resolve.
- Field-level RBAC is necessary but not sufficient.

Metering and entitlements:

- `plans` (`free`, later `pro`), `user_plans`, `usage_events` (action, model, input/output tokens, cost, metadata).
- An entitlement service checks limits; no billing integration in MVP.
- Free-plan limits are configuration, not hardcoded ifs.

Admin:

- Minimal 3-screen console in the same web app: provider verification queue, dispute timeline (read-only), category manager.
- If the timeline slips, fall back to SQL/Retool-style internal tooling. Do not build a custom admin framework.

Chat:

- `chat_threads` and `chat_messages` in Postgres.
- Client polls every 3s while the thread is open, or uses an SSE endpoint that polls server-side. No DO.
- Timeline events are messages with `type = 'system_event'` and structured metadata, written via the outbox.
- Contact-info filter masks phone/email until a contract is signed.

Idempotency:

- `Idempotency-Key` header on mutations; store key, user, action, request hash, response, status, TTL 24h.
- Agent tool call IDs are used as idempotency keys.

Audit:

- `audit_events` for all mutations and admin actions: actor, role, action, entity, before/after, IP, user agent, request ID, timestamp.
- Append-only. No updates or deletes.

Privacy:

- Exact addresses live in `request_addresses` / `project_addresses`, not on the main row.
- Repositories return DTOs; sensitive columns are not selected by default.
- Admin access to documents is logged.

---

## 4. Round 2 questions

❓ **Q1** — **Rewrite vs strangler:** Given v2 is a prototype with no serious users, a split Svelte/Express/Firestore/Python stack, and a codebase that is not agent-friendly, should v3 be a clean rewrite or an incremental strangler?

➡️ **Clean rewrite.** Freeze and archive v2, no data migration, reuse domain knowledge only, and record the decision in ADR-0001.

---

❓ **Q2** — **Cloudflare vs boring stack:** Should the MVP use the full Cloudflare surface (Workers, Hyperdrive, R2, Queues, Workflows, Agents SDK, Durable Objects) or a boring core (Workers + Hyperdrive + R2 + Cron, Postgres as source of truth, AI SDK, polling/SSE)?

➡️ **Cloudflare edge + boring core.** Keep Workers, Hyperdrive, R2, Cron, Turnstile, and optionally AI Gateway. Cut Agents SDK, Agent DO, Chat DO, Workflows, and Queues for MVP. Replace them with AI SDK + Postgres, polling/SSE, and cron + `jobs`/`outbox`.

---

❓ **Q3** — **React vs Svelte:** Should v3 use React 19 + React Router v7 and retire Svelte, or keep SvelteKit?

➡️ **React 19 + React Router v7.** Retire Svelte. No TanStack Start, no RSC. The mobile card stays SSR HTML in `apps/api`.

---

❓ **Q4** — **Action/HITL contract:** Do you accept one action catalog, four server-enforced risk tiers, a customer-only web agent, deterministic supply cards, `quote.accept` and `contract.sign` as HUMAN_ONLY for the agent, and the `PendingAction` semantics (immutable payload, SHA-256 hash, 15-minute expiry, single-use, revalidation on approval, idempotency, audit)?

➡️ **Yes.** The agent can compare and recommend, but a human must accept a quote or sign a contract. WhatsApp is outbound + signed card + form; no inbound agent or voice extraction in MVP.

---

❓ **Q5** — **Data ownership:** Do you accept Postgres as the single source of truth for business state, chat, agent state, pending actions, audit, and outbox; quote acceptance in one transaction with a partial unique index; contract versions/signatures/hash-chained events; quote line items; an explicit state-transition matrix; a usage/entitlement seam with no billing; and a minimal 3-screen admin console?

➡️ **Yes.** No Durable Object SQLite, no Supabase Realtime as source, no Firestore. Chat uses Postgres + polling/SSE. Admin is 3 screens, with SQL/Retool as the fallback if the timeline slips.

---

❓ **Q6** — **Business success metric and guardrail:** Is the single business success metric “10 signed contracts in 90 days, each with at least one confirmed payment milestone, in one city and three categories,” with the guardrail “if fewer than 30% of published requests receive a quote after 8 weeks, pause feature work and fix supply acquisition”?

➡️ **Yes.** This is the Q8 answer; the engineering DoD remains a separate gate.

---

## 5. Mapping of your 12 items

| Your item | Answered in | Recommendation |
|---|---|---|
| Rewrite vs strangler | Q1 | Clean rewrite |
| Cloudflare vs boring stack | Q2 | Edge + boring core |
| React vs Svelte | Q3 | React Router v7 |
| Action/HITL contract | Q4 | One catalog, four tiers |
| Data ownership model | Q5 | Postgres source of truth |
| WhatsApp boundary | Q4 | Outbound + signed card + form; no inbound agent/voice |
| Business metric + guardrail | Q6 | 10 contracts / 90 days; <30% quotes = pause |
| Subscription/usage seam | Q5 | Build metering, no billing |
| Cut proprietary primitives | Q2 | Cut Agents SDK/DO/Workflows/Queues |
| Roles with the agent | Q4 | Customer web only |
| Material line items | Q5 | Add `request_items` / `quote_line_items` |
| State-transition permissions | Q5 | Explicit transition matrix |
| Chat source + outbox | Q5 | Postgres + outbox |
| PendingAction semantics | Q4 | Immutable, hashed, 15 min, single-use |
| 16–20 week scope | Q2/Q5 | 16 build + 2–4 buffer; cut list |
| Admin MVP | Q5 | 3-screen console; SQL fallback |

---

## 6. What I will write after your answers

Only under `docs/architecture/opencode/`:

- `blueprint-review.md` — updated architecture.
- `data-model-review.md` — tables, relationships, state machines.
- `action-hitl-contract.md` — action catalog, risk tiers, PendingAction.
- `state-transition-matrix.md` — request/quote/contract/payment transitions.
- `roadmap-review.md` — week-by-week M0–M6 with cut list.
- `success-scorecard.md` — business metric and guardrail.
- `adr/0001-rewrite.md`, `adr/0002-stack.md`, and later ADRs.

No edits to the original plan files.
