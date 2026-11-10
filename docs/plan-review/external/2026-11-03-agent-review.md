# External Review — Gefifi v3 Plans

> Review date: 2026-11-08 (requested output path uses 2026-11-03).
> Reviewer: independent principal-engineer/product reviewer.
> Scope: Plan A (OpenCode), Plan B (Antigravity), the notes they rely on, and v2 code evidence.
> Constraint honoured: no plan file was modified.

---

## 1. Verdict

- **Plan A (OpenCode): directionally right; executable only with cuts and corrections.** The architecture, action catalog, data model, and delivery docs are the strongest work in either proposal. But the 18-week full-scope promise is not credible, the business launch plan is incomplete, and several data, security, cost, and legal details are wrong or missing.
- **Plan B (Antigravity): not executable as written.** It has useful ideas — measurable DoD, bid secrecy, address-privacy tests, a contract audit log — but it contradicts itself on timeline and architecture, over-scopes the MVP, and lacks the data model and operational controls needed for money and contracts.
- **Overall recommendation: consolidate on Plan A**, with the cuts and corrections in §8. Do not execute either plan as written. Before code, close the liquidity/acquisition plan and the legal/payment decisions.
- **Confidence: high** on document comparison and v2 code evidence; **medium** on vendor limits and pricing; **low** on founder liquidity, supply/demand assumptions, and legal enforceability in specific Indian jurisdictions.

The shortest version: Plan A is a real plan with a scope problem. Plan B is a strong architecture essay with an execution problem. A solo founder should not attempt Plan B, and should not attempt all of Plan A.

---

## 2. What I read

**Repository state**

- Branch `main`, commit `1046825bfe59ebe0bed3d4d68bf04b256d032b24`, dated 2026-11-08, message `docs: add Gefifi v3 plans, rules, and external review prompt`.
- Working tree clean except untracked `skills/` and this review's `docs/plan-review/external/` directory.
- 151 `.ts`, `.svelte`, and `.py` files under `src`, `backend/src`, and `agents` (including 2 test files and 3 config files).
- **0** GitHub Actions workflows.
- **2** trivial frontend test files: `src/frontend/src/demo.spec.ts` (asserts `1 + 2 = 3`) and `src/frontend/src/routes/page.svelte.test.ts` (asserts the landing page renders an `h1`).
- The repository is still v2. There is no v3 monorepo, no v3 schema, and no CI pipeline.

**Plan A — OpenCode**

- `docs/plan/made-by-opencode/README.md`
- `docs/plan/made-by-opencode/rewrite-playbook.md`
- `docs/plan/made-by-opencode/engineering-rules.md`
- `docs/plan/made-by-opencode/permissions-matrix.md`
- `docs/plan/made-by-opencode/AGENTS.md`

**Plan B — Antigravity**

- `docs/plan/made-by-antigravity/architecture/gefifi_v3_strategy.md`
- `docs/plan/made-by-antigravity/architecture/gefifi_v3_master_blueprint.md`
- `docs/plan/made-by-antigravity/architecture/gefifi_v3_permissions_matrix.md`
- `docs/plan/made-by-antigravity/architecture/gefifi_v3_definition_of_done.md`

**Inputs**

- `notes/What does "agent-native" mean, and what is in or out of v3?.md`
- `notes/Who is the primary user and channel?.md`
- `notes/What are the hard constraints?.md`
- `notes/What is the legal or commercial bar for contracts and money?.md`
- `notes/How will we know it works?.md`
- `docs/plan-review/opencode/round-2-review.md` (treated as evidence, not authority)
- `ai_agent_capabilities_tracker.md`

**v2 code evidence**

- `backend/src/interfaces.ts` — quote, contract, request, and material types.
- `backend/src/routes/quotes.ts` — quote acceptance and status transitions.
- `backend/src/routes/contracts-signing.ts` — contract signing.
- `agents/build_assist_agent/tools/quote.py` — duplicated Python HTTP tools.

**Vendor and legal sources checked**

- Supabase regions and pricing.
- Cloudflare Workers, Hyperdrive, Workflows, and Queues limits.
- Cloudflare global network list.
- Better Auth phone-number plugin.
- React Router v7 modes.
- Meta WhatsApp pricing documentation.
- Indian statute position on electronic evidence, with a caveat: India Code and MeitY pages returned HTTP 403, so the statute and DPDP Rules status still need counsel confirmation.

**Not available**

- Production data, real users, revenue, bank balance, or runway.
- The founder's WhatsApp Business account, Meta verification status, DLT registration, or MSG91/Interakt contract.
- Any provider or customer interviews.
- Indian legal advice.

---

## 3. Decision audit

### 3.1 The founder's six answers

| Decision | Plan | Rationale given | Verdict | Evidence |
|---|---|---|---|---|
| Launch a real business | Founder | Optimise for liquidity, trust, and learning, not hypothetical scale | **Keep, but the plan does not operationalise it.** The plan is a build plan, not a launch plan. It explicitly excludes the supply-acquisition plan and unit economics. | `README.md:71` says the goal; `README.md:27` lists "the supply-acquisition plan for the first 50 providers" as an open input; `README.md:63` makes 10 signed contracts the success test. |
| Solo developer + AI agents, 16–20 weeks | Founder | Ruthless scope; no team parallelism | **Change.** 18 weeks is credible only for a cut MVP. Full Plan A scope is 22–26 weeks. If the founder refuses cuts, the timeline must move. | `README.md:7` horizon; `README.md:73` calls it "Realistic"; `README.md:721-734` packs marketplace, contracts, chat, agent, WhatsApp, admin, and launch into 18 weeks. |
| Clean start, no migration | Founder | v2 is a prototype; freeze it | **Keep.** This removes an entire migration project and is one of the best decisions in either plan. | `rewrite-playbook.md:24` (R9: "No data migration. Clean start"). |
| React 19 + React Router v7 | Founder | React agent-UI ecosystem; shadcn/reui are React-first | **Keep.** React Router v7 framework mode is current and lower-risk than TanStack Start for a solo MVP. | `README.md:76`, `README.md:198`; Plan B agrees at `gefifi_v3_strategy.md:104`. |
| All roles on web/PWA; supply also gets WhatsApp alerts + 1-tap signed mobile cards | Founder | Customer needs screen space; supply needs zero-password, low-bandwidth access | **Keep the asymmetry; add a fallback.** WhatsApp is the right bet for supply, but Meta verification, template approval, per-message pricing, and shared phones make it fragile as the only channel. | `README.md:77`, `README.md:61`; `permissions-matrix.md:15-16`; `notes/What is the legal or commercial bar for contracts and money?.md:63`. |
| Cloudflare + Supabase Postgres Mumbai, under $100/month infra | Founder | Managed, low-ops | **Keep the stack; change the cap.** The cap is not true once PITR is enabled, and it conflicts with the notes' $200–$500 total operating cap. Define whether the cap is infra-only or all-in. | `README.md:79`, `README.md:555-571`; `README.md:589` says "PITR (enable when live)"; `notes/What are the hard constraints?.md:7` says $200–$500 total operating cap. |

### 3.2 Plan A's twelve positions

| # | Position | Verdict | Evidence and reasoning |
|---|---|---|---|
| 1 | Clean rewrite; v2 frozen; no migration | **Keep** | `rewrite-playbook.md:24`; the repo has no production data and only two trivial frontend tests, so preserving v2 behaviour is a reference exercise, not a migration. |
| 2 | TypeScript modular monolith: Hono API + React 19/React Router v7 PWA + Postgres | **Keep** | `README.md:59`, `README.md:198`. A solo founder does not need Go, Rust, NestJS, Encore, Kafka, or microservices. TypeScript gives one language across web, API, agent tools, and schema. |
| 3 | Cloudflare + Supabase Mumbai; Workers, R2, Queues, Cron, Hyperdrive, AI Gateway; no Kafka/RabbitMQ/Convex/Kubernetes/microservices | **Keep, with a benchmark and exit ramp** | `README.md:198-209`, `README.md:538-600`. The primitives are appropriate. The risk is not the choice; it is the unverified latency and the cost add-ons. |
| 4 | One action catalog powering UI, agent, and later MCP; four server-enforced risk tiers | **Keep the abstraction; cut the platform work** | `README.md:422-439`, `permissions-matrix.md:315-316`. This is the right core abstraction because it prevents UI/agent/server permission drift. But MCP, action versioning, generated tool registries, and a rate-limit framework are post-MVP. |
| 5 | Customer agent in MVP; experts/suppliers use WhatsApp templates + 1-tap signed mobile cards, not a chatbot | **Keep** | `README.md:101`, `README.md:442`. Supply users are low-bandwidth, trust-sensitive, and often on shared phones. A supply chatbot adds onboarding, language, and liability before the marketplace has liquidity. |
| 6 | Postgres is the single source of truth for business state, chat, agent state, approvals, audit, and outbox | **Keep** | `README.md:57`. This is the correct corrective to v2's Firestore plus Python agent duplication. Do not let Plan B's Agent DO SQLite or Chat DO state become a second source of truth. |
| 7 | Chat via Postgres + SSE/polling; no Durable Objects, Workflows, or Agents SDK in MVP | **Keep** | `README.md:81`, `README.md:226`. At MVP volume, chat is a low-concurrency 1:1 thread per request × provider. Polling is enough; SSE is a nice-to-have. Durable Objects solve a scale problem the product does not yet have. |
| 8 | Contracts are a "Digital Agreement with Audit Trail": immutable versions, SHA-256 terms hash, dual OTP signatures, hash-chained events, PDF certificate; not Aadhaar eSign | **Keep the mechanism; change the legal claims** | `README.md:82`, `README.md:705`; `engineering-rules.md:334`. The mechanism is sound evidence of assent and integrity. The claim that it is "Section 65B evidence" is outdated, and no platform can guarantee admissibility. |
| 9 | Payments are an offline UPI ledger; no escrow or fund custody | **Keep, with a stricter evidence model** | `README.md:83`, `README.md:300`, `README.md:706`. This avoids RBI payment-aggregator licensing at MVP. But the plan must say clearly that Gefifi does not hold, route, or guarantee funds, and it must record payer, payee, UTR/reference, amount, timestamp, milestone, and both-party confirmation. |
| 10 | 18 weeks: 16 build + 2 buffer; explicit cut list if behind | **Change** | `README.md:7`, `README.md:721-734`; `rewrite-playbook.md:418-430`. The cut list is good but comes too late: it is triggered "when behind schedule", after the plan has already overcommitted. Cut before starting, not after slipping. |
| 11 | Business success: 10 signed contracts in 90 days, one city, three categories; guardrail: <30% of published requests receive a quote after 8 weeks → pause feature work and fix supply | **Keep the metric; add leading indicators and an acquisition plan** | `README.md:63`, `README.md:778`, `README.md:788`. The guardrail is lagging: after 8 weeks of no quotes, the launch is already dead. Track provider activation, time-to-first-quote, and request-to-quote rate weekly. |
| 12 | Execution docs: build plan, rewrite playbook, engineering rules, permissions matrix, AGENTS.md | **Keep; fix contradictions** | `README.md:20-21`. The docs are a genuine asset. But `AGENTS.md` is an operating contract, not evidence of product correctness; it must not override the plan when they disagree. The module-boundary, milestone-payment, address, and dispute contradictions need one owner and one source of truth. |

---

## 4. Top findings

Ordered by what is most likely to kill the launch. Severity is about the project, not about how hard the fix is.

| ID | Severity | Category | Plan | Evidence | Finding | Recommendation |
|---|---|---|---|---|---|---|
| **F1** | **Blocker** | Business / liquidity | A and B | `README.md:27` explicitly lists "the supply-acquisition plan for the first 50 providers" as an **open input**; `README.md:63` makes 10 signed contracts the success test; `README.md:745` requires 50 verified providers; `README.md:788` admits the supply guardrail only fires after 8 weeks; `README.md:819` reduces acquisition to "seed 50 providers, WhatsApp outreach". Plan B asserts "supply-side liquidity" at `gefifi_v3_master_blueprint.md:315` but has no acquisition script either. | **There is no demand or supply acquisition plan.** The plans specify how to build the marketplace, not how to make either side show up. The first 50 providers, the first 20 requests, the first 10 contracts, the city/category choice, the outreach script, the incentives, and the weekly operating cadence are all missing. A two-sided marketplace with no liquidity is a CRUD app with a contract PDF. | Spend the first two weeks before code on concierge acquisition: pick one city and three categories; build a list of 100 named providers; call 25; get 10 written "I will quote within 24h" commitments; get 20 customer requests from your network, hardware stores, societies, or architects. Track provider activation and time-to-first-quote weekly. Do not start the rewrite until this list exists. |
| **F2** | **Blocker** | Delivery / scope | A | `README.md:73` calls 18 weeks "Realistic"; `README.md:721-734` packs projects, requests, items, R2, PostGIS, invites, quotes with line items, acceptance transaction, notifications, contracts, dual OTP, hash chain, PDF, milestones, payments, DPDP, chat, voice notes, agent, WhatsApp, admin, reviews, security, load tests, Lighthouse, UAT, and launch into 18 weeks; `README.md:729` gives Week 4–7 nine major deliverables; `README.md:732-733` leaves agent, WhatsApp, admin, and hardening to the last six weeks. | **The full Plan A scope is 22–26 weeks, not 18.** The plan is not lying about effort; it is lying about parallelism. One developer plus agents cannot build nine independent marketplace primitives in four weeks while also writing integration tests against real Postgres. Week 4–7 is the first slip; Week 13–15 is the second. The 2-week buffer cannot absorb either. | Cut before starting, not after slipping. Target a 14–16 week MVP: no reviews, no voice notes, no PDF certificate, no custom admin UI, no full chat (threaded comments + WhatsApp), no material tax/HSN, no projects, no PostGIS (city/pincode matching), no supply agent, 5 agent tools. If the founder refuses these cuts, commit to 22–26 weeks and say so. |
| **F3** | **Blocker (for Plan B)** | Plan quality / contradictions | B | `gefifi_v3_strategy.md:104` says "solo 12-week MVP"; `notes/What are the hard constraints?.md:6` says 16–20 weeks; `gefifi_v3_master_blueprint.md:315` says "with the artificial deadline removed"; the Gantt at `gefifi_v3_master_blueprint.md:322-327` sums to 119 days (about 17 weeks); `gefifi_v3_master_blueprint.md:322-323` marks M0 `done` and M1 `active` even though the repository is still v2 with zero CI workflows; `gefifi_v3_strategy.md:161` and `gefifi_v3_master_blueprint.md:337` describe three apps, while `gefifi_v3_master_blueprint.md:358-359` adds `apps/whatsapp` and `apps/mobile-cards`; `gefifi_v3_strategy.md:119-137` makes Durable Objects, Agents SDK, Workflows, and Queues core, while `gefifi_v3_strategy.md:150` claims Postgres is the truth and `gefifi_v3_master_blueprint.md:211` stores agent state in `pending_actions`; the data model at `gefifi_v3_master_blueprint.md:199` uses `numeric(12,2)` for quotes, has no quote line items, no contract versions, no signature rows, and no general audit/outbox/idempotency/consent/dispute tables (only `contract_audit_logs`). | **Plan B is not executable as written.** It disagrees with itself on timeline, app count, and source of truth, and its milestone status is false relative to the repository. Its "12-week" claim is a strategy phrase; its own Gantt is 17 weeks; the notes say 16–20. The data model is not sufficient for money, contracts, or audit. | Do not execute Plan B. Salvage four things from it: the measurable DoD style, the bid-secrecy and address-privacy tests, the `contract_audit_logs` idea (device/IP/OTP timestamp), and the explicit exit-ramp document. Fold them into Plan A. |
| **F4** | **High** | Product / privacy | A and B | Plan A: `permissions-matrix.md:198` shows exact address only as "Approximate area only" before contract, "Full" after; `engineering-rules.md:199` says exact addresses are masked "until the counterparty is entitled to them (e.g., contract signed)"; there is **no site-visit action, table, or state** anywhere in Plan A. Plan B: `gefifi_v3_permissions_matrix.md:36` says exact address is `BLIND` during open bidding and unlocked only after contract signed; no site-visit flow either. | **The privacy rule blocks the core work flow.** A plumber cannot quote accurately for a bathroom without seeing the site, measuring, or checking access. A supplier may need delivery access. If the exact address is hidden until after the contract, providers will either quote blind (bad prices, disputes) or move the address exchange to WhatsApp/phone (defeating the privacy model and the audit trail). | Add a `site_visits` table and action: request, provider, scheduled time, status, address-release timestamp, check-in/check-out, notes/photos. Allow the customer to release the exact address to a shortlisted provider after explicit consent/NDA, before the contract, with an audit row. For MVP, approximate location + photos + a video call may be enough; the site visit is the fallback for work requests. Make this explicit in the permissions matrix. |
| **F5** | **High** | Delivery / trust | A | `permissions-matrix.md:109` requires `quote.submit` to be from a "verified provider"; `permissions-matrix.md:159-160` puts provider verification behind `admin.provider.verify/reject`; `README.md:733` schedules the admin verification queue for Week 16–17; `README.md:729` expects "request → 3 quotes → accept → contract draft" by Week 7. The cut list says custom admin UI can be replaced by SQL/Retool (`rewrite-playbook.md:421`), but it does not schedule the verification work. | **The verification gate and the admin UI are in the wrong order.** No provider can quote until an admin verifies them, but the admin verification UI arrives in Week 16–17. The Week 7 exit criteria cannot be met unless verification is done manually in SQL, which the plan does not assign. This is a classic dependency deadlock: the marketplace core is "done" only after the last phase. | Move a minimal verification queue to Week 2–3, or run verification manually in SQL/Retool from Week 1 with a written SLA (documents, 24–48h, reason codes). Seed 10–20 pre-verified providers before the first request. Alternatively, allow provisional quoting with an "unverified" badge and block contract signing until verified. Do not leave verification to Week 16. |
| **F6** | **High** | Legal / compliance | A and B | Plan A: `README.md:705` says "Section 65B evidence language"; `README.md:825` says "65B language"; Plan B: `gefifi_v3_definition_of_done.md:112` says "Digital Agreement with Verified Audit Trail under Section 65B of Indian Evidence Act"; notes: `notes/What is the legal or commercial bar for contracts and money?.md:25` and `:71` repeat Section 65B. | **Section 65B is the wrong statute.** The Indian Evidence Act, 1872 was repealed and replaced by the Bharatiya Sakshya Adhiniyam, 2023 (effective 1 July 2024); the electronic-records provision is now s.63. More importantly, a hash + OTP + PDF is evidence of assent and integrity, not a statutory "electronic signature" under IT Act ss.3/3A, and no platform can guarantee that a court will admit it. "Admissible electronic evidence" is a legal conclusion, not a product feature. Plan A correctly disclaims Aadhaar eSign; the remaining error is the 65B/admissibility framing, not an explicit eSign claim. | Remove "Section 65B", "admissible", "legally binding e-signature", and any eSign implication. Label it "electronic acceptance with audit trail". Keep versions, SHA-256 terms hash, OTP challenge records, IP/device/timestamps, hash-chained events, and PDF certificate. Get Indian counsel to review the contract template, stamp duty, IT Act/BSA language, GST/TCS, and intermediary safe harbour before launch. For high-value contracts, integrate a licensed Aadhaar eSign ASP later. Also remove Aadhaar from Plan B's verification docs (`gefifi_v3_permissions_matrix.md:90`); use GSTIN, trade licence, phone, bank account, and references. |
| **F7** | **High** | Cost / operations | A | `README.md:555-571` totals **$50–120/month** while `README.md:79` says the infra cap is **under $100/month** and variable LLM/WhatsApp/SMS are "tracked separately"; `README.md:589` says "PITR (enable when live)"; Supabase's current pricing lists PITR at **$100/month per 7 days of retention**; `notes/What are the hard constraints?.md:7` says **$200–$500/month total operating cap**. | **The cost cap is not true once the database is production-grade.** Supabase Pro is about $25/month; PITR adds $100/month before any Worker usage, R2, Sentry, WhatsApp, SMS, or LLM. That is already ~$125/month for infra alone, and the plan's own table reaches $120 even without PITR. The notes and the plan also use different definitions of "cap": infra-only vs total operating. At MVP volume the absolute cost is small, but the founder will make launch decisions on a false number. | Re-baseline to **$150–200/month infra** with PITR, or **$250–350/month total operating** including WhatsApp/SMS/LLM. Decide whether PITR is mandatory at launch; for a product holding contracts and payment evidence, it probably is. Track cost per signed contract from day one. If the founder cannot fund $250/month, cut WhatsApp/SMS and run web-only until revenue. |
| **F8** | **High** | Data model / correctness | A | Plan A is much stronger than Plan B, but it still has specific holes: no `otp_challenges` table, although `engineering-rules.md:229` requires OTP to be single-use, bound to user + version + purpose, and expiring in 10 minutes, and `README.md:296` only stores an "OTP reference" in `contract_signatures`; no `webhook_events` table, although `permissions-matrix.md:187` and `:376` require webhook replay dedupe; no `whatsapp_contacts`/marketing opt-in table, although `permissions-matrix.md:210` lists "WhatsApp opt-in"; `README.md:282` puts `address` on `requests` while `README.md:272` says addresses are "never on the public request row" and `engineering-rules.md:142` says the opposite of line 282; `README.md:253` chooses `bigint` paise but never defines JSON serialization; `README.md:287` has `tax/HSN` on line items but no tax rate, taxable amount, CGST/SGST/IGST split, or rounding rule; `README.md:381` says the provider marks `paid`, while `permissions-matrix.md:137` and `:264-265` say the customer marks `paid` and the provider confirms receipt; `README.md:301` says disputes are "admin-read-only in MVP", while `permissions-matrix.md:165` includes `admin.dispute.resolve`. | **The schema is good enough to start but not good enough to ship.** The missing OTP challenge, webhook dedupe, and WhatsApp opt-in tables are exactly the records you need when a signature, a replay, or a STOP is disputed. The address and milestone contradictions will produce two different implementations. The `bigint` choice will break JSON unless serialized deliberately. The tax line is a label, not a calculation. The quote-acceptance concurrency control is actually well specified (`README.md:353-362`); keep it. | Add `otp_challenges` (purpose, user, entity, version, code_hash, expires_at, attempts, consumed_at), `webhook_events` (provider, external_id, payload_hash, signature_verified, processed_at), and `whatsapp_contacts` (user, phone, marketing_opt_in_at, utility_opt_in_at, stop_at). Remove `requests.address`; use `address_id`. Define money DTOs as strings (or Drizzle bigint mode with a serializer) and test them. Define GST rules: rate, inclusive/exclusive, per-line vs total rounding, HSN. Fix the milestone ownership to one model: customer records payment, provider confirms receipt. Decide whether admin dispute resolution is in MVP; if not, remove `admin.dispute.resolve`. |
| **F9** | **High** | Agent safety | A | `README.md:422` classifies `chat.sendMessage` as `SAFE_WRITE`; `README.md:439` says it is "labelled 'via Gefifi Assistant'"; `permissions-matrix.md:148` gives the Agent a `✓` on `chat.message.send` with only a "content filter"; `README.md:101` says the agent can "send chat messages". `engineering-rules.md:274` says prompt injection is "data, not instructions", but there is no provenance model, no URL/phone allowlist, no external-message approval, and no kill switch beyond budget caps. | **The agent can send external messages without human approval.** In a construction marketplace, a wrong message can commit to a price, promise a date, share a phone number, or harass a counterparty. Labelling the message "via assistant" does not protect the customer or the platform. Prompt injection through a PDF, photo, or chat message could turn the agent into a channel for scam links or PII. The risk tiers protect `quote.accept` and `contract.sign`, but not the most socially dangerous action: talking to the other side. `HUMAN_ONLY` enforcement itself is correctly server-side (`permissions-matrix.md:315`); the gap is that external chat is not in that tier. | In MVP, the agent may **draft** external messages, not send them. The human taps send. If the founder insists on direct send, make it `NEEDS_APPROVAL` with a preview card and a content filter for phone numbers, links, prices, and commitments. Keep internal notes/summaries as `SAFE_WRITE`. Add a per-thread kill switch, message provenance, and an eval for "agent tries to send a phone number or a discount". |
| **F10** | **Medium** | Channel / security | A and B | `permissions-matrix.md:332` gives magic links a 7-day read lifetime; `:333` requires a fresh single-use token for mutations; `:337` deduplicates WhatsApp webhooks by message ID. There is no `noindex`, no phone binding, no one-active-token rule, and no step-up OTP before a quote submission or signature. Plan B's mobile cards use HMAC-signed URLs (`gefifi_v3_master_blueprint.md:359`) with no TTL or revocation model. `notes/What is the legal or commercial bar for contracts and money?.md:63` classifies lead notifications as **marketing**, which requires opt-in; Plan A has no marketing opt-in table. Meta's current pricing charges per template message and charges service messages after 1,000 free per month; utility templates are not "zero cost". | **The supply channel is viable but fragile.** A 7-day read link forwarded on WhatsApp exposes request, quote, and chat data to anyone who receives it; shared phones are common. Marketing lead alerts without opt-in risk template rejection and Meta policy action. If Meta verification or template approval slips, the supply side has no channel. | Shorten read links to 24–72h, bind them to the phone + request, allow one active token per user/purpose, revoke on use or role change, add `noindex` and `Referrer-Policy`. Mutations: 15-minute single-use token + step-up OTP. Add a `whatsapp_contacts` opt-in table with marketing/utility purpose and STOP timestamp. Start Meta Business verification and DLT registration on Day 1, not Week 13. Keep a fallback: SMS with DLT header/template, a phone call from the founder, and a web provider portal. |

---

## 5. Side-by-side comparison

### 5.1 Where the plans disagree

| Disagreement | Plan A | Plan B | Recommendation |
|---|---|---|---|
| **Timeline** | 18 weeks (16 build + 2 buffer), `README.md:7` | 12 weeks in strategy (`gefifi_v3_strategy.md:104`), 17-week Gantt (`gefifi_v3_master_blueprint.md:322-327`), 16–20 in notes (`notes/What are the hard constraints?.md:6`) | **Neither.** 14–16 week cut MVP; 22–26 weeks for full Plan A scope. |
| **Chat transport** | Postgres + SSE/polling (`README.md:81`) | Durable Objects + WebSockets (`gefifi_v3_strategy.md:119-136`) | **Plan A.** Polling first; DOs only when concurrency is measured. |
| **Agent runtime/state** | Vercel AI SDK + Postgres state (`README.md:208`) | Agents SDK + Agent DO SQLite (`gefifi_v3_strategy.md:103`, `:136`) | **Plan A.** One source of truth; no second state store. |
| **Async/long-running work** | Outbox + Queues + Cron (`README.md:207`) | Workflows + Queues (`gefifi_v3_strategy.md:99`) | **Plan A for MVP.** Add Workflows only for multi-day retries that Cron/outbox cannot handle. |
| **Agent scope** | Customer-only (`README.md:101`, `:442`) | Customer + supply, 9 tools (`gefifi_v3_master_blueprint.md:253-254`) | **Plan A.** Supply gets alerts/cards first; agent later. |
| **Money type** | integer paise `bigint` (`README.md:253`) | `numeric(12,2)` (`gefifi_v3_master_blueprint.md:199`) | **Plan A.** Paise + deliberate string serialization. |
| **Contract evidence** | versions + signatures + hash-chained events (`README.md:82`, `:295-297`) | signed timestamps + one `contract_hash` + `contract_audit_logs` (`gefifi_v3_master_blueprint.md:202-204`) | **Plan A**, plus Plan B's device/IP/OTP timestamp fields. |
| **Quote acceptance risk** | `HUMAN_ONLY` (`README.md:424`) | `NEEDS_APPROVAL` (`gefifi_v3_master_blueprint.md:123`) | **Plan A.** A commitment to hire must be human-only, not agent-approved. |
| **Data-model breadth** | Broad: line items, versions, events, audit/outbox/idempotency (`README.md:280-323`) | Thin: no line items, no versions, no general audit/outbox/idempotency/consent/dispute (`gefifi_v3_master_blueprint.md:185-212`) | **Plan A**, with the F8 fixes. |
| **Deployable apps** | 2 (`apps/web`, `apps/api`) (`README.md:603-605`) | 3–5 (`web`, `api`, `agent`, `whatsapp`, `mobile-cards`) (`gefifi_v3_master_blueprint.md:337`, `:358-359`) | **Plan A.** Fewer deployables, fewer failure modes. |
| **Verification timing** | Admin UI Week 16–17 (`README.md:733`) | Admin in M6 (`gefifi_v3_master_blueprint.md:371`) | **Both wrong.** Move a minimal verification queue to Week 2–3. |
| **Frontend** | React Router v7 only (`README.md:198`) | React Router v7 or TanStack Start (`gefifi_v3_strategy.md:104`) | **Plan A.** RRv7 is lower-risk for a solo MVP. |
| **Cost cap** | <$100/month, PITR deferred (`README.md:79`, `:589`) | No cost table or budget | **Neither.** $150–200 infra / $250–350 total, or web-only until revenue. |

### 5.2 Where they agree but are both wrong

- **The timeline is a deadline, not an estimate.** A says 18 weeks; B says 12, 17, or 16–20 depending on the file. Both ignore the liquidity work, legal review, Meta verification, and the first-10-days setup.
- **WhatsApp is treated as a channel, not an operations programme.** Both assume Meta verification, template approval, opt-in, pricing, and delivery will work. Neither schedules a fallback.
- **Exact address is masked until contract, with no site visit.** Both plans make the core work flow impossible or push it off-platform.
- **"Section 65B evidence" is repeated as if it were current law.** Plan A correctly disclaims Aadhaar eSign, but both still use the wrong evidence statute and overclaim admissibility.
- **Verification is a document upload, not a process.** Neither defines who reviews, how fast, what fraud looks like, or what happens on suspension.
- **The agent can send external messages.** Plan A marks `chat.sendMessage` `SAFE_WRITE`; Plan B does the same. Both label the message instead of requiring human approval.
- **Magic links are long-lived.** Plan A uses 7 days; Plan B uses HMAC-signed URLs with no TTL. Both are forwardable and shared-phone-hostile.
- **No acquisition, pricing, support, or unit economics.** Both are engineering plans for a business that has not been sold.
- **No OTP challenge, webhook dedupe, or WhatsApp opt-in table.** Plan A has the policy but not the schema; Plan B has neither.
- **Reviews are treated as an MVP feature.** Plan A defers them in the cut list but includes the table; Plan B includes reviews in the ERD. Neither has moderation or fraud handling.

### 5.3 What is over-engineered

**Plan A over-engineers:** the action catalog's platform features (MCP, versioning, generated registry, rate-limit framework), 9 agent tools, PDF certificate, full chat with voice notes, reviews, PostGIS radius matching, a custom admin UI, and 50+ eval conversations before launch.

**Plan B over-engineers:** Durable Objects for chat, Agents SDK for agent state, Workflows for reminders, five deployable apps, a supply agent, voice notes, mobile cards, advanced contracts, Aadhaar verification docs, and DoD gates like "100% jailbreak rejection on 10 attacks" and "CI <3 minutes" that are not meaningful or achievable.

### 5.4 Side-by-side by dimension

| Dimension | Plan A (OpenCode) | Plan B (Antigravity) | Recommendation |
|---|---|---|---|
| **Product / business** | Narrow wedge: one city, three categories, 10 contracts in 90 days, customer web + supply WhatsApp. Explicit success metrics and a supply guardrail. But no acquisition plan, pricing, support, refunds, or unit economics; the plan itself calls acquisition an open input (`README.md:27`). | Broad platform: customer and supply agents, voice notes, mobile cards, admin, advanced contracts, realtime chat. No launch wedge, no 10-contract metric, and no acquisition plan. Claims "supply-side liquidity" priority but does not operationalise it (`gefifi_v3_master_blueprint.md:315`). | **Plan A's wedge, with a real acquisition plan and a pricing hypothesis.** Plan B's breadth is post-liquidity, not MVP. |
| **Architecture** | Hono modular monolith on Workers, Supabase Mumbai + Hyperdrive, R2, Queues, Cron, AI SDK + Postgres state. No DO/Workflows/Agents SDK/Kafka/Convex/K8s. Clear exit ramps. | Same core plus Durable Objects for chat, Agents SDK for agent state, Workflows for long-running processes, Queues for async. Claims Postgres truth but stores agent state in DO SQLite and chat state in DOs (`gefifi_v3_strategy.md:119-137`, `:150`; `gefifi_v3_master_blueprint.md:211`). Three apps become five (`gefifi_v3_master_blueprint.md:337`, `:358-359`). | **Plan A.** Boring primitives are a feature at MVP. Add Plan B's explicit exit-ramp document, but do not add its proprietary state. |
| **Data model** | Broad and mostly correct: users/roles, addresses, requests/items, quotes/line items, contracts/versions/signatures/events, milestones/payments, disputes, reviews, chat, agent, audit/outbox/idempotency, consent, magic links. Gaps: OTP challenges, webhook dedupe, WhatsApp opt-in, address column, money serialization, tax calculation, milestone ownership, dispute scope. | Too thin for money and contracts: `numeric(12,2)` quotes (`gefifi_v3_master_blueprint.md:199`), no quote line items, no contract versions, no signature rows, no hash chain per event, no audit/outbox/idempotency/consent/dispute tables. Returns raw quote rows after a policy check (`gefifi_v3_permissions_matrix.md:112-140`). | **Plan A, with F8 fixes.** Borrow Plan B's `contract_audit_logs` fields (device/IP/OTP timestamp), not its money types or missing tables. |
| **Security / permissions** | Strong: action-level matrix, field masking, step-up, CSRF/CORS, rate limits, webhook signatures, prompt-injection stance, magic-link scoping, STOP handling. Gaps: agent can send external chat, 7-day read links, missing opt-in table, no webhook event table. | Strong on bid secrecy and address privacy, with explicit policy checks and tests (`gefifi_v3_permissions_matrix.md:6`, `:36`, `:169-170`). Weak on the rest: no rate limits, CSRF/CORS, upload policy, magic-link TTL, prompt-injection handling, DPDP consent, retention, or deletion. Collects Aadhaar (`:90`). | **Plan A's enforcement model + Plan B's explicit bid-secrecy/address tests.** Do not collect Aadhaar. |
| **Agent** | Customer-only, 4 risk tiers, immutable `PendingAction`, 9 tools, AI SDK + Postgres state, eval gates. The safety model is the best part, and the field visibility table already hides competing quotes from the agent (`permissions-matrix.md:202`). But `chat.sendMessage` is `SAFE_WRITE` (`README.md:422`, `:439`), so the agent can talk to counterparties without approval. | Customer **and** supply agents: 4 customer + 3 supply + 2 utility tools (`gefifi_v3_master_blueprint.md:253-254`). Supply agent submits quotes via `NEEDS_APPROVAL`; supply users are on WhatsApp/mobile cards, where approval cards and onboarding are harder. `chat.sendMessage` is also `SAFE_WRITE` (`:122`). | **Plan A's customer-only boundary.** Add draft-only external messages. Revisit supply agent after 50 providers and 100 quotes. |
| **Delivery** | Vertical slices, parity checklist, weekly cadence, explicit cut list, CI/testing strategy. But 18 weeks for full scope is not credible; Week 4–7 is overloaded; verification/admin UI is late; CI targets are optimistic. | Milestones with measurable exit criteria and a DoD, but timeline contradicts itself (12 vs 17 vs 16–20 weeks), milestone status is false, no cut list, no weekly cadence, no parity checklist, no migration/rollback story. | **Plan A's delivery method, cut to 14–16 weeks.** Add Plan B's measurable DoD style, but make the gates achievable and vendor-independent. |
| **Cost** | $50–120 table, under $100 cap, PITR deferred, variable costs "outside cap". PITR alone is $100/month; the cap is false. | No cost table, no budget, no unit economics. More infrastructure (DO, Workflows, Agents SDK, five apps) with no cost model. | **Plan A, re-baselined to $150–200 infra / $250–350 total.** Plan B cannot be costed as written. |
| **Ops** | Sentry, structured logs, uptime checks, backups, restore drill, runbooks, alerts, SLOs. Missing RPO/RTO, support SLA, on-call, retention schedule, DR ownership. | Sentry, CI, SLO/DoD, 24h smoke test. Missing backups, restore drill, runbooks, on-call, retention, DR, support. | **Plan A, plus explicit RPO/RTO and a one-person support SLA.** |

---

## 6. What both plans miss

Each item below changes a decision or an execution step; this is not a generic checklist.

- **Demand acquisition.** Neither plan says where the first 20 customer requests come from. Add a channel plan: founder network, hardware stores, societies, architects, local Facebook/WhatsApp groups, Google Business Profile, and one paid experiment with a hard budget. Track request creation by source.
- **Supply activation beyond a headcount.** "50 verified providers" is a target, not a plan. Add a named list, call script, onboarding incentive, quote-within-24h commitment, and weekly activation rate. A verified provider who never quotes is a vanity metric.
- **Pricing, take rate, and unit economics.** Plan A says "know the cost per signed contract before charging a commission" (`README.md:811`) and has a `plans`/`user_plans` seam with no billing (`README.md:315`). Decide the hypothesis now: provider commission (5–10%), supplier lead fee, customer convenience fee, or free for 90 days. Model revenue per contract, CAC, support cost, and payment/WhatsApp cost. Without this, "launch a real business" is a slogan.
- **Verification specifics.** Neither plan defines what documents are required, who reviews them, how long it takes, how fraud is detected, or what happens when a provider is suspended mid-contract. Plan A has `provider_documents` and a status machine; Plan B suggests Aadhaar. Add a verification rubric: GSTIN, trade licence, phone, bank account, portfolio, references, site visit; no Aadhaar unless legally required; 24–48h SLA; reason codes; re-verification.
- **Site visits and inspections.** Both plans mask the exact address until contract and neither has a site-visit flow. Add scheduling, address release with consent, check-in/out, notes/photos, and a no-show policy. For MVP, approximate location + photos + video call may be enough for suppliers; work requests need a visit before a firm quote.
- **Support, disputes, refunds, and on-call.** Plan A has a disputes table but calls admin "read-only" in MVP (`README.md:301`) while the matrix includes `admin.dispute.resolve` (`permissions-matrix.md:165`). Decide: either disputes are out of MVP (remove the action) or they are in (add a queue, SLA, and resolution playbook). Add a WhatsApp support number, 24h first response, escalation, and a refund policy that is honest about offline payments: Gefifi does not hold funds, so it can mediate but not refund.
- **Legal entity, GST/TCS, invoicing, stamp duty, insurance, and intermediary safe harbour.** A marketplace that introduces customers to contractors and records contracts has GST/TCS, invoicing, and liability questions even if it never touches money. Add a CA/lawyer checklist before launch: entity, GST registration, TCS applicability, commission invoicing, stamp duty on contracts (state-specific), professional indemnity, IT Rules 2021 intermediary posture, and terms that do not promise verification guarantees.
- **Analytics event taxonomy.** Plan A says create it in Week 1 (`README.md:29`) but does not define it. Add a minimal event schema: `request_created`, `request_published`, `provider_invited`, `provider_viewed`, `quote_submitted`, `quote_accepted`, `contract_signed`, `milestone_paid`, `dispute_opened`, `provider_verified`, `whatsapp_opt_in`, `whatsapp_stop`; properties; no PII; one dashboard.
- **Local language and low-literacy UX.** Plan A has a `language` preference (`README.md:269`) but no localization plan. Supply users may prefer Marathi/Hindi; voice notes are deferred to post-MVP. Add Hindi/Marathi UI copy for the supply card, WhatsApp templates, and error states; test with 5 real providers.
- **Review fraud and rating manipulation.** Reviews are deferred, which is correct, but when added they need verified-contract-only reviews, no editing, moderation, and a policy for retaliatory reviews. Do not let reviews become a launch dependency.
- **Magic-link forwarding and shared phones.** Both plans assume a supply user has a personal smartphone. In reality, phones are shared, numbers change, and WhatsApp links are forwarded. Add device/phone binding, short TTLs, one active token, revocation, `noindex`, and a "this link was used on another device" warning.
- **EXIF/location leakage and upload safety.** Site photos often contain GPS coordinates; PDFs and DWGs can contain malware or huge payloads. Add EXIF stripping, MIME/content validation, pre-signed URL constraints, virus scanning (or a no-executable policy), and a retention rule for verification documents.
- **Retention, deletion, export, and breach response.** Plan A has `consent_records` and `user.requestDeletion`, but no per-table retention schedule. Add: contracts and audit 8 years (tax/legal), chat 2 years, verification docs 1 year after offboarding, analytics 24 months, backups 30 days; deletion exceptions for legal retention; export format; breach notification owner and timeline. Confirm DPDP Rules status with counsel.
- **DR, RPO/RTO, and rollback.** Plan A says daily backups + PITR and a quarterly restore drill, but no RPO/RTO. Add RPO ≤15 minutes, RTO ≤4 hours, a restore runbook, a tested rollback for Worker deploys and migrations, and an incident communication template.
- **Admin/support access and impersonation.** Plan A has `admin.impersonate` with consent + banner + time limit (`permissions-matrix.md:167`), which is good, but no support tooling for reading a disputed thread. Add a break-glass procedure, reason codes, and audit review. Do not let support browse private chats without a dispute.
- **WhatsApp template and Meta policy operations.** Meta verification, template approval, per-message pricing, opt-in, STOP, and quality rating are operational processes, not code. Assign an owner, start on Day 1, and track approval status as a launch gate. If the template is rejected, the supply channel is not live.
- **Provider quality and re-quoting.** Neither plan defines what happens when a provider quotes badly, no-shows, or asks for a price change after the contract. Add a simple quality signal (response rate, quote-to-contract rate, disputes) and a re-quote/revision policy.
- **Parity checklist gaps.** Plan A's request state machine drops v2's material-specific `quoting`/`ordered` states (`backend/src/interfaces.ts:125`) and its quote state machine drops `revised` as a state (`backend/src/interfaces.ts:280`), while v2 uses both. It also loses v2's quote-message integration (`backend/src/interfaces.ts:179`, `backend/src/routes/quotes.ts:449-493`) and contract signature comments/attachments (`backend/src/routes/contracts-signing.ts:73-137`). Add these to the parity checklist or explicitly declare them out of scope; otherwise the rewrite will silently regress material and negotiation behaviour.
- **CI/testing realism.** Plan A targets fast CI <5 minutes and full CI <10–12 minutes (`README.md:647`) with Postgres integration tests, Playwright, agent evals, security tests, and a preview deploy. That is unlikely on day one. Split into a PR fast lane (typecheck, lint, unit, action contract) and a nightly full lane (Postgres integration, Playwright, live-model evals). Do not block every PR on the full matrix.
- **Scale breakpoints.** At 10× (roughly 100 requests/week), the first bottlenecks are WhatsApp template quality/cost and founder support, not compute. At 100×, Postgres connections/Hyperdrive, chat polling, and notification fan-out break first. At 1,000×, quote/contract write contention, audit volume, support, and read replicas matter. Do not build DO/Workflows for 1,000× today; write the breakpoints down and revisit when the metrics hit.
- **Cost per signed contract.** At 10 contracts in 90 days, infra at $150–200/month plus WhatsApp/SMS/LLM at $50–150/month is roughly **$600–1,050 over 90 days, or $60–105 per signed contract before founder time**. This is an estimate, not a quote; it excludes support, legal, and acquisition. Track it from the first contract so pricing is not guesswork.
- **Channel falsification tests.** The customer-web/supply-WhatsApp asymmetry is falsified if providers ask for a desktop/web portal, WhatsApp delivery falls below 80%, magic-link quote completion is below 30%, supply prefers phone calls, or customer request completion is below 20%. Instrument these from day one; do not wait for the 8-week guardrail.
- **First-10-days / walking skeleton.** Plan A's first 10 days (`rewrite-playbook.md:139-155`) is a true walking skeleton: repo, auth, schema, action runtime, request draft/publish/browse, tests, deploy. But it proves only auth and requests; it does not touch providers, verification, quotes, contracts, or WhatsApp. Treat it as the foundation gate, not the marketplace gate. The sequence in §8 is more aggressive; if it slips, fall back to Plan A's version and do not start marketplace features until the skeleton is green.
- **Rewrite playbook assessment.** The rewrite playbook is the most actionable document in either plan: bootstrap checklist, first-10-days table, vertical-slice template, parity checklist, and cut list. It is not too abstract. Its weaknesses are the timeline, the missing verification/acquisition dependencies, and the assumption that the supply side already exists. Fix those, and it is usable.
- **Agent evaluation scope.** Plan A's gates are meaningful: zero unapproved writes, tool correctness, PII leakage, prompt injection, and budget (`README.md:714`). But "50+ golden conversations" before launch is over-scoped for a 5-tool customer agent. Start with 15–20 high-quality conversations covering the request, quote comparison, refusal, PII, and injection cases; grow the set after launch. Do not let eval breadth delay the first real request.

---

## 7. What to cut

Cut in this order. "Cut now" means remove from the MVP before coding; "defer" means design the seam but do not build it.

### Cut now

1. **Reviews and ratings.** They need completed contracts, moderation, and fraud handling. Defer until 25+ completed contracts. Keep a `reviews` table only if it costs nothing; do not build UI.
2. **Voice notes and audio transcription.** High cost, high failure modes (accents, code-mixing, background noise), and not required for a first quote. Defer until supply users ask for it.
3. **PDF certificate.** Generate an HTML certificate with the hash and audit trail first. Add PDF signing/stamping later. The legal value is in the hash chain and evidence, not the PDF renderer.
4. **Custom admin UI.** Use SQL/Retool for verification, disputes, and category management. Build only the provider verification queue if manual SQL becomes the bottleneck.
5. **WhatsApp button replies and inbound webhook automation.** Start with outbound utility templates + magic-link cards. Add inbound buttons after the first 20 quotes.
6. **Material tax/HSN and multi-line complexity.** Keep simple line items (description, quantity, unit, unit price) but defer GST splits, HSN, and per-line rounding. One tax rate or "tax included" is enough for MVP; confirm with a CA.
7. **Full chat.** Replace real-time chat with threaded comments + WhatsApp notifications. Keep the `chat_messages` table for the timeline; do not build presence, typing, SSE, or file/voice chat. This is the biggest schedule saving.
8. **Projects grouping.** Nice for repeat customers, not needed for the first 10 contracts. Defer.
9. **PostGIS radius matching.** For one city and three categories, city/pincode/category filters are enough. Add PostGIS when there are multiple cities or 500+ providers.
10. **Supply agent.** Customer-only agent. Supply gets alerts, magic-link cards, and a web portal. Revisit after 50 providers and 100 quotes.
11. **Agent tool breadth.** 5 tools: `request.createDraft`, `request.updateDraft`, `request.publish` (approval), `quote.compare` (summary), `profile.get`. Do not build `chat.sendMessage`, `contract.draft`, or supply tools in MVP.
12. **MCP, action versioning, generated tool registry UI, per-client OAuth.** Post-MVP platform work. Keep the action catalog thin.
13. **AI Gateway fallback/caching dashboards, model A/B testing, nightly live-model evals.** Use one pinned model, a token budget, and a weekly manual eval. Add automation after launch.
14. **Load tests, Lighthouse 90, axe accessibility, 24h smoke tests.** Keep a basic Playwright happy path and a mobile check. Do performance/accessibility hardening after the first 10 contracts.
15. **Disputes UI and admin resolution.** If disputes are out of MVP, remove `admin.dispute.resolve` and document the manual WhatsApp/phone process. If they are in, keep only a read-only queue + founder mediation.

### Defer, but design the seam

- **Escrow / payment partner.** Reserve `platform_fee_*`, `commission_status`, `settlement_type`; do not integrate a PA until there is volume and a legal model.
- **Aadhaar eSign.** Reserve a `signature_method` field; integrate a licensed ASP for high-value contracts later.
- **Mobile apps.** PWA + WhatsApp cards are enough.
- **Multi-city / multi-language.** One city, Hindi/Marathi copy for supply, English/Hinglish for customers.
- **Supplier catalog, inventory, logistics.** Not MVP.
- **Provider payouts, commission invoicing, TDS/TCS automation.** Manual/CA first.
- **Referrals, coupons, growth loops.** After liquidity.

### Never cut

Auth, server-enforced permissions, audit trail, idempotency, backups/PITR, contract hash/versions, the quote-acceptance transaction, provider verification, DPDP consent, WhatsApp opt-in/STOP, legal review, and a rollback plan. These are not features; they are the minimum price of handling money and contracts.

---

## 8. Recommended consolidated plan

This is the plan I would execute. It is Plan A with a smaller MVP, a real acquisition plan, and the legal/data corrections above.

### Stack

- **Language:** TypeScript strict, one repo, pnpm + Turborepo.
- **Web:** React 19 + React Router v7 framework mode, shadcn/reui, PWA, mobile-first.
- **API:** Hono on Cloudflare Workers. REST for CRUD and threaded comments; polling only if needed; webhooks for WhatsApp.
- **Database:** Supabase Postgres in AWS `ap-south-1` Mumbai, Drizzle ORM, Hyperdrive. PostGIS is available, but the MVP uses city/pincode filters rather than radius matching.
- **Files:** Cloudflare R2 with pre-signed uploads and EXIF stripping.
- **Async:** transactional outbox + Cloudflare Queues + Cron. No Kafka, RabbitMQ, Temporal, or Workflows.
- **Auth:** Better Auth with phone OTP (MSG91/WhatsApp) + Google OAuth. Session cookies, step-up for admin/signing.
- **Agent:** Vercel AI SDK + a thin action registry + Postgres state. One pinned model via AI Gateway. No Agents SDK, no Durable Objects.
- **Observability:** Sentry, structured JSON logs, uptime checks, AI Gateway token/cost logs, `usage_events`.
- **Billing:** none in MVP; reserve `plans`/`user_plans`, `platform_fee_*`, `commission_status`, `settlement_type`.

### Architecture

A modular monolith with one action catalog. Every mutation goes through `defineAction({ id, schema, roles, risk, handler })`. The runtime enforces authentication, active role, ownership/participation, entity state, field-level DTO masking, risk tier, rate limit, step-up, one transaction, audit + outbox, and idempotency. The UI calls the same action through the API; the agent calls it as a tool. No hand-written Python HTTP wrappers.

Resolve Plan A's module-boundary contradiction explicitly: `packages/core` owns contracts, Zod schemas, policy, state machines, and pure money/tax functions. `packages/db` owns Drizzle, SQL, repositories, and transaction orchestration. An action handler may receive a `UnitOfWork`/repository interface and run inside a transaction opened by the API/service layer; `core` does not import Drizzle. This preserves testability without pretending that a transaction is pure.

### Scope — in

- Auth, roles, onboarding, phone verification, consent.
- Provider verification queue (manual/SQL first), provider profiles, categories, service area.
- Customer requests: work and material, photos, approximate location, budget, expiry, visibility.
- Provider discovery: city/pincode/category filters; invites and interests.
- Quotes: versioned header + simple line items, validity, terms, attachments.
- Quote acceptance: `SELECT FOR UPDATE`, partial unique index, one accepted quote per request, contract draft, audit/outbox.
- Contracts: immutable versions, SHA-256 terms hash, dual OTP, signature rows, hash-chained events, HTML certificate.
- Milestones and offline payments: request, mark paid with reference, confirm receipt, dispute flag.
- Threaded comments + WhatsApp notifications (no real-time chat).
- WhatsApp supply channel: utility templates, magic-link quote card, opt-in/STOP, web fallback.
- Customer agent: 5 tools, approval cards, PII redaction, token budget, eval set.
- Minimal admin: verification, suspension, category manager, read-only audit/dispute view.
- DPDP consent, export/deletion request, retention policy.
- Analytics: 12 core events, one dashboard.

### Scope — out

Reviews, voice notes, PDF certificate (HTML + hash first), custom admin UI, projects, PostGIS radius matching, real-time chat/presence/typing, material tax/HSN, multi-city, supply agent, MCP, action versioning, mobile apps, escrow, Aadhaar eSign, payouts, referrals, advanced search, AI Gateway fallback/caching dashboards, load tests, Lighthouse 90, axe accessibility.

### Team and timeline

- **Team:** one founder + AI coding agents. No second developer, no designer, no ops hire.
- **MVP:** 14–16 weeks of build for the scope above, plus 2 weeks buffer = 16–18 weeks to launch.
- **Full Plan A scope:** 22–26 weeks. If the founder refuses cuts, use this number and do not pretend otherwise.
- **Cadence:** weekly vertical slice; Monday spec, Tuesday–Thursday build, Friday demo + metric review + cut. One PR per slice, under 400 changed lines, deployable `main`.
- **Most likely slip:** Week 4–7 marketplace core. Protect it by cutting chat, projects, PostGIS, and material tax. Second slip: Week 13–15 agent + WhatsApp; protect it by starting Meta verification and DLT on Day 1.

### Channels

- **Customer:** web/PWA. Phone OTP; Google optional. Request creation, quote comparison, contract signing, milestone tracking.
- **Supply:** WhatsApp utility templates + magic-link mobile card; web provider portal as fallback. No supply chatbot.
- **Admin/support:** internal web page or Retool; WhatsApp support number for disputes.

### Agent boundary

Customer-only. Five tools: draft request, update draft, publish request (approval), compare/summarize quotes, get own profile. **No external message send, no quote accept, no contract sign, no payment action, no admin action.** External messages are drafts the human sends. Internal summaries/notes can be `SAFE_WRITE`. Server-enforced risk tiers, PII redaction, prompt-injection evals, per-user token budget, per-thread kill switch.

### Data and security non-negotiables

- Money in integer paise, serialized as strings; no floats; GST rate/rounding defined.
- Exact address in `addresses`, never on `requests`; site-visit release with consent and audit.
- `otp_challenges` with code hash, purpose, entity, version, expiry, attempts, consumed_at.
- `contract_versions`, `contract_signatures`, `contract_events` hash chain; one current version; tamper test.
- `webhook_events` unique on provider + external_id; signature + timestamp + replay check.
- `whatsapp_contacts` with marketing/utility opt-in and STOP timestamp.
- `audit_events`, `outbox_events`, `idempotency_keys` in the same transaction as every mutation.
- Quote acceptance: `SELECT FOR UPDATE`, partial unique index, idempotency key.
- Magic links: 24–72h read, 15-min single-use mutation, phone/request binding, revocation, `noindex`.
- Uploads: pre-signed constraints, MIME/content validation, EXIF strip, size limits, signed downloads.
- RLS later as defence-in-depth; action-layer authorization is the primary control.
- Backups: daily + PITR, RPO ≤15 min, RTO ≤4h, restore drill before launch.
- Legal: "electronic acceptance with audit trail", not eSign/65B; counsel review before launch.
- DPDP: consent, purpose limitation, export, deletion with legal-retention exceptions, breach owner.

### Success metrics

- 10 signed contracts in 90 days, one city, three categories.
- ≥30% of published requests receive a quote within 7 days; time-to-first-quote <24h median.
- 50 verified providers; ≥30% weekly active; ≥10 providers quote within 24h.
- Customer request completion rate; quote-to-contract rate; contract completion rate.
- Dispute rate <10%; WhatsApp opt-out rate <5%; template delivery >95%.
- Cost per signed contract; infra + variable cost per month; gross margin per contract if charging.
- Leading indicators reviewed weekly: provider calls, provider activations, requests created, requests published, quotes submitted, quotes accepted.

### Top 5 risks

1. **Liquidity:** no supply or demand shows up. Mitigate with two weeks of concierge acquisition before code.
2. **Trust/verification:** a bad provider damages the brand. Mitigate with manual verification, site visits, contract-only reviews, and fast suspension.
3. **Legal/payment overclaim:** a contract is unenforceable or a payment dispute escalates. Mitigate with counsel, honest labels, offline ledger, no fund custody.
4. **Runway/cost:** PITR + WhatsApp + LLM + support exceed the cap. Mitigate with a real budget, usage caps, and a monthly cost review.
5. **Agent incident:** the agent sends a wrong message or leaks PII. Mitigate with draft-only external messages, server-enforced tiers, evals, and a kill switch.

### Top 5 decisions before writing code

1. **Scope:** 14–16 week cut MVP or 22–26 week full Plan A. Pick one and write it down.
2. **City and three categories:** choose based on supply density, not ambition. Name 50 providers.
3. **Money:** who pays Gefifi, how much, and who invoices. If free for 90 days, say so and set a review date.
4. **Verification owner and SLA:** who reviews documents, in what timeframe, with what evidence.
5. **Channel fallback:** what happens if Meta verification/templates fail. SMS/phone/web must be ready.

### First 10 days

- **Day 1:** Freeze v2, tag `v2-final`, create the v3 repo, set branch protection. Start Meta Business verification and DLT registration. Open Supabase Mumbai, Cloudflare, Sentry, R2, and the domain. Make 5 provider calls.
- **Day 2:** Monorepo, CI skeleton (typecheck/lint/unit), preview deploy, Hono health check, Drizzle + Postgres connection, first migration.
- **Day 3:** Better Auth phone OTP + Google, session, roles, onboarding, consent capture. Make 5 more provider calls.
- **Day 4:** `defineAction` runtime with Zod, policy, risk tiers, audit/outbox/idempotency, one sample action end-to-end.
- **Day 5:** Schema v1: users/roles, profiles, addresses, requests, request_items, quotes, quote_line_items, contracts, contract_versions, contract_signatures, contract_events, milestones, payment_records, disputes, audit/outbox/idempotency, otp_challenges, webhook_events, whatsapp_contacts, magic_links.
- **Day 6:** Request create/publish + R2 photo upload + mobile-first UI. Make 5 provider calls.
- **Day 7:** Provider browse/interest + minimal verification queue (SQL/Retool) + seed 10 providers.
- **Day 8:** Quote submit/compare + quote acceptance transaction + contract draft. Test concurrency and idempotency.
- **Day 9:** Contract signing with OTP challenge + hash chain + HTML certificate. Test tamper and replay.
- **Day 10:** WhatsApp utility template + magic-link quote card on staging. Run one real end-to-end request with a real provider and a real customer. Measure CI time, latency, and cost. Update the plan and cut anything not on the critical path.

Do not spend all 10 days coding. The founder should spend at least 10 hours in the first 10 days talking to providers and customers. The code is not the risk; the empty marketplace is.

---

## 9. Questions for the founder

Only questions whose answers change the plan. Maximum 10.

1. **What is the real all-in monthly budget for the first six months** — infra only, or infra + WhatsApp + SMS + LLM + support? Is it under $100, $200–$500, or something else? This decides whether PITR, WhatsApp, and a paid LLM are launch features.
2. **Do you already have 50 named providers and 20 customer requests in one city?** If not, will you spend two weeks on concierge acquisition before writing code? This is the difference between a launch and a demo.
3. **Which city and which three categories**, and why those? Name the supply density and the first 10 customers. If you cannot name them, the wedge is not chosen.
4. **Who pays Gefifi, how much, and when?** Commission, lead fee, customer fee, or free for 90 days. If free, what is the review date and the conversion hypothesis?
5. **Will you commit to the 14–16 week cut MVP**, or do you require the full Plan A scope? If full, are you prepared for 22–26 weeks?
6. **Who verifies providers, with what documents and SLA?** Can you personally review 10–20 providers in the first two weeks, or do you need a part-time ops person?
7. **Are you willing to call the contract an "electronic acceptance with audit trail"** and remove 65B/eSign/admissibility claims? Will you budget for Indian legal review before launch?
8. **What is the fallback if Meta WhatsApp verification or template approval takes more than four weeks?** SMS, phone calls, a web portal, or delay? This decides whether WhatsApp is a dependency or a bonus.
9. **What is the support and dispute process for the first 90 days?** Who answers WhatsApp, within what time, and what can they actually do about an offline payment dispute?
10. **Do you have six months of runway** if the marketplace takes longer than 90 days to produce 10 contracts? If not, the plan must include a revenue or services bridge, not just a product launch.

---

## 10. Fact-checks and assumptions

| Claim | Source | Status | Impact |
|---|---|---|---|
| Supabase has an AWS Mumbai (`ap-south-1`) region | Supabase regions documentation, checked 2026-11-08 | **Verified** | Mumbai is viable; no need for Singapore. Benchmark Hyperdrive latency from a Mumbai Worker. |
| Supabase PITR costs $100/month per 7 days of retention | Supabase pricing page, checked 2026-11-08 | **Verified** | The <$100 infra cap is false with PITR. Re-baseline to $150–200 infra or skip PITR and accept weaker recovery. |
| Cloudflare Workers Paid: 5 min max CPU, 30s default, 128 MB memory, 10,000 subrequests per request | Cloudflare Workers limits, checked 2026-11-08 | **Verified** | Fine for API and SSR; not for long PDF/audio jobs. Move heavy work to Queues/Containers or defer. |
| Hyperdrive: about 100 origin connections per config, 60s max query duration | Cloudflare Hyperdrive limits, checked 2026-11-08 | **Verified** | Fine for MVP; no long analytics queries through Hyperdrive. |
| Workflows: 30s default/5 min configurable CPU per step, 1 MiB step result/payload, 50,000 concurrent on paid | Cloudflare Workflows limits, checked 2026-11-08 | **Verified** | Workflows are not a general compute engine; Plan B's long-running processes are constrained. |
| Queues: 128 KB message, 5,000 messages/sec/queue, 15 min consumer | Cloudflare Queues limits, checked 2026-11-08 | **Verified** | Fine for notifications; do not put PDFs or images in messages. |
| Cloudflare has "30+ PoPs across India" | Plan B claim at `gefifi_v3_master_blueprint.md:73`; Cloudflare network list, checked 2026-11-08 | **Overstated / unverified** | Cloudflare's public network list shows roughly 21 Indian cities; the PoP count may be higher, but it is not a latency SLA. Measure actual routes. |
| Workers have "zero cold starts" | Plan B claim at `gefifi_v3_master_blueprint.md:73` and `gefifi_v3_strategy.md:134` | **Unverified / marketing** | Cold starts are not a contractual guarantee. Measure P95/P99 for the actual routes. |
| Better Auth has a phone-number OTP plugin | Better Auth documentation, checked 2026-11-08 | **Verified** | Phone OTP is feasible; delivery still depends on MSG91/WhatsApp/DLT. |
| React Router v7 framework mode is current | React Router documentation, checked 2026-11-08 | **Verified** | Keep React Router v7; TanStack Start is higher-risk for a solo MVP. |
| Meta WhatsApp is per-message priced; since 1 Oct 2026, service messages are charged after 1,000 free/month; utility templates are not free | Meta WhatsApp pricing documentation, checked 2026-11-08 | **Verified** | The notes' "utility = zero marketing cost" is misleading. Budget per message and get opt-in. |
| Lead notifications to providers are marketing category and need opt-in | `notes/What is the legal or commercial bar for contracts and money?.md:63`; Meta policy | **Verified by plan's own note; confirm in Meta dashboard** | Without opt-in, template approval and delivery are at risk. Add `whatsapp_contacts`. |
| Section 65B of the Indian Evidence Act is the correct electronic-evidence provision | Plan A `README.md:705`, `:825`; Plan B `gefifi_v3_definition_of_done.md:112`; notes `:25`, `:71` | **False** | The Indian Evidence Act, 1872 was replaced by the Bharatiya Sakshya Adhiniyam, 2023 (effective 1 July 2024); electronic records are now s.63. Remove 65B. Primary source fetch was blocked (HTTP 403); confirm with counsel. |
| Dual OTP + SHA-256 + PDF is admissible electronic evidence under Section 65B | Notes `:25`, `:71`; Plan A `README.md:705`, `:825`; Plan B `gefifi_v3_definition_of_done.md:112` | **False as a guarantee** | It is evidence of assent/integrity, not a statutory e-signature, and admissibility is for a court; 65B is repealed. Label it "electronic acceptance with audit trail". |
| DPDP Rules are final and in force with specific timelines | Not verified; India Code/MeitY returned HTTP 403 | **Unverified** | Confirm commencement, notice/consent requirements, breach notification, and retention with counsel before launch. |
| Supabase Mumbai delivers <15ms P95 query latency from a Mumbai Worker | Plan B DoD `gefifi_v3_definition_of_done.md:22` | **Unverified** | Benchmark with real Hyperdrive + Postgres. If >50ms, simplify queries or move closer. |
| WhatsApp OTP delivery P95 <10 seconds to Jio/Airtel/Vi | Plan B DoD `gefifi_v3_definition_of_done.md:48` | **Unverified** | Carrier-dependent. Measure; keep SMS fallback. |
| 18 weeks is enough for the full Plan A scope | Plan A `README.md:73` | **Assumption, likely false** | Full scope 22–26 weeks; cut MVP 14–16 weeks of build plus buffer. |
| 10 signed contracts in 90 days is achievable | Plan A `README.md:63` | **Assumption** | Depends on supply density and founder sales effort, not code. Validate with 10 provider/customer commitments before launch. |
| 50 verified providers can be seeded | Plan A `README.md:745` | **Assumption** | No list, script, or incentive exists. Make it a pre-code deliverable. |
| Plan B M0 is `done` and M1 is `active` | Plan B `gefifi_v3_master_blueprint.md:322-323` | **False relative to repository** | The repo is still v2 with zero CI workflows. Milestone status is fiction. |
| v2 has 2 trivial frontend tests and 0 CI workflows | Repository inspection, 2026-11-08 | **Verified** | The rewrite starts from near-zero quality infrastructure; budget time for CI, fixtures, and integration tests. |
| Aadhaar collection for provider verification is safe | Plan B `gefifi_v3_permissions_matrix.md:90` | **Unverified / high legal risk** | Aadhaar handling triggers Aadhaar Act/DPDP obligations. Avoid it; use GSTIN, trade licence, phone, bank account, references. |

---

## 11. Confidence and limits

**What I could not verify**

- India Code and MeitY pages returned HTTP 403; the BSA/DPDP statutory position is based on known law and must be confirmed by Indian counsel. I could not verify the current DPDP Rules commencement timeline or state-specific stamp duty.
- I did not have access to the founder's bank balance, runway, revenue, or personal risk tolerance. The budget and timeline conclusions are therefore conditional.
- I did not have production data, real users, or any provider/customer interviews. The liquidity conclusion is a structural critique, not a measured market verdict.
- I did not test Supabase Mumbai latency, Hyperdrive behavior, Cloudflare cold starts, WhatsApp delivery, Meta template approval, or SMS/DLT delivery. Those claims are marked unverified.
- I did not obtain quotes from MSG91, Interakt, Twilio, or a payment partner. The cost table is directional.
- I did not review the v2 UI or every route; the code evidence is targeted at the domain model, quote acceptance, contract signing, and agent duplication.
- I am not a lawyer. Nothing in this review is legal advice.

**What would change my verdict**

- A named list of 50 providers and 20 customer requests in one city, with written commitments, would materially raise my confidence in Plan A's launch.
- A 14–16 week cut MVP with a real cut list and a weekly demo cadence would make Plan A executable.
- Evidence that Meta verification and templates are already approved, or a working SMS/phone fallback, would remove the biggest channel risk.
- Indian counsel confirming that the electronic-acceptance model is enforceable for the target contract types, with a reviewed template, would remove the legal blocker.
- A budget of $250–350/month all-in, or a plan that runs web-only until revenue, would remove the cost objection.
- A second developer or a part-time ops person would change the timeline math, but not the need for liquidity.
- If the founder insists on the full Plan A scope and a hard 18-week deadline, my verdict changes from "directionally right" to "not executable"; the plan would need a rewrite or a deadline change.

---

## Appendix: Direct answers to the ten specific questions

### 1. Is the 18-week solo timeline credible? If not, what is the real minimum and what must be cut?

**No, not for the full Plan A scope.** Eighteen weeks is credible only for a cut MVP. The full scope — projects, PostGIS, quotes with line items, contracts with dual OTP and hash chains, PDF, milestones, payments, chat with voice notes, agent, WhatsApp, admin, reviews, hardening, UAT — is 22–26 weeks for one developer plus agents. The first slip is Week 4–7, where nine marketplace primitives share four weeks; the second is Week 13–15, where the agent and WhatsApp channel share three weeks with evals and templates.

The real minimum for a launchable product is **14–16 weeks of build (16–18 with buffer)**, and it requires cutting reviews, voice notes, PDF certificate (use HTML + hash), custom admin UI, full chat (use threaded comments + WhatsApp), material tax/HSN, projects, PostGIS radius matching, supply agent, and agent breadth (5 tools). If the founder refuses those cuts, the honest plan is 22–26 weeks. The 2-week buffer cannot absorb both a nine-deliverable Week 4–7 and a ten-item Week 13–15.

### 2. Is Cloudflare + Supabase Mumbai the right cloud, or should the founder choose a more boring Node/Postgres host? What is the exit ramp?

**Cloudflare + Supabase Mumbai is the right choice for this founder, with caveats.** The stack is low-ops, cheap at MVP volume, and the primitives map well to the product: Workers for API/SSR, R2 for files, Queues/Cron for notifications, Hyperdrive for Postgres, AI Gateway for model routing. The boring alternative — Fly.io/Render/Cloud Run + AWS RDS Mumbai or managed Postgres — is also valid, but it adds more operational surface for a solo founder and does not solve the hard problems (liquidity, verification, contracts). Neon has no Mumbai region, so it is not a like-for-like alternative.

The caveats are real: Workers have a 30s default/5 min max CPU and 128 MB memory, so long PDF/audio jobs must move to Queues/Containers or be deferred; Hyperdrive has a 60s query limit and ~100 origin connections per config; Supabase Mumbai is a single-region dependency; PITR costs $100/month; and Durable Objects/Workflows/Agents SDK are proprietary. The exit ramp should be written before launch: Hono on Node/Fly.io or Cloud Run, PgBouncer/direct Postgres, S3/MinIO for R2, pg-boss/BullMQ for Queues, any scheduler for Cron, direct provider SDK for AI Gateway, hCaptcha/reCAPTCHA for Turnstile. Keep `packages/core` free of Cloudflare imports, keep Postgres standard, and keep files in S3-compatible storage. Do not put business truth in DO SQLite or Workflow state.

### 3. Is Postgres + SSE/polling enough for chat, or is cutting Durable Objects a mistake?

**Postgres + SSE/polling is enough for the MVP, and cutting Durable Objects is not a mistake.** The MVP chat is 1:1 per request × provider, low concurrency, text/files, no presence or typing. Polling every 3–5 seconds or a simple SSE endpoint backed by a Postgres query is sufficient. Do not build on a long-lived `LISTEN` connection from short-lived Workers request handlers (Hyperdrive pools connections and request lifetimes are bounded), so use short polling or an SSE stream that polls the DB; do not build a WebSocket layer just to avoid a 3-second delay.

Durable Objects become useful when you have thousands of concurrent chat connections, presence/typing, fan-out, or offline delivery guarantees. That is a post-liquidity problem. Adding DOs now creates a second state store, a migration problem, a cost line, and vendor lock-in before the marketplace has proven that anyone wants to chat. Revisit when chat concurrency or delivery latency becomes a measured problem, not a hypothetical one.

### 4. Is the action catalog the right core abstraction, or is it a premature platform?

**It is the right abstraction, but keep it thin.** A single action definition powering UI, API, and agent tools is the correct fix for v2's duplicated REST routes and Python HTTP wrappers. It is also the only reliable way to enforce the same permissions and risk tiers across human and agent callers. The four risk tiers and immutable `PendingAction` are good design.

It becomes premature platform work when you add MCP, action versioning, a generated tool registry UI, per-client OAuth, a rate-limit framework, and a plugin system before launch. For MVP, `defineAction({ id, schema, roles, risk, handler })` plus policy functions, DTO masking, audit/outbox/idempotency, and a transaction wrapper is enough. Resolve the "pure core" contradiction: core owns contracts/policy/state machines; the API/db layer owns transactions. An action can receive a repository/UnitOfWork interface without importing Drizzle. Do not let architectural purity force you to open transactions in the wrong layer.

### 5. Is customer-only agent in MVP the right boundary, or should supply get an agent first?

**Customer-only is the right MVP boundary.** The customer's job — articulate a messy request, compare quotes, understand contract terms — is where an LLM adds obvious value and where the user has screen space. Supply users are low-bandwidth, often on shared phones, price-focused, and trust-sensitive; a chatbot adds onboarding, language, and liability before the marketplace has liquidity. Supply needs fast lead alerts, a 1-tap quote card, saved rates, and a human phone number, not a conversational agent.

Plan B's 9-tool agent includes 3 supply actions (`request.browseMatching`, `interest.express`, `quote.submit`) and gives supply users approval cards on WhatsApp/mobile cards, where the interaction is hardest. That is the wrong order. Build supply trust with alerts and cards first; add a supply agent after 50 providers and 100 quotes, when you know what they actually ask. The same action catalog makes that addition cheap later.

### 6. Are contracts + dual OTP + SHA-256 + PDF legally and technically defensible in India? What claims must be removed?

**Technically defensible as evidence; legally overclaimed as "Section 65B evidence".** Immutable versions, a SHA-256 terms hash, OTP challenges, IP/device/timestamps, hash-chained events, and a PDF certificate are a good evidence package for mutual assent and terms integrity. They are not a statutory electronic signature under IT Act ss.3/3A, and they do not guarantee admissibility. A court decides admissibility; a platform cannot promise it. Plan A correctly disclaims Aadhaar eSign; keep that disclaimer.

Remove: "Section 65B" (the Indian Evidence Act, 1872 was replaced by the Bharatiya Sakshya Adhiniyam, 2023; electronic records are now s.63), "admissible electronic evidence", "legally binding e-signature", and any implication of Aadhaar eSign. Replace with "electronic acceptance with audit trail". Keep the mechanism, add counsel review of the contract template, stamp duty, GST/TCS, and intermediary posture. For high-value contracts, integrate a licensed Aadhaar eSign ASP later. Do not collect Aadhaar for provider verification; use GSTIN, trade licence, phone, bank account, and references.

### 7. Is the offline UPI ledger sufficient, or does the product need a payment partner before launch?

**Sufficient for MVP if Gefifi never holds, routes, or guarantees funds.** The ledger should record payer, payee, amount, UTR/reference, screenshot, milestone, timestamp, and both-party confirmation. The customer records payment; the provider confirms receipt; either can dispute. The terms must say Gefifi is a discovery and record-keeping platform, not a payment intermediary, escrow, or guarantor. Reserve `platform_fee_*`, `commission_status`, and `settlement_type` fields.

You need a payment partner before launch only if you want to charge and collect a commission, hold funds, or automate payouts. If you charge offline, decide who invoices whom and how GST is handled; if you charge online, use an RBI-licensed PA (Razorpay/Cashfree) and do not hold customer funds yourself. The offline model is viable for 10 contracts; it is not viable at scale or for high-value contracts without escrow. Make the limitation explicit in the product and the terms.

### 8. Is WhatsApp + magic links viable for supply, given Meta verification, template approval, and DLT? What is the fallback?

**Viable, but fragile; do not make it the only channel.** Meta Business verification can take days to weeks, template approval can be rejected, per-message pricing applies, utility templates are not free, and lead notifications are marketing category requiring opt-in. DLT registration is required for SMS fallback, and shared phones/forwarded links are common. The plan's own note says lead notifications are marketing (`notes/What is the legal or commercial bar for contracts and money?.md:63`), which means opt-in and template categorization matter.

Fallback: SMS with a DLT-registered header and transactional template, a phone call from the founder/ops, a web provider portal, and a Google Form/manual quote process for the first cohort. Start Meta verification and DLT on Day 1, not Week 13. Use WhatsApp utility templates for quote received, contract signature, and payment confirmation; use marketing opt-in only for new lead alerts. Track delivery, opt-out, and template quality weekly. If Meta is blocked, run the first 10 contracts on phone + web + SMS; the marketplace does not need WhatsApp to prove demand.

### 9. What is the smallest launchable product that can produce 10 signed contracts in 90 days?

One city, two or three categories, 50 verified providers, 20 real requests, and a concierge founder. The flow: customer phone OTP → create a work/material request with photos and approximate location → founder/ops manually matches 3–5 providers → providers get a WhatsApp lead + magic-link quote card (or web) → quote → customer compares → accept → contract with hash + dual OTP → milestone/payment record. No reviews, no PDF certificate, no voice notes, no full chat (threaded comments), no supply agent, no material tax/HSN, no projects, no PostGIS (city/pincode), no custom admin UI (Retool/SQL), no SSE (polling).

The code for that concierge version can be ready in 12–14 weeks; the broader cut MVP in §8 is 14–16 weeks. Either way, 10 contracts in 90 days after launch depends on supply and founder sales, not features. The smallest launchable product is therefore **a concierge marketplace with a contract and payment record**, not a platform. If the founder cannot personally recruit 50 providers and 20 requests, no amount of code will produce 10 contracts.

### 10. What are the top 5 things that will make this rewrite fail, and what should the founder do first?

1. **Building before liquidity.** No supply, no demand, no contracts. Do two weeks of provider/customer interviews and written commitments before code.
2. **Scope creep and timeline fantasy.** The full 18-week Plan A is 22–26 weeks. Cut to a 14–16 week MVP, freeze the list, and demo weekly.
3. **Trust and verification failure.** Unverified providers, no site visit, no dispute process. Define documents, SLA, site visits, suspension, and manual mediation before launch.
4. **Legal/payment overclaim.** 65B/eSign/escrow language creates false confidence and regulatory risk. Fix the labels, get counsel, keep funds offline, and never hold customer money.
5. **Agent incident.** The agent sends a wrong message, leaks PII, or commits to a price. Keep external messages draft-only, enforce tiers server-side, run evals, and add a kill switch.

**What to do first:** freeze v2; start Meta verification and DLT; make 10 provider calls and 5 customer calls; choose one city and three categories; write the 14–16 week cut list; then build the walking skeleton (auth → one action → DB → UI → deploy) in the first 10 days. Do not start with the agent, the chat, or the contract PDF.
