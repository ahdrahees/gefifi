# Gefifi v3 — Build Plan

> **Status:** Ready for execution  
> **Date:** 2026-11-02  
> **Revised:** 2026-11-10 — external review integrated; full real-time chat and voice notes retained in MVP by founder decision.
> **Owner:** Founder + AI coding agents
> **Scope:** Clean rewrite of Gefifi as an agent-native construction marketplace.
> **Horizon:** 18–20 weeks (16–18 build + 2 buffer), solo developer + AI agents. The full original scope is 22–26 weeks and is not committed.
> **Supersedes for execution:** the v3 docs in `docs/plan/made-by-antigravity/`. Those files are kept as inputs and are not edited by this plan.

---

## Document map

| File | What it covers | Use it when |
|---|---|---|
| [README.md](README.md) | Product decisions, architecture, scope, data model, roadmap, metrics, risks, DoD. | Start here; review monthly. |
| [rewrite-playbook.md](rewrite-playbook.md) | Freezing v2, repo bootstrap, first 10 days, vertical slices, parity checklist, cutover. | Week 0 and every slice. |
| [engineering-rules.md](engineering-rules.md) | TypeScript, module boundaries, actions, data access, permissions, edge cases, testing, security, agent coding rules. | Every PR. |
| [permissions-matrix.md](permissions-matrix.md) | Actors, action matrix, field visibility, state transitions, channel rules. | Every action, endpoint, or state change. |
| [acquisition-plan.md](acquisition-plan.md) | The two-week pre-code concierge sprint: city, categories, 100-provider list, call script, 20 requests, pricing hypothesis. | Before Week 1. |
| [verification-rubric.md](verification-rubric.md) | Provider documents, review SLA, fraud signals, suspension and re-verification. | Week 1 onward. |
| [legal-and-payments-checklist.md](legal-and-payments-checklist.md) | Entity, GST/TCS, stamp duty, insurance, intermediary posture, BSA/DPDP, retention, support and refunds. | Before launch. |
| [analytics-events.md](analytics-events.md) | The 12 core events, properties, and no-PII rules. | Week 1. |
| [AGENTS.md](AGENTS.md) | Operating contract for AI coding agents. | Copy to the `gefifi-v3` repo root on Day 1. |

### Plan completeness

This plan covers architecture, scope, data model, action safety, channels, infrastructure, DevOps, roadmap, metrics, risks, and definition of done. It does **not** replace:

- legal review of the ToS, privacy policy, and contract template (tracked in `legal-and-payments-checklist.md`);
- the named provider list and customer commitments (tracked in `acquisition-plan.md`);
- brand/design exploration;
- the analytics implementation (event taxonomy is in `analytics-events.md`);
- a fundraising or unit-economics model beyond the cost baseline in §12.3.

Those are **open inputs**, not engineering unknowns. They are tracked in §14 and must be closed before their deadlines.

---

## How to use this plan

1. **Read §1–§3 first.** They contain the product decisions and the expected outcome. Everything else follows from them.
2. **Run the pre-code acquisition sprint in [acquisition-plan.md](acquisition-plan.md) before Week 1.** Code does not create liquidity.
3. **Use §11 as the weekly execution board.** Do not start a phase before its predecessor's exit criteria are met.
4. **Use §6–§8 and the engineering rules while building.** They define the data model, action catalog, risk tiers, and channel behaviour.
5. **Use [rewrite-playbook.md](rewrite-playbook.md) for the first 10 days and every vertical slice.**
6. **Use §12–§14 to say no.** The cut list and non-goals are part of the plan, not an afterthought.
7. **When reality changes, update this file.** It is the single source of truth for v3 execution.

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

**Expected outcome after 18–20 weeks:** a production-ready customer PWA, full real-time chat with presence, typing, read receipts, and voice notes, a WhatsApp + 1-tap mobile-card channel for experts and suppliers, a complete request → quote → contract → signature → milestone flow, an in-app customer agent with approval cards, a minimal admin console, one deploy pipeline, and a CI suite that blocks unsafe agent writes.

**Business definition of success:** 10 signed contracts in 90 days, in one city, in three categories.

**Pre-code gate:** a two-week concierge acquisition sprint. Pick one city and three categories, name 100 providers, call 25, get 10 written "I will quote within 24 hours" commitments, and collect 20 real customer requests. If this list does not exist, do not start the rewrite. The code is not the risk; the empty marketplace is.

---

## 2. Decisions locked

| Decision | Choice | Why |
|---|---|---|
| **Primary goal** | Launch a real business | Optimise for learning, liquidity, and trust — not hypothetical scale. |
| **Team** | Solo developer + AI coding agents | Every choice must reduce cognitive and operational load. |
| **Timeline** | 18–20 weeks (16–18 build + 2 buffer) | Cut MVP with full real-time chat and voice notes. The full original scope is 22–26 weeks and is not committed. |
| **Existing data** | Clean start, no migration | v2 is a prototype. Reuse domain knowledge, not data or code. |
| **Rewrite style** | Clean rewrite; freeze v2 | A strangler would preserve the split stack that caused the problems. |
| **Frontend** | React 19 + React Router v7 | Best agent-UI ecosystem and hiring pool; shadcn/reui are React-first. |
| **Channels** | All roles on web/PWA; experts and suppliers also get WhatsApp alerts + 1-tap signed mobile cards | Customers need screen space; supply needs zero-password, low-bandwidth access. |
| **Cloud** | Cloudflare + Supabase Postgres (Mumbai) | Edge compute, cheap storage, low ops; database close to Indian users. |
| **Infra budget** | $150–200/month infra; $250–350/month all-in | PITR alone is ~$100/month. Track WhatsApp/SMS/LLM and cost per signed contract. |
| **Scope** | Cut MVP with full real-time chat, presence, typing, SSE, and voice notes (no transcription) | The founder has made full chat non-negotiable. Reviews, projects, PostGIS radius matching, supply agent, PDF certificate, and custom admin UI are deferred. |
| **Acquisition** | Two-week pre-code concierge sprint | 100 named providers, 10 written quote commitments, 20 customer requests. No code before this list exists. |
| **Agent scope** | Customer web agent with 5 tools; external messages are draft-only | Supply uses deterministic WhatsApp cards, not a chatbot. The agent never sends an external message itself. |
| **Chat** | Postgres + SSE; full real-time chat with presence, typing, read receipts, and voice notes | Postgres is the source of truth; SSE is the transport. No Durable Objects unless measured concurrency demands them. |
| **Contracts** | "Electronic acceptance with audit trail" | SHA-256 terms hash + dual OTP + hash-chained events + HTML certificate; not Aadhaar eSign, not Section 65B. |
| **Payments** | Offline UPI ledger, no escrow | Escrow requires an RBI-licensed partner; reserve schema fields now. |

---

## 3. Product scope

### 3.1 In scope (MVP)

| Area | MVP scope |
|---|---|
| **Identity** | Multi-role account (customer / expert / supplier / admin), active-role switching, Google login, phone OTP (WhatsApp primary, SMS fallback), provider verification with a manual queue from Week 2–3. |
| **Requests** | Work requests and material requests with items, quantity/unit, approximate location, photos, attachments, expiry, open or invite-only visibility. |
| **Site visits** | Request, schedule, address release with consent, check-in/check-out, notes/photos, no-show handling. Exact address is never on the public request. |
| **Discovery** | City/pincode/category filters, expert/supplier profiles, invite and express-interest flows. PostGIS radius matching is deferred. |
| **Quotes** | Versioned quotes, simple line items, one tax mode and rate, validity, submit/revise/compare/accept/reject/expire. |
| **Contracts** | Draft, revision comments, versions, dual OTP signature, terms hash, hash-chained events, HTML audit certificate. No PDF in MVP. |
| **Milestones** | Lump-sum and milestone schedule; offline UPI ledger with screenshot; customer marks paid, provider confirms receipt. |
| **Chat** | Full real-time chat: one thread per request × provider; text, files, images, and voice notes (record/upload/store/play, no transcription); presence, typing, read receipts, unread counts, system timeline cards, block/mute. |
| **Agent** | Customer web agent with 5 tools: create draft, update draft, publish (approval), compare quotes, get profile. External messages are drafts; the human sends. Approval cards for risky actions. |
| **Supply channel** | WhatsApp utility templates + magic link + SSR mobile card (< 40KB) for lead alerts, quote submission/revision, and job tracking. Outbound only; no inbound button automation in MVP. |
| **Admin** | Provider verification queue (minimal UI or SQL/Retool), read-only dispute timeline, category manager, user suspension, audit log view. |
| **Trust** | Verification badges and a manual verification rubric. Reviews and ratings are deferred. |
| **Notifications** | In-app notifications, WhatsApp utility templates, transactional email (optional), SMS OTP fallback, new-message notification. |
| **Files** | R2 pre-signed uploads; images, PDFs, DWG/DXF stored and previewed; audio for voice notes; no CAD parsing. |
| **Compliance** | DPDP consent records, privacy policy, data deletion/export, retention schedule, WhatsApp opt-in/STOP, DLT-registered SMS fallback. |
| **Analytics** | 12 core events, one dashboard, no PII. See [analytics-events.md](analytics-events.md). |

### 3.2 Out of scope (MVP)

- In-app payments, escrow, payouts, or RBI-regulated fund handling.
- Aadhaar eSign or claims of "legally binding e-signature"; no Aadhaar collection for verification.
- Native iOS/Android apps.
- Voice transcription, AI extraction from audio, or WhatsApp voice quoting. Voice notes are record/play only.
- Reviews and ratings.
- Projects grouping.
- PostGIS radius matching.
- PDF audit certificate (HTML + hash in MVP).
- Custom admin UI (SQL/Retool fallback).
- Material tax/HSN, per-line GST, and multi-line tax complexity.
- Supply agent and WhatsApp inbound button automation.
- Public MCP server, action versioning, and a generated tool registry UI.
- Multi-city launch, full localization, group chat, video calls.
- Subscription billing (build the metering seam, not billing).
- Custom analytics warehouse, self-hosted Prometheus/Grafana, Kubernetes, Kafka, RabbitMQ, microservices.
- Load tests, Lighthouse 90, axe accessibility, and 24-hour smoke tests in the launch gate.

### 3.3 Launch wedge

- **One city:** Pune (confirm before code; see [acquisition-plan.md](acquisition-plan.md)).
- **Three categories:** plumbing, electrical, painting (confirm before code).
- **One promise:** "Post a job, get verified quotes, sign a clear agreement, track milestones."
- **One channel bet:** customer web + WhatsApp supply cards, with SMS/phone/web fallback.
- **Pre-code gate:** 100 named providers, 10 written "quote within 24 hours" commitments, 20 real customer requests. If the list does not exist, the launch wedge is not chosen.

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
│    ├── /chat/threads/:id/stream → SSE (messages, presence, typing)  │
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
9. **SSE is transport, not state.** Chat messages, presence, typing, and read receipts live in Postgres; an SSE disconnect loses no data and reconnects with `Last-Event-ID`.
10. **External side effects are asynchronous.** WhatsApp, email, and notifications go through the outbox; never inside a database transaction.

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
| **Database** | Postgres 15+ with PostGIS (Supabase Mumbai) | Relational truth; PostGIS is available, but the MVP uses city/pincode filters rather than radius matching. Verify Mumbai availability at signup. |
| **ORM** | Drizzle ORM + Drizzle Kit | SQL-first, typed, Worker-compatible, portable. |
| **Connection** | Cloudflare Hyperdrive | Pooling and caching between Workers and Postgres. |
| **Auth** | Better Auth | Sessions in our Postgres; Google OAuth + phone OTP. |
| **Files** | Cloudflare R2 | S3-compatible, zero egress; images, documents, and voice notes. |
| **Async jobs** | Transactional outbox + Cloudflare Queues + Cron Triggers | No Kafka/RabbitMQ. |
| **Realtime chat** | SSE + Postgres polling for presence/typing | No Durable Objects in MVP; supports reconnect and backfill. |
| **Agent runtime** | Vercel AI SDK + custom action registry + Postgres state | Model-agnostic; no Agents SDK/Durable Objects in MVP. |
| **LLM access** | Cloudflare AI Gateway | One pinned model, token budgets, cost/latency logging. |
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

- **Location filtering** is core to the marketplace. The MVP uses city/pincode/category indexes; PostGIS radius matching is deferred, and Convex's lack of PostGIS would still block that later step without an external service.
- **Contracts, money, audit, and reporting** benefit from SQL constraints, partial unique indexes, `FOR UPDATE`, and set-based queries. Convex has transactions and indexes, but not the SQL surface.
- **Portability:** moving off Convex means rewriting queries/mutations and migrating data, not changing a connection string.
- **Runtime:** Convex functions run on Convex, not Cloudflare Workers. That is a second platform and auth/runtime integration to own.

Convex would be a reasonable choice for a realtime-heavy CRUD app with no geospatial or SQL reporting needs. Gefifi is not that app.

---

## 6. Domain model

### 6.1 Conventions

- **IDs:** UUIDv7 for domain tables; configure Better Auth to use UUIDs. `user.id` is the canonical identity.
- **Money:** integer paise (`bigint`), ISO currency (`INR`). Never floats. Serialize as **decimal strings** in JSON; never as a JavaScript number.
- **Time:** `timestamptz`, stored UTC, rendered in IST.
- **Enums:** Postgres enums for stable statuses; `text` + check constraints for evolving taxonomies.
- **Soft delete:** only where recovery matters (`deleted_at`); not everywhere.
- **Authorization:** enforced in the action layer. Add RLS later only as defence-in-depth for sensitive tables.
- **DTOs:** repositories never return raw rows to clients.
- **Addresses:** exact addresses live only in `addresses`. `requests` stores `address_id` and `approx_area`; release is a separate, audited action.
- **Chat:** Postgres is the source of truth for messages, reads, presence, and typing. SSE is a transport. Presence and typing rows are short-lived and expire automatically.
- **Tax:** one `tax_mode` (`included`/`excluded`) and one `tax_rate_bp`; round half-up. No HSN or per-line GST in MVP.

### 6.2 Tables

**Identity & trust**

| Table | Purpose |
|---|---|
| `user` | Better Auth identity table, extended with `phone`, `phone_verified`, `primary_role`, `status`. |
| `session`, `account`, `verification` | Better Auth session/OAuth/OTP tables. |
| `user_roles` | Multi-role support (`customer`, `expert`, `supplier`, `admin`), status, verified_at. |
| `profiles` | Display name, bio, avatar, city, language preference. |
| `provider_profiles` | Expert/supplier kind, categories, service area, experience, company name, GSTIN, verification status, rating aggregates. |
| `provider_documents` | Uploaded verification documents and review status. |
| `addresses` | Private address records with `geography(Point, 4326)`; never on the public request row. |
| `consent_records` | DPDP consent version, purpose, granted/revoked timestamps, IP, user agent. |
| `magic_links` | Hashed tokens for supply cards; user, purpose, request, expiry (24–72h read), used/revoked, one active token per user/purpose. |
| `otp_challenges` | Single-use OTP challenges: user, purpose, entity type/id, version, code hash, expiry, attempts, consumed_at. |
| `whatsapp_contacts` | Phone, marketing opt-in, utility opt-in, STOP timestamp, source, last template quality signal. |

**Marketplace**

| Table | Purpose |
|---|---|
| `categories` | Trade/material taxonomy, parent/child, active flag. |
| `requests` | Work/material request header: customer, kind, category, status, visibility, expiry, budget, `address_id`, `approx_area`. |
| `request_items` | Material line items: description, quantity, unit, notes. |
| `request_invites` | Customer invites a provider to a request. |
| `request_interests` | Provider expresses interest in an open request. |
| `site_visits` | Request, provider, scheduled time, status, address release timestamp, consent record, check-in/out, notes/photos. |
| `quotes` | Versioned quote header: provider, request, version, parent, status, subtotal/tax/total, validity, terms. |
| `quote_line_items` | Simple lines: description, quantity, unit, unit price, amount, `tax_mode`, `tax_rate_bp`. |
| `attachments` | Polymorphic file metadata pointing to R2 keys; supports images, documents, and audio. |

**Contracts & money**

| Table | Purpose |
|---|---|
| `contracts` | Current contract state for a request/proposal: parties, type, status, current version, total, `signature_method`. |
| `contract_versions` | Immutable terms JSON + SHA-256 hash; one row per revision. |
| `contract_signatures` | One row per signer per version; `otp_challenge_id`, timestamp, IP, device, user agent, terms hash. |
| `contract_events` | Append-only hash chain (`prev_hash`, `event_hash`) for the audit certificate. |
| `contract_comments` | Revision requests, comments, and signature-time remarks/attachments. |
| `milestones` | Sequence, amount, due date, status. |
| `payment_records` | Offline UPI/NEFT/cash reference, screenshot, payer, payee, marked-paid and confirmed timestamps. |
| `disputes` | Contract dispute, reason, status, read-only admin view; resolution is manual in MVP. |
| `contract_certificates` | Generated HTML certificate, terms hash, audit chain snapshot, generated_at. |

**Communication & agent**

| Table | Purpose |
|---|---|
| `chat_threads` | One thread per request × provider. |
| `chat_messages` | Text/file/image/voice/system messages; `duration_ms`, `waveform_json`, `attachment_id`, tombstone fields. |
| `chat_reads` | Per-user `last_read_message_id` and unread counts per thread. |
| `chat_presence` | Per-user/per-thread presence with `last_seen_at` and a short TTL. |
| `chat_typing` | Per-user/per-thread typing state with a short TTL; not historical. |
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
| `webhook_events` | Provider, external_id (unique), payload hash, signature verified, processed_at; replay dedupe. |
| `jobs` | Durable cron jobs (expiry, reminders) with `FOR UPDATE SKIP LOCKED`. |
| `feature_flags` | Simple DB/env flags. |

### 6.3 State machines

```text
Work request:     draft ─▶ open ─▶ under_review ─▶ contracted ─▶ in_progress ─▶ completed
                            │        │                 │              │
                            └────────┴─────────────────┴──────────────┴──▶ cancelled / expired / disputed

Material request: draft ─▶ open ─▶ quoting ─▶ ordered ─▶ delivered ─▶ completed
                            │          │           │            │
                            └──────────┴───────────┴────────────┴──▶ cancelled / expired / disputed

Quote:     draft ─▶ submitted ─▶ under_review ─▶ accepted
                        │             │
                        └─────────────┴──▶ rejected / expired
                        └── revise ──▶ superseded (old) + submitted (new); v2 "revised" maps here

Contract:  draft ─▶ revision_requested ─▶ draft (new version) ─▶ awaiting_signatures ─▶ signed ─▶ in_progress ─▶ completed
                                                                                    └──▶ disputed / cancelled / terminated

Milestone: pending ─▶ requested ─▶ paid ─▶ confirmed
                                  └──▶ disputed

Site visit: requested ─▶ scheduled ─▶ completed / no_show / cancelled

Chat msg:  sending ─▶ sent ─▶ delivered ─▶ read
                                    └──▶ deleted (tombstone)

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

**Submit/revise a quote** (provider only):

1. Verify the provider is invited/interested (or the request is open) and verified.
2. Verify the request is accepting quotes and the provider has no active duplicate.
3. Insert the quote + line items; revisions create a new version and mark the parent `superseded`.
4. Audit + outbox.

**Sign a contract** (both parties, `HUMAN_ONLY` for the agent):

1. Verify the signer is a party and the version is current.
2. Verify the `otp_challenges` row belongs to this signer, purpose `contract_sign`, entity/version, has not expired, and has not been consumed.
3. Insert `contract_signatures` with `otp_challenge_id`, IP, device, user agent, terms hash; if both parties have signed, set contract `signed`.
4. Append a `contract_events` hash-chain row.
5. Audit + outbox; generate the **HTML certificate** asynchronously (not PDF in MVP).

**Open a chat thread and send a message** (participants only):

1. Verify the sender is a participant of the request/contract and the thread is not blocked.
2. Insert `chat_messages` with `client_message_id` (idempotency), body, kind, attachment metadata.
3. Update `chat_threads.last_message_at`; update unread counts for the other participants.
4. Insert `audit_events` + `outbox_events` (notification, WhatsApp if offline).
5. Commit; the SSE stream emits `message.created` to connected participants.

**Request and complete a site visit** (customer and shortlisted provider):

1. Customer or provider requests a site visit; customer confirms the time.
2. On confirmation, the customer releases the exact address to that provider only, with a consent record, expiry, and audit event.
3. Check-in/check-out timestamps and notes/photos are stored on `site_visits`.
4. Release expires after the visit or at the customer's revocation; the provider loses exact-address access afterward.

**Mark/confirm a milestone:**

- **Customer** marks `paid` with the UPI/NEFT/cash reference and evidence.
- **Provider** confirms receipt → `confirmed`, or disputes.
- Neither party may perform the other party's step. Both actions are audited.

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
| `READ` | Runs freely | `request.get`, `quote.compare`, `profile.get` |
| `SAFE_WRITE` | Runs; labelled receipt | `request.createDraft`, `request.updateDraft`, `chat.message.draft` |
| `NEEDS_APPROVAL` | Creates a `PendingAction`; human approves | `request.publish` |
| `HUMAN_ONLY` | Agent blocked | `quote.accept`, `contract.sign`, `payment.*`, `admin.*`, `chat.message.send` |

The server, not the prompt, enforces the tier. `quote.accept` and `contract.sign` are always `HUMAN_ONLY` for the agent: the agent may compare and recommend, but a human must commit. **External messages are draft-only:** the agent produces a draft; the human taps send. `chat.message.send` is `HUMAN_ONLY` for agent callers, and `chat.message.draft` does not deliver anything.

### 7.3 Customer agent — Core 5 tools

| Tool | Risk |
|---|---|
| `request.createDraft` | `SAFE_WRITE` |
| `request.updateDraft` | `SAFE_WRITE` |
| `request.publish` | `NEEDS_APPROVAL` |
| `quote.compare` | `READ` (own request only; no phone/email) |
| `profile.get` | `READ` (own profile) |

Chat assistance is a UI affordance: the agent returns a draft string, the human edits and sends it. `chat.message.send` is not an agent tool in the MVP.

Expert/supplier actions (`request.browseMatching`, `interest.express`, `quote.submit`, `quote.revise`) are **not** agent tools in the MVP. They are human actions on the web dashboard or WhatsApp card. The same action catalog makes a supply agent a post-MVP addition.

**Kill switch:** a per-user and per-thread flag immediately disables agent calls, cancels in-flight tool calls, and returns a fallback message. It is server-side and does not depend on the model.

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
2. **Tool correctness:** 15–20 golden conversations choose the right action with valid arguments.
3. **PII safety:** phone numbers and emails are masked until a contract is signed or an address is released for a site visit.
4. **Prompt injection:** a malicious document/message cannot change the tool allowlist or risk tier, and cannot cause an external message to be sent.
5. **Draft-only external messages:** an agent attempt to send a phone number, link, price, or commitment produces a draft, never a delivered message.
6. **Budget:** token and latency budgets per scenario.
7. **Kill switch:** disabling the agent stops tool calls immediately and returns a fallback.

Run mocked evals on every PR; run live-model evals nightly after launch. Start with 15–20 high-quality conversations, not 50+.

---

## 8. Channels

### 8.1 Customer web/PWA

- React Router v7 SSR, mobile-first, installable PWA.
- Primary pages: landing, login/onboarding, home, requests list/detail/create, quote comparison, contracts, chat, profile, agent.
- Chat: thread list with unread badges, message timeline, presence dots, typing indicator, read receipts, voice recorder/player, file/image upload, reconnect banner.
- Conversational creation bar as the fast path; forms for precision.
- Push notifications optional; email/WhatsApp for important events and new messages.
- Language: English + Hinglish copy; supply cards and WhatsApp templates also have Hindi/Marathi copy. No full localization framework in MVP.

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
   │  "New plumbing job in Kothrud, budget ₹18,000"
   ▼
https://gefifi.in/m/<token>
   │
   ▼
SSR mobile card (< 40KB, no React)
   ├── request summary
   ├── custom quote form
   ├── quote revision
   └── job tracker (all active leads)
```

Security rules:

- Read token is 256-bit random, stored **hashed**, scoped to user + purpose + request, expires in **24–72 hours**, revocable, bound to the phone number, and limited to one active token per user/purpose.
- Sensitive actions (quote submit/revise) require a fresh **15-minute single-use** token plus step-up OTP.
- The card is SSR HTML with no client-side framework; CSS only, minimal JS; `noindex` and `Referrer-Policy: no-referrer`.
- WhatsApp webhook verifies Meta's signature; deduplicates by message ID in `webhook_events`; handles delivery status and STOP/opt-out.
- Lead notifications are **marketing** and require marketing opt-in. Quote received, contract signature, and payment confirmation are **utility** templates. `whatsapp_contacts` stores both.
- Outbound only in MVP. Button replies and inbound automation are deferred.
- Chat voice notes are in-app, not WhatsApp. Voice notes are store/play only; no transcription.

### 8.4 Admin

Three screens in the same web app:

1. Provider verification queue (documents, approve/reject, reason). Live from Week 2–3; use SQL/Retool if the UI lags.
2. Dispute timeline (read-only) + user suspension. Resolution is manual in MVP.
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
| Supabase PITR (7 days) | ~$100 |
| R2 storage/operations (documents + voice notes) | $2–8 |
| Sentry | $0–26 |
| Domain + email | $2–5 |
| WhatsApp conversations | $10–30 (volume- and category-dependent) |
| SMS fallback | $2–10 |
| LLM tokens (one pinned model) | $10–50 (cap it) |
| **Infra subtotal** | **~$150–200** |
| Variable WhatsApp/SMS/LLM + support buffer | ~$100–150 |
| **All-in target** | **~$250–350** |

PITR is **mandatory at launch** because the product holds contracts and payment evidence. Track variable LLM/WhatsApp costs per request in `usage_events`; if they grow, raise prices or tighten budgets — do not hide them in infra.

At 10 contracts in 90 days, the estimated all-in run cost is **$600–1,050**, or **$60–105 per signed contract before founder time**. This is an estimate, not a quote. Track it from the first contract.

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
| SSE | WebSocket via Durable Objects or a Node host if measured concurrency demands it |

`packages/core` stays pure TypeScript. Platform code lives in thin adapters. Postgres and R2 are already portable.

### 9.4 Backups & durability

- Supabase daily backups + **PITR enabled at launch** (mandatory for contracts and payment evidence).
- **RPO ≤ 15 minutes; RTO ≤ 4 hours.**
- Test a restore before launch and quarterly after.
- R2 versioning for contract certificates, verification documents, and voice notes.
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

**Fast PR lane (blocking):**

```text
install (pnpm, cached)
  → typecheck
  → lint + format check
  → unit tests (Vitest)
  → build web + api
  → action contract checks
  → dependency audit + secret scan
  → deploy preview (PR)
```

**Nightly / pre-merge full lane:**

```text
integration tests (Postgres service, migrations, action tests)
  → Playwright E2E (critical flows)
  → chat/SSE/voice integration
  → agent evals (mocked, then live-model nightly)
  → staging deploy (main)
```

Targets: fast lane < 5 minutes; full lane < 20 minutes. Do not block every PR on the full matrix.

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
| Unit | State machines, policy, money math, tax rounding, Zod schemas, pure helpers. |
| Integration | Actions against real Postgres: transactions, constraints, idempotency, audit/outbox, OTP challenges, webhook dedupe. |
| E2E | Playwright: signup → create request → quote → accept → contract → sign → milestone; plus chat send/receive. |
| Chat | SSE connect/reconnect with `Last-Event-ID`, presence heartbeat/TTL, typing expiry, read receipts, duplicate/out-of-order messages, voice upload/playback authorization. |
| Contract | Action input/output schemas; no raw rows leak; role-specific DTOs. |
| Agent | 15–20 mocked golden conversations in CI; live-model evals nightly. |
| Security | BOLA/IDOR tests, upload validation, EXIF stripping, webhook signatures, rate limits, magic-link replay. |
| Mobile | One Playwright mobile viewport check on the critical path. |

Load tests, Lighthouse 90, axe accessibility, and 24-hour smoke tests are post-MVP hardening.

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
| SSE reconnect | < 3s P95 |
| Voice upload (10 MB, 4G) | < 15s P95 |
| OTP delivery | < 30s P95 |
| Unhandled error rate | < 0.1% |

### 10.7 Security & compliance

- RBAC + ownership + state guards in actions; DTOs only.
- Exact addresses in a separate table; released only through `site_visits` with consent, expiry, revocation, and audit; phone/email masked until a contract is signed or an address is released for a site visit.
- Rate limits on auth, OTP, request creation, quote submission, chat send/upload, and agent calls.
- Turnstile on registration and request creation.
- Pre-signed R2 uploads with MIME/size validation, checksum, **EXIF/GPS stripping**, and signed downloads; virus scan post-MVP.
- Voice notes: audio MIME allowlist, max 5 minutes / 10 MB, signed playback URLs, no transcription.
- Webhook signature verification and replay protection via `webhook_events`.
- Magic links: 24–72h read, phone + request binding, one active token, `noindex`, 15-minute single-use mutation tokens.
- Append-only audit log; admin access logged; break-glass reason codes.
- DPDP: consent records, privacy policy, data export/deletion, retention schedule (contracts/audit 8 years, chat 2 years, verification docs 1 year after offboarding, analytics 24 months, backups 30 days), PII minimisation.
- WhatsApp: marketing vs utility opt-in, STOP handling, approved templates, Meta business verification, template quality tracking.
- SMS: DLT registration for the sender header and OTP templates.
- Contracts: **"electronic acceptance with audit trail"**; dual OTP; SHA-256 terms hash; hash-chained events; HTML certificate; **no Section 65B, no "admissible evidence" claim, no Aadhaar eSign claim**. Counsel review before launch.
- Payments: no escrow; offline UPI ledger only; Gefifi does not hold, route, or guarantee funds; reserve `platform_fee_*`, `commission_status`, `settlement_type` fields.
- Legal review of ToS, privacy policy, intermediary safe-harbour language, contract template, stamp duty, GST/TCS, and retention before launch.

### 10.8 AI-specific DevOps

- Prompts and agent config are versioned in `packages/agent`; changes go through PR review.
- Tool registry is generated from the action catalog; no hand-written HTTP wrappers.
- Model IDs are environment variables (`LLM_MODEL`), pinned in CI. One model at launch.
- Evals: 15–20 golden conversations, zero unapproved writes, tool schema compliance, PII leakage, prompt injection, draft-only external messages, and budget.
- Per-user token budgets and per-request cost tracking.
- PII redaction before sending to the model; contact-info filter in chat and drafts.
- Max agent steps, timeouts, and a hard stop when the budget is exceeded.
- Per-user and per-thread kill switch; disabling the agent cancels in-flight tool calls.
- AI Gateway dashboards, fallback, caching, and model A/B are post-MVP.

---

## 11. Roadmap (18–20 weeks)

> **Pre-code:** a two-week acquisition sprint (Week -2 to 0) per [acquisition-plan.md](acquisition-plan.md). Then **16 weeks build + 2 weeks buffer = 18 weeks baseline**. The allowed 2-week slip makes it **18 weeks build + 2 weeks buffer = 20 weeks**; it is not a silent extension. Full real-time chat and voice notes are non-negotiable. If a phase slips, use the buffer or the cut list in §11.3; do not extend the timeline beyond 20 weeks without re-planning.

| Week | Phase | Deliverable | Exit criteria |
|---|---|---|---|
| **-2–0** | **Acquisition** | City/categories, 100 named providers, 25 calls, 10 written quote commitments, 20 customer requests, pricing hypothesis | List exists; commitments in writing; no code started |
| **1** | Pre-flight | ADRs, monorepo, Cloudflare/Supabase/GitHub setup, CI skeleton, Sentry; start Meta verification + DLT; tag/freeze v2 | Preview deploy works; DB connects; v2 tagged/frozen |
| **2–3** | Foundation | Better Auth (Google + phone OTP), roles/onboarding, Drizzle schema v1, `defineAction` runtime, risk tiers, audit/outbox/idempotency, manual verification queue + 10–20 pre-verified providers, design shell | Login → onboarding → sample action with audit row; CI green; verification SLA live |
| **4–5** | Marketplace core | Work/material requests, items, R2 attachments, city/pincode discovery, invites/interests, **site visits + address release**, quotes with simple line items + validity, quote acceptance transaction | End-to-end request → 3 quotes → accept → contract draft; state-machine, site-visit, and atomicity tests pass |
| **6–7** | **Chat + voice** | Threads, SSE stream, presence, typing, read receipts, unread counts, text/files/images, voice notes (record/upload/store/play), block/mute, in-app + WhatsApp new-message notifications | Real-time chat on a mid-range Android; SSE reconnect; presence/typing TTL; voice upload/playback; permission and PII tests pass |
| **8–10** | Contracts & milestones | Contract versions/comments, dual OTP, SHA-256 terms hash, hash-chained events, HTML certificate, milestones, offline UPI ledger, DPDP consent | Draft → sign → HTML certificate; tamper/replay tests fail correctly; milestone flow works; customer marks paid, provider confirms |
| **11–12** | WhatsApp + agent | WhatsApp templates, webhook dedupe, magic links, SSR mobile cards; customer agent with 5 tools, approval cards, budgets, 15–20 evals | Supply quotes via card; agent drafts/publishes with approval; zero unapproved writes; draft-only external messages |
| **13–14** | Admin & hardening | Verification queue UI (if needed), suspension, category manager, read-only audit/dispute, security tests, Playwright critical path, mobile check | Security checklist passes; UAT with 5–10 real users; no critical findings |
| **15–16** | Launch | Production setup, domain/DNS/secrets, PITR + restore drill, alerts, runbooks, legal pages, support channel, launch | Launch checklist complete; rollback tested; support live |
| **17–18** | Buffer | Slip absorption, post-launch fixes, first-contract operations | 10 contracts in 90 days tracked; weekly acquisition cadence running |

**Most likely slip:** Weeks 6–7 (chat/SSE/presence/voice) and Weeks 8–10 (contracts/signing). Protect them by keeping the WhatsApp and agent scope thin, and by not adding reviews, projects, PostGIS, or a supply agent.

### 11.1 Weekly cadence

- **Monday:** pick the week's vertical slice; write/refresh the spec.
- **Tuesday–Thursday:** build with AI agents; tests alongside.
- **Friday:** demo to yourself (or a real user), update metrics, cut anything not moving the success metric.
- **Every PR:** typecheck, lint, tests, agent eval, preview deploy.

### 11.2 Launch checklist

- [ ] One city, three categories seeded; **50 verified providers onboarded**, with a named list and 10 written quote commitments.
- [ ] **20 real customer requests** collected before or during build.
- [ ] Customer flow works on a mid-range Android over 4G.
- [ ] **Full chat works:** send/receive, presence, typing, read receipts, reconnect, voice note upload/playback.
- [ ] WhatsApp templates approved; marketing vs utility opt-in and STOP tested.
- [ ] Contract signing + **HTML certificate** verified with a real device.
- [ ] Site visit + address release tested with a real provider and customer.
- [ ] Offline UPI ledger tested with both parties.
- [ ] Backups + **PITR restore drill**; RPO ≤15 min, RTO ≤4h; Sentry alerts; uptime checks.
- [ ] Rate limits, Turnstile, webhook signatures, BOLA tests.
- [ ] Privacy policy, ToS, intermediary disclaimer, consent screens, retention schedule.
- [ ] Legal review of the contract template, BSA 2023 framing, GST/TCS, stamp duty, and DPDP.
- [ ] Support channel (WhatsApp/email) with a 24h first-response SLA and incident runbook.
- [ ] Rollback rehearsed.

### 11.3 Cut list

**Deferred by default — do not build in MVP:** reviews, projects, PostGIS radius matching, supply agent, material tax/HSN, PDF certificate, custom admin UI, WhatsApp inbound buttons, MCP/action versioning, AI Gateway fallback dashboards, load tests, Lighthouse 90, axe, 24h smoke tests.

If still behind after using the 2-week buffer, cut in this order:

1. WhatsApp button replies / inbound automation (already out).
2. Material line items → single amount + notes.
3. Agent scope → 3 tools (create draft, publish approval, compare quotes).
4. Custom admin screens → SQL/Retool.
5. WhatsApp channel entirely → web-only (last resort; loses the supply bet).

**Never cut:** auth, server-enforced permissions, audit, idempotency, backups/PITR, contract hash/versions, the quote-acceptance transaction, provider verification, DPDP consent, WhatsApp opt-in/STOP, legal review, rollback, **full real-time chat, presence, typing, SSE, and voice notes**.

---

## 12. Success metrics

### 12.1 Business

| Metric | Target |
|---|---|
| Signed contracts in 90 days | 10 |
| Cities / categories | 1 city / 3 categories |
| Named providers / verified providers | 100 named / 50 verified |
| Written "quote within 24h" commitments | 10 before code |
| Real customer requests collected before launch | 20 |
| Published requests receiving ≥ 1 quote within 7 days | ≥ 30% |
| Time to first quote | < 24h median |
| Weekly active providers | ≥ 30% of verified |
| Provider activation (first quote within 7 days) | ≥ 50% of onboarded |
| Requests started via agent | ≥ 40% of customer requests |
| Agent approval-card acceptance | ≥ 80% |
| Chat adoption | ≥ 60% of active requests have a thread message |
| First chat response time | < 4h median |
| Dispute rate | < 10% |
| WhatsApp opt-out rate | < 5% |
| Template delivery rate | > 95% |
| Repeat customer rate (90 days) | ≥ 25% |

**Weekly leading indicators:** provider calls, provider activations, requests created, requests published, quotes submitted, quotes accepted, time-to-first-quote.

**Guardrail:** review the quote rate **weekly**, not only at week 8. If fewer than 30% of published requests receive a quote in any week after Week 2, pause feature work and fix supply acquisition.

**Channel falsification tests:** the customer-web/supply-WhatsApp bet is falsified if providers ask for a desktop portal, WhatsApp delivery falls below 80%, magic-link quote completion is below 30%, supply prefers phone calls, or customer request completion is below 20%. Instrument these from day one.

### 12.2 Engineering

| Metric | Target |
|---|---|
| CI fast lane | < 5 min |
| CI full lane | < 20 min |
| Change failure rate | < 15% |
| MTTR | < 1 hour |
| API P95 | < 300ms |
| Quote acceptance | < 500ms |
| Web LCP (4G) | < 2.5s |
| Agent first token | < 2.5s P95 |
| Chat delivery | < 2s P95 |
| SSE reconnect | < 3s P95 |
| Voice upload (10 MB, 4G) | < 15s P95 |
| OTP delivery | < 30s P95 |
| Unhandled errors | < 0.1% |
| Unapproved agent writes | 0 |
| Critical security findings at launch | 0 |

### 12.3 Cost

- Infrastructure **$150–200/month** at MVP volume, including PITR.
- All-in operating cost **$250–350/month**, including WhatsApp, SMS, LLM, and a support buffer.
- LLM + WhatsApp + SMS tracked per request in `usage_events`.
- Cost per signed contract **$60–105 before founder time** at 10 contracts in 90 days. Track from the first contract.
- If the all-in budget cannot be funded, run web-only until revenue; do not skip PITR or legal review.

---

## 13. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Marketplace liquidity** | No quotes → no contracts | Two-week concierge sprint, 100 named providers, 10 written commitments, 20 requests, weekly activation cadence, 30% quote-rate guardrail. |
| **Scope creep** | Miss 18–20 weeks | Scope frozen: full chat + voice in, reviews/projects/PostGIS/supply agent out. Weekly demo; no new features during rewrite. |
| **Chat/SSE performance** | Laggy chat, connection limits | SSE with reconnect/backfill, presence/typing TTL, Postgres indexes, load check at MVP volume; Durable Objects/WebSockets only if measured. |
| **Voice storage/cost** | R2 growth, playback latency | 5 min / 10 MB cap, MIME allowlist, signed playback, retention policy, per-thread storage budget. |
| **WhatsApp/Meta verification delay** | Supply channel late | Start Meta verification + DLT on Day 1; SMS/phone/web fallback; web dashboard always works. |
| **Provider verification deadlock** | No one can quote | Manual SQL/Retool queue from Week 1; 24–48h SLA; 10–20 pre-verified providers before first request. |
| **Workers CPU/memory limits** | Long jobs fail | Keep API requests small; HTML certificate instead of PDF; heavy work to Queues/Containers; measure. |
| **DB latency from Workers** | Slow pages | Supabase Mumbai, Hyperdrive, Smart Placement; measure P95 from India. |
| **Agent safety failure** | Wrong quote/contract/PII leak | Server-enforced tiers, `HUMAN_ONLY` for accept/sign/send, draft-only external messages, 15–20 evals, kill switch. |
| **Contract legal validity** | Disputes | "Electronic acceptance with audit trail", dual OTP, hash chain, HTML certificate, BSA 2023 framing, counsel review; no 65B/eSign claims. |
| **Payment compliance** | RBI issues | No escrow; offline ledger; explicit "we do not hold funds"; reserve fields; licensed PA later. |
| **Privacy/DPDP** | Regulatory risk | Consent records, minimisation, retention schedule, deletion/export, masked contact info, site-visit address release. |
| **LLM cost/latency** | Margin/latency | One pinned model, AI Gateway, token budgets, caching later, evals, fallback after launch. |
| **Cloudflare lock-in** | Migration cost | Pure `packages/core`, standard Postgres/S3, exit ramps, no proprietary state as source of truth. |
| **Key-person risk** | Bus factor | ADRs, specs, tests, runbooks; AI agents can navigate the repo. |
| **React rewrite cost** | Timeline | Timebox; shadcn/reui; no custom design system; reuse domain knowledge, not Svelte code. |
| **Runway** | Project stops | Six-month runway check; if short, add a services/revenue bridge or reduce scope before launch. |

---

## 14. Open decisions

| Decision | Owner | Deadline |
|---|---|---|
| Launch city + three categories, with 100 named providers and 20 requests | Founder | **Before Week 1** |
| All-in monthly budget: $150–200 infra / $250–350 all-in vs a lower web-only plan | Founder | Before Week 1 |
| WhatsApp provider: Meta Cloud API vs MSG91/Interakt, plus fallback | Founder | **Day 1** |
| SMS provider + DLT registration | Founder | Day 1 |
| Legal counsel: contract template, BSA 2023 framing, stamp duty, GST/TCS, DPDP, intermediary posture | Founder | Week 1 |
| Verification owner, documents, 24–48h SLA, suspension policy | Founder | Week 1 |
| Pricing hypothesis: commission, lead fee, customer fee, or free for 90 days | Founder | Week 2 |
| Support and dispute process for the first 90 days | Founder | Week 2 |
| Six months of runway, or a revenue/services bridge | Founder | Week 1 |
| Voice note limits: max duration (5 min), max size (10 MB), MIME allowlist | Founder | Week 6 |
| LLM provider/model and eval harness | Founder | Week 11 |
| Analytics: SQL/Metabase vs PostHog | Founder | Week 12 |
| DPDP Rules commencement and retention confirmation | Founder + counsel | Before launch |

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
- Permission tests cover allowed and denied roles.
- Audit + outbox rows verified.

### Chat and voice

- Message send is idempotent; duplicate and out-of-order events are handled.
- SSE reconnects with `Last-Event-ID` and backfills missed messages.
- Presence and typing expire correctly; no stale indicators.
- Read receipts and unread counts are correct per participant.
- Voice notes upload, authorize, and play only for thread participants.
- Block/mute, tombstone, PII filter, and abuse report work.
- Agent messages are drafts; the human sends.

### Release

- Backups + **PITR restore drill**; RPO ≤15 min, RTO ≤4h.
- Sentry + alerts + uptime checks.
- Legal pages + consent screens + retention schedule.
- Rate limits + Turnstile + webhook signatures.
- Runbook for incident, refund/dispute, and provider verification.
- Business metrics dashboard live.
- 50 verified providers, 20 real requests, 10 written quote commitments.
- Legal counsel sign-off on the contract template and BSA 2023 framing.
- Support channel with a 24h first-response SLA.

---

## 16. Review disposition

The external review at [../../plan-review/external/2026-11-03-agent-review.md](../../plan-review/external/2026-11-03-agent-review.md) was integrated on 2026-11-10. This table records what changed, what was rejected, and where the decision lives.

| Review item | Disposition | Where |
|---|---|---|
| Full 18-week scope is not credible | **Accepted.** Baseline 18 weeks, allowed slip to 20; the full 22–26-week scope is not committed. | §11, §1 |
| Cut full chat, presence, typing, SSE, and voice notes | **Rejected by founder.** Full real-time chat and voice notes stay in MVP. | §3.1, §11, ADR 0008 |
| Cut voice notes specifically | **Rejected.** Voice notes are record/upload/store/play; no transcription. | §3.1, §7.6 |
| PDF certificate | **Accepted.** HTML certificate + SHA-256 + hash chain; PDF deferred. | §3.2, §6.4 |
| Section 65B / “admissible evidence” | **Accepted.** “Electronic acceptance with audit trail”; BSA 2023 s.63 framing; no admissibility or eSign claim. | §9, §13 |
| PITR and cost understatement | **Accepted.** $150–200/month infra, $250–350 all-in, PITR mandatory, RPO/RTO defined. | §9.2, §9.4, §12.3 |
| No acquisition plan | **Accepted.** Two-week concierge sprint before code: 100 named providers, 10 written commitments, 20 requests. | [acquisition-plan.md](acquisition-plan.md) |
| Magic links live 7 days | **Accepted.** 24–72h read tokens; 15-minute single-use mutation tokens. | §8.2 |
| Provider verification is undefined | **Accepted.** Manual queue from Week 1–3, 24–48h SLA, no Aadhaar. | [verification-rubric.md](verification-rubric.md) |
| Exact address hidden until contract | **Changed.** Site visits with consented, audited, time-bound address release. | §3.1, §6.4 |
| Agent has 9 tools and can send chat | **Accepted.** Customer-only, 5 tools; external messages are draft-only; `chat.message.send` is `HUMAN_ONLY`. | §7.3 |
| Reviews, projects, PostGIS, supply agent, custom admin UI | **Accepted as deferred.** Not in MVP. | §3.2, §11.3 |
| WhatsApp inbound buttons / chatbot | **Accepted as deferred.** Outbound utility templates + magic links only. | §8.3 |
| Dispute-resolution UI | **Accepted as deferred.** Admin dispute view is read-only; resolution is manual. | §8.4 |
| MCP server, action versioning, AI Gateway dashboards | **Accepted as deferred.** Build the action catalog seam; ship the platform features later. | §3.2 |
| Load tests, Lighthouse 90, axe, 24h smoke | **Accepted as deferred.** Keep a mobile viewport check and pre-launch performance budgets. | §10.5 |

**Founder override:** full real-time chat, presence, typing, read receipts, SSE, and voice notes are non-negotiable MVP scope. The rest of the review’s cuts are adopted as defaults and can be revisited only with a written scope change.

**Second opinion:** a fresh review prompt tailored to this revision is at [../../plan-review/external-agent-review-prompt-v2.md](../../plan-review/external-agent-review-prompt-v2.md). Use it with a different agent/model; the original prompt is a historical record.

---

## Appendix A — ADR summary

| ADR | Decision |
|---|---|
| **0001** | Clean rewrite; freeze v2; no data migration; reuse domain knowledge only. |
| **0002** | TypeScript modular monolith; Cloudflare edge + Supabase Postgres Mumbai. |
| **0003** | One action catalog with server-enforced risk tiers and `PendingAction` approvals. |
| **0004** | React 19 + React Router v7; retire Svelte; shadcn/reui. |
| **0005** | All roles on web/PWA; experts/suppliers also get WhatsApp + 1-tap signed cards; outbound only in MVP. |
| **0006** | No Kafka, RabbitMQ, Convex, Prometheus/Grafana, Durable Objects, Workflows, or Agents SDK in the MVP. |
| **0007** | **Electronic acceptance with audit trail** (BSA 2023 framing); no escrow; offline UPI ledger; no Aadhaar eSign. |
| **0008** | Full real-time chat with presence, typing, read receipts, SSE, and voice notes is in MVP; no transcription. |
| **0009** | Two-week concierge acquisition sprint before code; 100 named providers, 10 written commitments, 20 requests. |
| **0010** | Site visits with audited address release replace "exact address hidden until contract". |
| **0011** | Manual provider verification queue from Week 1–3 with a 24–48h SLA; no Aadhaar. |
| **0012** | Cost baseline $150–200/month infra; $250–350/month all-in; PITR mandatory. |

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
| **SSE** | Server-Sent Events; a one-way stream from server to client for chat messages, presence, typing, and read receipts. |
| **Presence** | A short-lived online/away/offline state for a chat participant. |
| **Typing indicator** | A short-lived "user is typing" state; not stored as history. |
| **Voice note** | An audio message uploaded to R2, stored as metadata in Postgres, and played inline; no transcription in MVP. |
| **Site visit** | A scheduled visit by a shortlisted provider, with consent-based address release, check-in/out, and audit. |
| **BSA 2023** | Bharatiya Sakshya Adhiniyam, 2023; the electronic-records provision is s.63. |
| **DTO** | Data transfer object; a role-scoped response, never a raw database row. |
| **PostGIS** | Postgres extension for geographic queries; available, but not used for MVP radius matching. |
| **Hyperdrive** | Cloudflare's Postgres connection pooler/accelerator. |
| **DLT** | India's telecom registration for SMS senders/templates. |
| **DPDP** | India's Digital Personal Data Protection Act, 2023. |
