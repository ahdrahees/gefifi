# Gefifi v3 — Build Plan

> **Status:** Ready for execution  
> **Date:** 2026-11-02  
> **Owner:** Founder + AI coding agents  
> **Scope:** Clean rewrite of Gefifi as an agent-native construction marketplace.  
> **Horizon:** 18 weeks (16 build + 2 buffer), solo developer + AI agents.  
> **Supersedes for execution:** the v3 docs in `docs/plan/made-by-antigravity/`. Those files are kept as inputs and are not edited by this plan.

---

## Document map

| File | What it covers | Use it when |
|---|---|---|
| [README.md](README.md) | Product decisions, architecture, scope, data model, roadmap, metrics, risks, DoD. | Start here; review monthly. |
| [rewrite-playbook.md](rewrite-playbook.md) | Freezing v2, repo bootstrap, first 10 days, vertical slices, parity checklist, cutover. | Week 0 and every slice. |
| [engineering-rules.md](engineering-rules.md) | TypeScript, module boundaries, actions, data access, permissions, edge cases, testing, security, agent coding rules. | Every PR. |
| [permissions-matrix.md](permissions-matrix.md) | Actors, action matrix, field visibility, state transitions, channel rules. | Every action, endpoint, or state change. |
| [AGENTS.md](AGENTS.md) | Operating contract for AI coding agents. | Copy to the `gefifi-v3` repo root on Day 1. |

### Plan completeness

This plan covers architecture, scope, data model, action safety, channels, infrastructure, DevOps, roadmap, metrics, risks, and definition of done. It does **not** replace:

- legal review of the ToS, privacy policy, and contract template;
- the supply-acquisition plan for the first 50 providers;
- brand/design exploration;
- a full analytics event taxonomy (create in Week 1);
- a fundraising or unit-economics model beyond the infra cap.

Those are **open inputs**, not engineering unknowns. They are tracked in §14 and should be closed before launch.

---

## How to use this plan

1. **Read §1–§3 first.** They contain the product decisions and the expected outcome. Everything else follows from them.
2. **Use §11 as the weekly execution board.** Do not start a phase before its predecessor's exit criteria are met.
3. **Use §6–§8 and the engineering rules while building.** They define the data model, action catalog, risk tiers, and channel behaviour.
4. **Use [rewrite-playbook.md](rewrite-playbook.md) for the first 10 days and every vertical slice.**
5. **Use §12–§14 to say no.** The cut list and non-goals are part of the plan, not an afterthought.
6. **When reality changes, update this file.** It is the single source of truth for v3 execution.

---

## 1. Executive summary

Gefifi is a two-sided construction marketplace in India: **customers** post work and material requests, **experts** quote for work, **suppliers** quote for materials, and both sides sign contracts and track milestones.

v2 proved the workflow, but it is split across SvelteKit, Express, Firestore, and a Python ADK agent. Every capability exists twice — once as a REST route and once as a hand-written agent tool — and safety depends on prompts. That makes it slow to change, hard to test, and unsafe to extend.

v3 is a **clean rewrite** built on five rules:

1. **One language, one repo, one deployable core.** TypeScript from the database to the UI to the agent tools.
2. **One action catalog.** Every capability is defined once, with a Zod schema, role/ownership policy, risk tier, and handler. The web UI, the in-app agent, and (later) external agents via MCP all call the same actions.
3. **Postgres is the only source of truth.** Relational data, money, contracts, chat, agent state, audit, and outbox all live in one Postgres database in Mumbai.
4. **Safety is server-enforced.** The agent cannot accept a quote or sign a contract. High-risk actions become `PendingAction` records that a human must approve.
5. **Boring infrastructure.** Cloudflare Workers, R2, Queues, Cron, Hyperdrive, and Supabase Postgres. No Kafka, RabbitMQ, Kubernetes, Convex, or microservices in the MVP.

**Expected outcome after 18 weeks:** a production-ready customer PWA, a WhatsApp + 1-tap mobile-card channel for experts and suppliers, a complete request → quote → contract → signature → milestone flow, an in-app customer agent with approval cards, a minimal admin console, one deploy pipeline, and a CI suite that blocks unsafe agent writes.

**Business definition of success:** 10 signed contracts in 90 days, in one city, in three categories.

---

## 2. Decisions locked

| Decision | Choice | Why |
|---|---|---|
| **Primary goal** | Launch a real business | Optimise for learning, liquidity, and trust — not hypothetical scale. |
| **Team** | Solo developer + AI coding agents | Every choice must reduce cognitive and operational load. |
| **Timeline** | 18 weeks (16 build + 2 buffer) | Realistic for parity plus the agent-native core. |
| **Existing data** | Clean start, no migration | v2 is a prototype. Reuse domain knowledge, not data or code. |
| **Rewrite style** | Clean rewrite; freeze v2 | A strangler would preserve the split stack that caused the problems. |
| **Frontend** | React 19 + React Router v7 | Best agent-UI ecosystem and hiring pool; shadcn/reui are React-first. |
| **Channels** | All roles on web/PWA; experts and suppliers also get WhatsApp alerts + 1-tap signed mobile cards | Customers need screen space; supply needs zero-password, low-bandwidth access. |
| **Cloud** | Cloudflare + Supabase Postgres (Mumbai) | Edge compute, cheap storage, low ops; database close to Indian users. |
| **Infra budget** | < $100/month | Managed services and free tiers; LLM/WhatsApp/SMS tracked separately. |
| **Agent scope** | Customer web agent in MVP; expert/supplier agent post-MVP | Supply uses deterministic WhatsApp cards, not a chatbot. |
| **Chat** | Postgres + SSE/polling | Low-volume construction chat does not need Durable Objects yet. |
| **Contracts** | "Digital Agreement with Audit Trail" | SHA-256 terms hash + dual OTP + PDF certificate; not Aadhaar eSign. |
| **Payments** | Offline UPI ledger, no escrow | Escrow requires an RBI-licensed partner; reserve schema fields now. |

---

## 3. Product scope

### 3.1 In scope (MVP)

| Area | MVP scope |
|---|---|
| **Identity** | Multi-role account (customer / expert / supplier / admin), active-role switching, Google login, phone OTP (WhatsApp primary, SMS fallback), provider verification. |
| **Projects** | Lightweight project grouping requests; no Gantt charts or budget graphs. |
| **Requests** | Work requests and material requests with items, quantity/unit, location, photos, attachments, expiry, open or invite-only visibility. |
| **Discovery** | PostGIS radius search, category filters, expert/supplier profiles, invite and express-interest flows. |
| **Quotes** | Versioned quotes, line items, labour/material split, tax fields (GST/exempt), validity, submit/revise/compare/accept/reject/expire. |
| **Contracts** | Draft, revision comments, versions, dual OTP signature, terms hash, hash-chained events, PDF audit certificate. |
| **Milestones** | Lump-sum and milestone schedule; offline UPI payment ledger with screenshot + provider confirmation. |
| **Chat** | One thread per request × provider; text, files, images, voice notes (store/play, no transcription), system timeline cards. |
| **Agent** | Customer web agent: draft/publish requests, browse own requests, compare quotes, draft contracts, send chat messages, read profile. Approval cards for risky actions. |
| **Supply channel** | WhatsApp utility templates + magic link + SSR mobile card (< 40KB) for lead alerts, quote submission/revision, and job tracking. |
| **Admin** | Provider verification queue, read-only dispute timeline, category manager, user suspension, audit log view. |
| **Trust** | Simple 1–5 star review after contract completion; verification badges. |
| **Notifications** | In-app notifications, WhatsApp utility templates, transactional email (optional), SMS OTP fallback. |
| **Files** | R2 pre-signed uploads; images, PDFs, DWG/DXF stored and previewed; no CAD parsing. |
| **Compliance** | DPDP consent records, privacy policy, data deletion/export, WhatsApp opt-in/STOP, DLT-registered SMS fallback. |

### 3.2 Out of scope (MVP)

- In-app payments, escrow, payouts, or RBI-regulated fund handling.
- Aadhaar eSign or claims of "legally binding e-signature".
- Native iOS/Android apps.
- Voice transcription, AI extraction from audio, or WhatsApp voice quoting.
- CAD/DWG parsing or automated quantity extraction.
- Multi-agent swarms, autonomous negotiation, or an inbound WhatsApp chatbot.
- Public MCP server (design the action catalog for it; ship post-MVP).
- Multi-city launch, multi-language UI beyond English/Hinglish, group chat, video calls.
- Subscription billing (build the metering seam, not billing).
- Custom analytics warehouse, self-hosted Prometheus/Grafana, Kubernetes, Kafka, RabbitMQ, microservices.

### 3.3 Launch wedge

- **One city:** Pune (confirm).
- **Three categories:** plumbing, electrical, painting (confirm).
- **One promise:** "Post a job, get verified quotes, sign a clear agreement, track milestones."
- **One channel bet:** customer web + WhatsApp supply cards.

---

## 4. Architecture

### 4.1 Shape

A **modular monolith**, not microservices.

```text
┌─────────────────────────────────────────────────────────────────────┐
│                           Cloudflare Edge                           │
│                                                                     │
│  apps/web (React Router v7, SSR, PWA)                               │
│  apps/api (Hono Worker)                                             │
│    ├── REST/RPC endpoints for the web app                           │
│    ├── /m/:token  → SSR mobile cards for supply                     │
│    ├── /webhooks/whatsapp → delivery/STOP/button events             │
│    ├── /internal/agent → agent runtime (same action catalog)        │
│    └── /cron/* → outbox, jobs, reminders                            │
│                                                                     │
│  packages/core   → actions, policy, state machines, Zod schemas     │
│  packages/db     → Drizzle schema, migrations, repositories         │
│  packages/agent  → prompts, tool registry, evals                    │
│  packages/ui     → shared React components (optional)               │
└─────────────────────────────────────────────────────────────────────┘
              │                         │
              ▼                         ▼
   Supabase Postgres (Mumbai)      Cloudflare R2
   + PostGIS                       + Queues
   + pgvector later                + Cron
```

### 4.2 Request flow

```text
Web UI ─┐
Agent  ─┼──▶ executeAction ──▶ auth + session
MCP    ─┘        │
                 ├──▶ schema validation (Zod)
                 ├──▶ role / ownership / state guard
                 ├──▶ risk tier (READ | SAFE_WRITE | NEEDS_APPROVAL | HUMAN_ONLY)
                 ├──▶ handler (domain logic)
                 ├──▶ Postgres transaction
                 │      ├── domain rows
                 │      ├── audit_events
                 │      └── outbox_events
                 └──▶ DTO (never a raw database row)
```

### 4.3 Principles

1. **Actions are the only mutation path.** No route handler writes business data directly.
2. **The UI, agent, and MCP are peers.** None gets a private back door.
3. **DTOs, not rows.** Every action returns a role-scoped response.
4. **One transaction, one truth.** Domain change + audit + outbox commit together.
5. **Idempotent by default.** Every mutation accepts an `Idempotency-Key`.
6. **Explicit state machines.** Illegal transitions are rejected in code, not hoped away.
7. **Portable core.** `packages/core` must not import `cloudflare:*`. Platform code stays in thin adapters.
8. **Buy the commodity.** Auth, UI primitives, error tracking, queues, and storage are bought, not built.

---

## 5. Stack decisions

| Layer | Choice | Notes |
|---|---|---|
| **Language** | TypeScript 5.x, strict | One type system from DB to UI to agent tools. |
| **Runtime** | Cloudflare Workers (`nodejs_compat`) | Exit ramp to Node/Bun because Hono is runtime-agnostic. |
| **API framework** | Hono | Small, typed, fast, Worker-native, portable. |
| **Frontend** | React 19 + React Router v7 (framework mode) | SSR, loaders/actions, PWA. No Next.js, no TanStack Start for MVP. |
| **UI** | Tailwind CSS v4 + shadcn/ui + reui.io (selectively) | Copy-paste primitives; no custom design system. |
| **Data fetching** | TanStack Query + typed API client | Server state belongs on the server. |
| **Forms** | React Hook Form + Zod | Shared schemas with actions. |
| **Database** | Postgres 15+ with PostGIS (Supabase Mumbai) | Relational truth; PostGIS for radius matching. Verify Mumbai availability at signup. |
| **ORM** | Drizzle ORM + Drizzle Kit | SQL-first, typed, Worker-compatible, portable. |
| **Connection** | Cloudflare Hyperdrive | Pooling and caching between Workers and Postgres. |
| **Auth** | Better Auth | Sessions in our Postgres; Google OAuth + phone OTP. |
| **Files** | Cloudflare R2 | S3-compatible, zero egress. |
| **Async jobs** | Transactional outbox + Cloudflare Queues + Cron Triggers | No Kafka/RabbitMQ. |
| **Agent runtime** | Vercel AI SDK + custom action registry + Postgres state | Model-agnostic; no Agents SDK/Durable Objects in MVP. |
| **LLM access** | Cloudflare AI Gateway | Caching, fallback, rate limits, cost/latency analytics. |
| **Error tracking** | Sentry (browser + Workers) | Release tracking and source maps. |
| **Observability** | Workers Logs/Traces + Sentry + AI Gateway | Grafana Cloud/OpenTelemetry later. |
| **CI/CD** | GitHub Actions + Wrangler | Preview → staging → production. |
| **Monorepo** | pnpm workspaces + Turborepo | Fast, cached, simple. |

### 5.1 Rejected alternatives

| Rejected | Why |
|---|---|
| **Go / Rust** | No compute bottleneck. Splitting the type system costs more than it saves. |
| **NestJS** | Heavy, decorator-driven, not Worker-native. Hono is a better fit for a solo modular monolith. |
| **Encore.ts** | Nice DX, but a platform bet with deployment constraints. |
| **Convex** | Strong document-relational database with ACID transactions and excellent reactive queries. On Convex Cloud it runs on PlanetScale/MySQL; self-hosted can use Postgres, SQLite, or MySQL as a persistence layer. But you program against Convex's document API, not Postgres: no PostGIS, no SQL/BI tooling, no standard Postgres constraints/migrations, and leaving means rewriting queries. A second vendor for the system of record. |
| **Kafka / RabbitMQ** | Operational burden for a human-scale marketplace. Outbox + Queues + Cron is enough. |
| **Prometheus / Grafana (self-hosted)** | Pull-based model does not fit request-scoped Workers; managed OTel later. |
| **Cloudflare D1** | SQLite; no PostGIS and weaker relational tooling for contracts and money. |
| **Durable Objects / Workflows / Agents SDK (MVP)** | Proprietary stateful primitives; Postgres + SSE + outbox/cron are simpler and portable. Add later if metrics demand. |
| **Next.js** | More framework and RSC complexity than needed. React Router v7 is enough. |
| **SvelteKit** | Capable, but the agent-UI ecosystem, shadcn/reui, and hiring pool favour React. |
| **Native mobile apps** | PWA + WhatsApp cards cover the MVP at a fraction of the cost. |

### 5.2 Why not Convex, precisely

Convex is not "a Postgres database." It is a **document-relational** database: tables and document IDs, JSON-like documents, TypeScript query/mutation functions, indexes, ACID transactions, and reactive subscriptions. Convex's own overview says the cloud offering runs on **PlanetScale/MySQL**, while the open-source backend can use **SQLite, Postgres, or MySQL** as its persistence layer.

That persistence detail does not give you Postgres as an interface. You cannot connect with `psql`, write SQL joins/CTEs/window functions, use PostGIS, run Drizzle migrations, use standard Postgres backup/BI tooling, or query the data from an external analytics tool. You use Convex's API and runtime.

For Gefifi, the missing pieces are material:

- **PostGIS radius matching** is core to the marketplace. Convex has no PostGIS; you would filter coordinates in TypeScript or add an external geospatial service.
- **Contracts, money, audit, and reporting** benefit from SQL constraints, partial unique indexes, `FOR UPDATE`, and set-based queries. Convex has transactions and indexes, but not the SQL surface.
- **Portability:** moving off Convex means rewriting queries/mutations and migrating data, not changing a connection string.
- **Runtime:** Convex functions run on Convex, not Cloudflare Workers. That is a second platform and auth/runtime integration to own.

Convex would be a reasonable choice for a realtime-heavy CRUD app with no geospatial or SQL reporting needs. Gefifi is not that app.

---

## 6. Domain model

### 6.1 Conventions

- **IDs:** UUIDv7 for domain tables; configure Better Auth to use UUIDs. `user.id` is the canonical identity.
- **Money:** integer paise (`bigint`), ISO currency (`INR`). Never floats.
- **Time:** `timestamptz`, stored UTC, rendered in IST.
- **Enums:** Postgres enums for stable statuses; `text` + check constraints for evolving taxonomies.
- **Soft delete:** only where recovery matters (`deleted_at`); not everywhere.
- **Authorization:** enforced in the action layer. Add RLS later only as defence-in-depth for sensitive tables.
- **DTOs:** repositories never return raw rows to clients.

### 6.2 Tables

**Identity & trust**

| Table | Purpose |
|---|---|
| `user` | Better Auth identity table, extended with `phone`, `phone_verified`, `primary_role`, `status`. |
| `session`, `account`, `verification` | Better Auth session/OAuth/OTP tables. |
| `user_roles` | Multi-role support (`customer`, `expert`, `supplier`, `admin`), status, verified_at. |
| `profiles` | Display name, bio, avatar, city, language preference. |
| `provider_profiles` | Expert/supplier kind, categories, service radius, experience, company name, GSTIN, verification status, rating aggregates. |
| `provider_documents` | Uploaded verification documents and review status. |
| `addresses` | Private address records with `geography(Point, 4326)`; never on the public request row. |
| `consent_records` | DPDP consent version, purpose, granted/revoked timestamps, IP, user agent. |
| `magic_links` | Hashed tokens for supply cards; user, purpose, request, expiry, used/revoked. |

**Marketplace**

| Table | Purpose |
|---|---|
| `projects` | Lightweight grouping of requests for a customer. |
| `categories` | Trade/material taxonomy, parent/child, active flag. |
| `requests` | Work/material request header: customer, project, kind, category, status, visibility, expiry, budget, address. |
| `request_items` | Material line items: description, quantity, unit, notes. |
| `request_invites` | Customer invites a provider to a request. |
| `request_interests` | Provider expresses interest in an open request. |
| `quotes` | Versioned quote header: provider, request, version, parent, status, subtotal/tax/total, validity, terms. |
| `quote_line_items` | Labour/material/other lines: description, quantity, unit, unit price, amount, tax/HSN. |
| `attachments` | Polymorphic file metadata pointing to R2 keys. |

**Contracts & money**

| Table | Purpose |
|---|---|
| `contracts` | Current contract state for a request/proposal: parties, type, status, current version, total. |
| `contract_versions` | Immutable terms JSON + SHA-256 hash; one row per revision. |
| `contract_signatures` | One row per signer per version; OTP reference, timestamp, IP, hash. |
| `contract_events` | Append-only hash chain (`prev_hash`, `event_hash`) for the audit certificate. |
| `contract_comments` | Revision requests and general comments. |
| `milestones` | Sequence, amount, due date, status. |
| `payment_records` | Offline UPI/NEFT/cash reference, screenshot, marked-paid/confirmed timestamps. |
| `disputes` | Contract dispute, reason, status, resolution (admin-read-only in MVP). |
| `reviews` | 1–5 stars + comment after completion. |

**Communication & agent**

| Table | Purpose |
|---|---|
| `chat_threads` | One thread per request × provider. |
| `chat_messages` | Text/file/voice/system messages, structured metadata. |
| `notifications` | In-app/WhatsApp/email notifications and delivery status. |
| `agent_threads` | One agent conversation per user (role context). |
| `agent_messages` | User/assistant/tool messages, model, tokens, cost. |
| `pending_actions` | Immutable agent proposals awaiting human approval. |
| `usage_events` | Per-action/model token and cost metering. |
| `plans`, `user_plans` | Entitlements seam; no billing in MVP. |

**Operations**

| Table | Purpose |
|---|---|
| `audit_events` | Append-only actor/action/entity/before/after/IP/request_id log. |
| `outbox_events` | Events written in the same transaction as domain changes; consumed by a worker. |
| `idempotency_keys` | Key, user, action, request hash, response, status, expiry (24h). |
| `jobs` | Durable cron jobs (expiry, reminders) with `FOR UPDATE SKIP LOCKED`. |
| `feature_flags` | Simple DB/env flags. |

### 6.3 State machines

```text
Request:   draft ─▶ open ─▶ under_review ─▶ contracted ─▶ in_progress ─▶ completed
                     │        │                 │              │
                     └────────┴─────────────────┴──────────────┴──▶ cancelled / expired / disputed

Quote:     draft ─▶ submitted ─▶ under_review ─▶ accepted
                        │             │
                        └─────────────┴──▶ rejected / expired
                        └── revise ──▶ superseded (old) + submitted (new)

Contract:  draft ─▶ revision_requested ─▶ awaiting_signatures ─▶ signed ─▶ in_progress ─▶ completed
                                                                      └──▶ disputed / cancelled / terminated

Milestone: pending ─▶ requested ─▶ paid ─▶ confirmed
                                  └──▶ disputed

Dispute:   open ─▶ under_review ─▶ resolved ─▶ closed
```

Every transition has a role guard and a domain guard. The matrix lives in `packages/core/src/state-machines/` and is tested directly.

### 6.4 Critical transactions

**Accept a quote** (customer only, `HUMAN_ONLY` for the agent):

1. `SELECT ... FOR UPDATE` the request.
2. Verify the request is `open`/`under_review`, the quote is `submitted`/`under_review`, and it has not expired.
3. Mark the chosen quote `accepted`; mark all other active quotes `rejected`.
4. Set the request to `contracted`.
5. Create a contract draft + `contract_versions` row.
6. Insert `audit_events` and `outbox_events`.
7. Commit.

Add a partial unique index: `unique (request_id) where status = 'accepted'`. Require an idempotency key.

**Sign a contract** (both parties, `HUMAN_ONLY` for the agent):

1. Verify the signer is a party and the version is current.
2. Verify the OTP challenge belongs to this signer and has not been used.
3. Insert `contract_signatures`; if both parties have signed, set contract `signed`.
4. Append a `contract_events` hash-chain row.
5. Audit + outbox; generate the PDF certificate asynchronously.

**Submit/revise a quote** (provider only):

1. Verify the provider is invited/interested (or the request is open).
2. Verify the request is accepting quotes and the provider has no active duplicate.
3. Insert the quote + line items; revisions create a new version and mark the parent `superseded`.
4. Audit + outbox.

**Mark/confirm a milestone:**

- Provider marks `requested` (or `paid` with reference); customer confirms `paid` → `confirmed` (or disputes). Both actions are audited.

---

## 7. Action catalog & agent safety

### 7.1 One definition, many interfaces

```ts
export const publishRequest = defineAction({
  name: "request.publish",
  description: "Publish a draft work or material request so providers can quote.",
  input: z.object({ requestId: z.string().uuid() }),
  output: z.object({ requestId: z.string().uuid(), status: z.literal("open") }),
  roles: ["customer"],
  ownership: "request.customerId === ctx.user.id",
  risk: "needs_approval", // agent drafts; human approves
  idempotent: true,
  async run(ctx, input) {
    return db.transaction(async (tx) => {
      // validate draft + completeness + expiry
      // update request status
      // insert audit_events + outbox_events
    });
  },
});
```

From this one definition you get:

- a typed HTTP endpoint for the web UI;
- a tool schema for the agent (no hand-written wrapper);
- an MCP tool later;
- an audit record for every call;
- a policy test target.

### 7.2 Risk tiers

| Tier | Agent behaviour | Examples |
|---|---|---|
| `READ` | Runs freely | `request.browse`, `request.get`, `quote.compare`, `profile.get` |
| `SAFE_WRITE` | Runs; labelled receipt | `request.createDraft`, `request.updateDraft`, `chat.sendMessage` |
| `NEEDS_APPROVAL` | Creates a `PendingAction`; human approves | `request.publish`, `contract.draft` |
| `HUMAN_ONLY` | Agent blocked | `quote.accept`, `contract.sign`, `payment.*`, `admin.*` |

The server, not the prompt, enforces the tier. `quote.accept` and `contract.sign` are always `HUMAN_ONLY` for the agent: the agent may compare and recommend, but a human must commit.

### 7.3 Customer agent — Core 9 tools

| Tool | Risk |
|---|---|
| `request.createDraft` | `SAFE_WRITE` |
| `request.updateDraft` | `SAFE_WRITE` |
| `request.publish` | `NEEDS_APPROVAL` |
| `request.browse` | `READ` (own requests only) |
| `request.get` | `READ` (own requests only) |
| `quote.compare` | `READ` (own request only; no phone/email) |
| `contract.draft` | `NEEDS_APPROVAL` |
| `chat.sendMessage` | `SAFE_WRITE` (labelled "via Gefifi Assistant") |
| `profile.get` | `READ` (own profile) |

Expert/supplier actions (`request.browseMatching`, `interest.express`, `quote.submit`, `quote.revise`) are **not** agent tools in the MVP. They are human actions on the web dashboard or WhatsApp card. The same action catalog makes a supply agent a post-MVP addition.

### 7.4 PendingAction semantics

| Field | Rule |
|---|---|
| `id`, `user_id`, `agent_thread_id`, `agent_message_id` | Identity and provenance. |
| `action_name`, `payload_json`, `payload_hash` | Immutable payload; SHA-256 canonical JSON. |
| `summary` | Human-readable approval card text. |
| `status` | `pending`, `approved`, `rejected`, `expired`, `stale`, `executed`, `failed`. |
| `expires_at` | 15 minutes. |
| `approved_by`, `approved_at`, `executed_at`, `execution_result`, `error` | Audit trail. |
| `idempotency_key` | Single-use execution. |

Approval checks: authenticated user, `approved_by = user_id`, status `pending`, not expired, payload hash unchanged, actor still authorized, domain state still valid. On failure return `409` with a machine-readable reason and mark `stale`/`expired`. Never execute a stale action.

### 7.5 Idempotency, audit, outbox

- Every mutation requires an `Idempotency-Key` (web) or uses the agent tool-call ID.
- Store key + user + action + request hash + response + status for 24 hours.
- Every mutation writes an `audit_events` row and an `outbox_events` row in the same transaction.
- Consumers of the outbox are idempotent; at-least-once delivery is acceptable.
- Chat timeline, WhatsApp notifications, and emails are all outbox consumers.

### 7.6 Agent evaluation gates

CI must fail if any of these break:

1. **Zero unapproved writes:** the agent never executes a `NEEDS_APPROVAL` or `HUMAN_ONLY` action directly.
2. **Tool correctness:** 50+ golden conversations choose the right action with valid arguments.
3. **PII safety:** phone numbers and emails are masked until a contract is signed.
4. **Prompt injection:** a malicious document/message cannot change the tool allowlist or risk tier.
5. **Budget:** token and latency budgets per scenario.

Run mocked evals on every PR; run live-model evals nightly.

---

## 8. Channels

### 8.1 Customer web/PWA

- React Router v7 SSR, mobile-first, installable PWA.
- Primary pages: landing, login/onboarding, home, requests list/detail/create, quote comparison, contracts, chat, profile, agent.
- Conversational creation bar as the fast path; forms for precision.
- Push notifications optional; email/WhatsApp for important events.
- Language: English + Hinglish copy; no full localization framework in MVP.

### 8.2 Expert/supplier web dashboard

- Same PWA, role-scoped views: matching requests, my quotes, active contracts, milestones, chat, profile/verification.
- No separate app and no separate design system.
- The web dashboard is the fallback when WhatsApp is not enough.

### 8.3 WhatsApp + 1-tap mobile cards

Flow:

```text
New matching request
   │
   ▼
WhatsApp utility template (opt-in)
   │  "New plumbing job in Kothrud, 3.2 km, budget ₹18,000"
   ▼
https://gefifi.in/m/<token>
   │
   ▼
SSR mobile card (< 40KB, no React)
   ├── request summary + distance
   ├── quick quote buttons
   ├── custom quote form
   └── job tracker (all active leads)
```

Security rules:

- Token is 256-bit random, stored **hashed**, scoped to user + purpose + request, expires in 7 days, revocable.
- Sensitive actions (quote submit) are single-use for the token; a fresh token is issued for a new action.
- The card is SSR HTML with no client-side framework; CSS only, minimal JS.
- WhatsApp webhook verifies Meta's signature; handles delivery status and STOP/opt-out.
- Button replies may call actions; free-form text gets an auto-reply with the card link. **No inbound conversational agent or voice extraction in MVP.**
- Voice notes: store and play in-app; no transcription until post-MVP.

### 8.4 Admin

Three screens in the same web app:

1. Provider verification queue (documents, approve/reject, reason).
2. Dispute timeline (read-only) + user suspension.
3. Category manager + audit log view.

If the timeline slips, use SQL/Retool for admin instead of building a framework.

---

## 9. Infrastructure & cost

### 9.1 Cloudflare + Supabase

| Concern | Service |
|---|---|
| Web SSR + API | Cloudflare Workers |
| Database | Supabase Postgres + PostGIS, AWS `ap-south-1` Mumbai (verify at signup) |
| Connection pooling | Cloudflare Hyperdrive |
| Files | Cloudflare R2 |
| Async jobs | Cloudflare Queues + Cron Triggers |
| Bot protection | Cloudflare Turnstile |
| LLM gateway | Cloudflare AI Gateway |
| Logs/traces | Workers Logs/Traces |
| Errors | Sentry |
| Auth | Better Auth in Postgres |
| WhatsApp | Meta Cloud API (or MSG91/Interakt) |
| SMS fallback | MSG91 or Twilio Verify (existing) |

### 9.2 Cost estimate (MVP, low volume)

| Item | Monthly estimate |
|---|---|
| Cloudflare Workers Paid | $5 + usage |
| Supabase Pro (Mumbai) | ~$25 |
| R2 storage/operations | $1–5 |
| Sentry | $0–26 |
| Domain + email | $2–5 |
| WhatsApp conversations | $5–15 (volume-dependent) |
| SMS fallback | $2–10 |
| LLM tokens (fast model) | $10–50 (cap it) |
| **Total** | **~$50–120** |

The < $100/month target is feasible at low volume. Track variable LLM/WhatsApp costs per request in `usage_events`; if they grow, raise prices or tighten budgets — do not hide them in infra.

### 9.3 Exit ramps

| Cloudflare | Exit |
|---|---|
| Workers (Hono) | Node/Bun on Fly.io, Hetzner, or Cloud Run |
| Hyperdrive | PgBouncer or direct Postgres |
| R2 | AWS S3 / MinIO (S3 API) |
| Queues | pg-boss / BullMQ |
| Cron Triggers | Any scheduler hitting an endpoint |
| AI Gateway | Direct provider SDK |
| Turnstile | hCaptcha / reCAPTCHA |

`packages/core` stays pure TypeScript. Platform code lives in thin adapters. Postgres and R2 are already portable.

### 9.4 Backups & durability

- Supabase daily backups + PITR (enable when live).
- Test a restore before launch and quarterly after.
- R2 versioning for contract PDFs and verification documents.
- Outbox + idempotency keys protect against retries and crashes.
- Contract versions are immutable; revisions create new rows.

---

## 10. DevOps & engineering method

### 10.1 Repository layout

```text
gefifi/
├── apps/
│   ├── web/                 # React Router v7, shadcn/reui, PWA
│   └── api/                 # Hono Worker: REST, webhooks, mobile cards, cron
├── packages/
│   ├── core/                # actions, policy, state machines, schemas
│   ├── db/                  # Drizzle schema, migrations, repositories
│   ├── agent/               # prompts, tool registry, runtime, evals
│   ├── ui/                  # shared React components (optional)
│   ├── config/              # tsconfig/eslint/tailwind presets
│   └── testing/             # factories, fixtures, helpers
├── docs/
│   ├── plan/made-by-opencode/
│   ├── adr/
│   └── runbooks/
├── .github/workflows/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── wrangler.jsonc
```

### 10.2 Branching & releases

- Trunk-based development: `main` is always deployable.
- Short-lived branches; squash merge; conventional commit messages.
- PR preview deploy for the web/API against the staging database.
- Staging on every merge to `main`; production on a tagged release with manual approval.
- Gradual Worker rollout (10% → 50% → 100%) + simple feature flags.
- Rollback = redeploy the previous Worker version; migrations must be backwards-compatible.

### 10.3 CI pipeline

```text
install (pnpm, cached)
  → typecheck
  → lint + format check
  → unit tests (Vitest)
  → integration tests (Postgres service, migrations, action tests)
  → build web + api
  → agent evals (mocked, fast)
  → dependency audit + secret scan
  → deploy preview (PR) / staging (main)
```

Targets: fast CI < 5 minutes; full CI < 10–12 minutes.

### 10.4 Environments & migrations

- **Local:** Docker Postgres or Supabase local; `wrangler dev`; seeded fixtures.
- **Preview:** per-PR Worker preview against a shared staging DB (no per-PR database at this budget).
- **Staging:** production-like; used for E2E and load tests.
- **Production:** protected; manual approval; backups before migrations.
- **Migrations:** Drizzle Kit; expand → migrate → contract; never drop a column in the same deploy that stops writing it.
- **Secrets:** GitHub Environments + `wrangler secret`; no secrets in the repo; rotate on departure/incident.

### 10.5 Testing strategy

| Layer | What |
|---|---|
| Unit | State machines, policy, money math, Zod schemas, pure helpers. |
| Integration | Actions against real Postgres: transactions, constraints, idempotency, audit/outbox. |
| E2E | Playwright: signup → create request → quote → accept → contract → sign → milestone. |
| Contract | Action input/output schemas; no raw rows leak; role-specific DTOs. |
| Agent | Mocked golden conversations in CI; live-model evals nightly. |
| Security | BOLA/IDOR tests, upload validation, webhook signatures, rate limits. |
| Performance | k6/Artillery on staging before launch; Lighthouse mobile ≥ 90. |
| Accessibility | axe checks on critical pages. |

### 10.6 Observability & SLOs

- Sentry for errors (browser + Workers) with release/commit tracking.
- Structured JSON logs: `request_id`, hashed `user_id`, action, latency, outcome; no PII.
- AI Gateway dashboards for tokens, cost, latency, model fallback.
- Custom `usage_events` for per-user/per-request cost.
- Uptime checks on login, request list, and quote acceptance (read-only synthetic).
- Alerts: error rate, P95 latency, queue/outbox lag, DB connections, LLM spend.

MVP SLOs:

| Metric | Target |
|---|---|
| API availability | 99.9% |
| API P95 (India) | < 300ms |
| Quote acceptance transaction | < 500ms |
| Web LCP on 4G | < 2.5s |
| Agent first token | < 2.5s P95 |
| Chat message delivery | < 2s P95 |
| OTP delivery | < 30s P95 |
| Unhandled error rate | < 0.1% |

### 10.7 Security & compliance

- RBAC + ownership + state guards in actions; DTOs only.
- Exact addresses in a separate table; phone/email masked until contract signed.
- Rate limits on auth, OTP, request creation, quote submission, and agent calls.
- Turnstile on registration and request creation.
- Pre-signed R2 uploads with MIME/size validation; checksum; virus scan post-MVP.
- Webhook signature verification and replay protection.
- Append-only audit log; admin access logged.
- DPDP: consent records, privacy policy, data export/deletion, retention policy, PII minimisation.
- WhatsApp: opt-in, STOP handling, approved utility templates, Meta business verification.
- SMS: DLT registration for the sender header and OTP templates.
- Contracts: "Digital Agreement with Audit Trail"; dual OTP; SHA-256 terms hash; PDF certificate; Section 65B evidence language; no Aadhaar eSign claims.
- Payments: no escrow; offline UPI ledger only; reserve `platform_fee_*`, `commission_status`, `settlement_type` fields.
- Legal review of ToS, privacy policy, intermediary safe-harbour language, and contract template before launch.

### 10.8 AI-specific DevOps

- Prompts and agent config are versioned in `packages/agent`; changes go through PR review.
- Tool registry is generated from the action catalog; no hand-written HTTP wrappers.
- Model IDs are environment variables (`LLM_FAST_MODEL`, `LLM_REASONING_MODEL`), pinned in CI.
- Evals: 50+ golden conversations, zero unapproved writes, tool schema compliance, PII leakage, prompt injection, budget.
- Per-user token budgets and per-request cost tracking.
- PII redaction before sending to the model; contact-info filter in chat.
- Max agent steps, timeouts, and a hard stop when the budget is exceeded.

---

## 11. Roadmap (18 weeks)

> Assumes one developer + AI coding agents. If a phase slips, use the cut list in §11.3; do not extend the timeline silently.

| Week | Phase | Deliverable | Exit criteria |
|---|---|---|---|
| **1** | Pre-flight | ADRs, domain glossary, monorepo, Cloudflare/Supabase/GitHub setup, CI skeleton, Sentry | Preview deploy works; DB connects; v2 tagged/frozen |
| **2–3** | Foundation | Better Auth (Google + phone OTP), roles/onboarding, Drizzle schema v1, `defineAction` runtime, risk tiers, audit/outbox/idempotency, design shell | Login → onboarding → sample action with audit row; CI green |
| **4–7** | Marketplace core | Projects, work/material requests, items, R2 attachments, PostGIS matching, invites/interests, quotes with line items + validity, quote acceptance transaction, notifications | End-to-end request → 3 quotes → accept → contract draft; state-machine and atomicity tests pass |
| **8–10** | Contracts & milestones | Contract versions/comments, dual OTP signing, SHA-256 terms hash, hash-chained events, PDF certificate, milestones, offline UPI ledger, DPDP consent | Draft → sign → PDF certificate; tamper test fails; milestone flow works |
| **11–12** | Chat, files, notifications | Threads per request × provider, text/files/voice notes, system timeline, SSE/polling, in-app notifications, outbox consumers | Chat works on mobile; timeline events appear; no PII leaks |
| **13–15** | Agent + WhatsApp supply | AI SDK agent runtime, Core 9 tools, approval cards, AI Gateway, usage metering, evals; WhatsApp templates, webhook, magic links, SSR mobile cards, quick quote | Agent drafts/publishes with approval; supply quotes via WhatsApp card; CI blocks unapproved writes |
| **16–17** | Admin & hardening | Verification queue, dispute read-only, category manager, suspension, audit view, reviews, security tests, load tests, Lighthouse | Security checklist passes; load targets met; admin flows work |
| **18** | Launch & buffer | Staging UAT with 5–10 users, fixes, production setup, domain/DNS/secrets/backups/alerts/runbooks, launch | Launch checklist complete; rollback tested; support process live |

### 11.1 Weekly cadence

- **Monday:** pick the week's vertical slice; write/refresh the spec.
- **Tuesday–Thursday:** build with AI agents; tests alongside.
- **Friday:** demo to yourself (or a real user), update metrics, cut anything not moving the success metric.
- **Every PR:** typecheck, lint, tests, agent eval, preview deploy.

### 11.2 Launch checklist

- [ ] One city, three categories seeded; 50 verified providers onboarded.
- [ ] Customer flow works on a mid-range Android over 4G.
- [ ] WhatsApp templates approved; opt-in/STOP tested.
- [ ] Contract signing + PDF certificate verified with a real device.
- [ ] Offline UPI ledger tested with both parties.
- [ ] Backups + restore drill; Sentry alerts; uptime checks.
- [ ] Rate limits, Turnstile, webhook signatures, BOLA tests.
- [ ] Privacy policy, ToS, intermediary disclaimer, consent screens.
- [ ] Support channel (WhatsApp/email) and incident runbook.
- [ ] Rollback rehearsed.

### 11.3 Cut list (if behind)

Cut in this order; never cut safety, auth, audit, idempotency, or backups.

1. Reviews/ratings → post-MVP.
2. Chat voice notes → text + files only.
3. Contract PDF → HTML certificate + hash; PDF later.
4. Admin custom UI → SQL/Retool.
5. WhatsApp button replies → outbound template + magic link only.
6. Material line items → single amount + notes.
7. Agent scope → 5 tools (create draft, publish, browse, compare, contract draft).
8. Chat → request-scoped comments + WhatsApp.
9. WhatsApp channel entirely → web-only (loses the supply bet; last resort).

---

## 12. Success metrics

### 12.1 Business

| Metric | Target |
|---|---|
| Signed contracts in 90 days | 10 |
| Cities / categories | 1 city / 3 categories |
| Published requests receiving ≥ 1 quote within 7 days | ≥ 30% |
| Time to first quote | < 24h median |
| Verified providers | 50 |
| Weekly active providers | ≥ 30% of verified |
| Requests started via agent | ≥ 40% of customer requests |
| Agent approval-card acceptance | ≥ 80% |
| Repeat customer rate (90 days) | ≥ 25% |

**Guardrail:** if fewer than 30% of published requests receive a quote after 8 weeks, pause feature work and fix supply acquisition.

### 12.2 Engineering

| Metric | Target |
|---|---|
| CI duration | < 10 min full; < 5 min fast |
| Change failure rate | < 15% |
| MTTR | < 1 hour |
| API P95 | < 300ms |
| Quote acceptance | < 500ms |
| Web LCP (4G) | < 2.5s |
| Agent first token | < 2.5s P95 |
| Chat delivery | < 2s P95 |
| OTP delivery | < 30s P95 |
| Unhandled errors | < 0.1% |
| Unapproved agent writes | 0 |
| Critical security findings at launch | 0 |

### 12.3 Cost

- Infrastructure < $100/month at MVP volume.
- LLM + WhatsApp + SMS tracked per request in `usage_events`.
- Know the cost per signed contract before charging a commission.

---

## 13. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Marketplace liquidity** | No quotes → no contracts | Narrow launch, seed 50 providers, WhatsApp outreach, 30% quote-rate guardrail. |
| **Scope creep** | Miss 18 weeks | Parity-first, cut list, weekly demo, no new features during rewrite. |
| **WhatsApp/Meta verification delay** | Supply channel late | Start business verification in week 1; SMS/email fallback; web dashboard always works. |
| **Workers CPU/memory limits** | PDF/agent jobs fail | Spike PDF generation in week 2; move heavy work to Queues/Containers; keep requests small. |
| **DB latency from Workers** | Slow pages | Supabase Mumbai, Hyperdrive, Smart Placement; measure P95 from India. |
| **Agent safety failure** | Wrong quote/contract | Server-enforced tiers, `HUMAN_ONLY` for accept/sign, evals in CI, immutable pending actions. |
| **Contract legal validity** | Disputes | "Digital Agreement with Audit Trail", dual OTP, hash chain, 65B language, legal review; Aadhaar eSign later. |
| **Payment compliance** | RBI issues | No escrow; offline ledger; reserve fields; partner with a licensed PA later. |
| **Privacy/DPDP** | Regulatory risk | Consent records, minimisation, retention, deletion/export, masked contact info. |
| **LLM cost/latency** | Margin/latency | AI Gateway, fast model, caching, budgets, evals, model fallback. |
| **Cloudflare lock-in** | Migration cost | Pure `packages/core`, standard Postgres/S3, exit ramps, no proprietary state as source of truth. |
| **Key-person risk** | Bus factor | ADRs, specs, tests, runbooks; AI agents can navigate the repo. |
| **React rewrite cost** | Timeline | Timebox; shadcn/reui; no custom design system; reuse domain knowledge, not Svelte code. |

---

## 14. Open decisions

| Decision | Owner | Deadline |
|---|---|---|
| WhatsApp provider: Meta Cloud API vs MSG91/Interakt | Founder | Week 1 |
| SMS provider + DLT registration | Founder | Week 2 |
| LLM provider/model shortlist and eval harness | Founder | Week 12 |
| PDF generation: `pdf-lib` on Workers vs small Node container | Founder | Week 2 spike |
| Launch city + three categories | Founder | Week 1 |
| Company entity, GST, bank account, legal review | Founder | Week 8 |
| Monetization: commission vs subscription (metering only in MVP) | Founder | Week 14 |
| Analytics: SQL/Metabase vs PostHog | Founder | Week 16 |
| Support process and SLAs | Founder | Week 17 |

---

## 15. Definition of Done

### Per action

- Zod input/output schema.
- Role, ownership, and state guards.
- Risk tier + idempotency.
- Audit event + outbox event in the same transaction.
- DTO output (no raw rows).
- Unit + integration tests, including failure paths.
- No Cloudflare imports in `packages/core`.

### Per phase

- Vertical slice works end-to-end on staging.
- E2E test for the critical flow.
- Security checklist for new surfaces.
- Performance budget met.
- Docs/ADR updated.
- Rollback path tested.

### Release

- Backups + restore drill.
- Sentry + alerts + uptime checks.
- Legal pages + consent screens.
- Rate limits + Turnstile + webhook signatures.
- Runbook for incident, refund/dispute, and provider verification.
- Business metrics dashboard live.

---

## Appendix A — ADR summary

| ADR | Decision |
|---|---|
| **0001** | Clean rewrite; freeze v2; no data migration; reuse domain knowledge only. |
| **0002** | TypeScript modular monolith; Cloudflare edge + Supabase Postgres Mumbai. |
| **0003** | One action catalog with server-enforced risk tiers and `PendingAction` approvals. |
| **0004** | React 19 + React Router v7; retire Svelte; shadcn/reui. |
| **0005** | All roles on web/PWA; experts/suppliers also get WhatsApp + 1-tap signed cards; no inbound WhatsApp agent in MVP. |
| **0006** | No Kafka, RabbitMQ, Convex, Prometheus/Grafana, Durable Objects, Workflows, or Agents SDK in the MVP. |
| **0007** | Contracts are "Digital Agreement with Audit Trail"; no escrow; offline UPI ledger. |

## Appendix B — Glossary

| Term | Meaning |
|---|---|
| **Action** | A typed, permission-checked business capability defined once and callable from UI, agent, or MCP. |
| **Action catalog** | The complete set of actions; the product's real API. |
| **PendingAction** | An immutable agent proposal that a human must approve before execution. |
| **HITL** | Human-in-the-loop; enforced by the server, not prompts. |
| **Risk tier** | `READ`, `SAFE_WRITE`, `NEEDS_APPROVAL`, `HUMAN_ONLY`. |
| **Outbox** | Events written with the domain transaction, consumed asynchronously by workers. |
| **Idempotency key** | A key that makes retries safe by returning the original result. |
| **Magic link** | A hashed, scoped, expiring token that gives a supply user passwordless access to a card. |
| **SSR card** | Server-rendered HTML for budget phones; no React runtime. |
| **DTO** | Data transfer object; a role-scoped response, never a raw database row. |
| **PostGIS** | Postgres extension for geographic radius queries. |
| **Hyperdrive** | Cloudflare's Postgres connection pooler/accelerator. |
| **DLT** | India's telecom registration for SMS senders/templates. |
| **DPDP** | India's Digital Personal Data Protection Act, 2023. |
