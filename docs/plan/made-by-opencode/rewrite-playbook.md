# Gefifi v3 — Rewrite Playbook

> **Purpose:** How to get from v2 to v3 without a big-bang rewrite, scope creep, or a second failed stack.  
> **Audience:** Founder + AI coding agents.  
> **Companion docs:** [README.md](README.md) (architecture), [engineering-rules.md](engineering-rules.md) (code and edge cases), [permissions-matrix.md](permissions-matrix.md) (roles and state transitions), [AGENTS.md](AGENTS.md) (agent operating contract — copy it to the v3 repo root on Day 1).

---

## 1. Ground rules

These are non-negotiable. If a rule blocks progress, change the rule in an ADR — do not quietly bypass it.

| # | Rule | Why |
|---|---|---|
| **R1** | **Freeze v2.** Tag `v2-final`, archive the branch, allow only critical security fixes. | Two live codebases mean two sources of truth and twice the bugs. |
| **R2** | **v2 is a reference, not a source.** Mine status enums, edge cases, UI copy, and user flows. Do not copy code. | The structure is the problem. Copying it recreates the problem. |
| **R3** | **New repo or orphan branch.** Recommended: new repo `gefifi-v3`, keep v2 deployable. Alternative: orphan `v3` branch in this repo. | Avoid accidental imports and mixed build tooling. |
| **R4** | **Walking skeleton first.** Auth → one action → DB → UI → deploy, end-to-end, before breadth. | Proves the architecture and the pipeline in days, not months. |
| **R5** | **Vertical slices, not layers.** Each slice ships schema → action → API → UI → tests → deploy. | Keeps every change demoable and revertible. |
| **R6** | **Parity before new features.** Rebuild what v2 did, minus the explicit cuts, then innovate. | Prevents second-system syndrome. |
| **R7** | **One slice per PR.** Target < 400 changed lines; never mix refactor with feature. | Reviewable by a human and by an agent. |
| **R8** | **Every PR deployable.** `main` is always shippable; feature flags hide incomplete work. | Rollback stays trivial. |
| **R9** | **No data migration.** Clean start. Recreate beta users manually if needed. | v2 is a prototype; a migration pipeline is a tax on a rewrite. |
| **R10** | **The plan is the source of truth.** If reality changes, update the plan and the ADR in the same PR. | Prevents documentation drift. |

---

## 2. Repository strategy

### Recommended: separate repository

```text
gefifi-v2/        # archived, read-only, still deployed until cutover
gefifi-v3/        # clean monorepo, new CI/CD, new deploys
```

Why:

- no accidental imports from v2;
- no mixed Svelte/React or Firestore/Postgres tooling;
- v2 stays available as a reference and a rollback;
- the v3 repo can start with a clean commit history and CI.

### Alternative: orphan branch

```bash
git checkout --orphan v3
git rm -rf .
# scaffold the monorepo
git commit -m "chore: bootstrap v3"
```

Only do this if you are comfortable with one repo containing two unrelated histories. Never merge v2 into v3.

### Tag v2

```bash
git checkout main
git tag -a v2-final -m "Gefifi v2 frozen before v3 rewrite"
git push origin v2-final
```

Put a README note on the v2 repo: **"Frozen. v3 lives at <url>."**

---

## 3. Bootstrap checklist (Week 1)

### Accounts and access

- [ ] GitHub repository `gefifi-v3` with branch protection on `main`.
- [ ] Cloudflare account + Workers Paid plan ($5).
- [ ] Supabase project in **AWS ap-south-1 (Mumbai)**; confirm PostGIS is available.
- [ ] Sentry project (browser + Workers).
- [ ] Domain/DNS access (`gefifi.in` or the chosen domain).
- [ ] WhatsApp Business account + Meta Cloud API app (or MSG91/Interakt) — start verification now.
- [ ] SMS provider + DLT registration if SMS OTP fallback is needed.
- [ ] Google Cloud OAuth client for Google login.
- [ ] LLM provider key (Gemini/OpenAI/Anthropic) behind AI Gateway.
- [ ] Password manager and a documented secret-rotation process.

### Monorepo

```text
gefifi-v3/
├── apps/
│   ├── web/                 # React Router v7, shadcn/reui, PWA
│   └── api/                 # Hono Worker: REST, webhooks, mobile cards, cron
├── packages/
│   ├── core/                # actions, policy, state machines, schemas
│   ├── db/                  # Drizzle schema, migrations, repositories
│   ├── agent/               # prompts, tool registry, evals
│   ├── ui/                  # shared React components
│   ├── config/              # tsconfig/eslint/tailwind presets
│   └── testing/             # factories, fixtures
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

### Tooling

- [ ] `pnpm` + Turborepo; Node LTS pinned in `.nvmrc`.
- [ ] TypeScript strict mode; `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- [ ] ESLint + Prettier; import-boundary rules.
- [ ] Vitest for unit/integration; Playwright for E2E.
- [ ] Drizzle ORM + Drizzle Kit.
- [ ] Wrangler configs for `web` and `api`.
- [ ] Sentry SDKs.
- [ ] `.env.example` with every required variable (no real secrets).
- [ ] `AGENTS.md` at the repo root.

### CI skeleton

```text
install → typecheck → lint → unit → integration (Postgres) → build → agent evals → deploy preview
```

- Cache pnpm and Turborepo.
- Run migrations against an ephemeral Postgres service in CI.
- Fail on type errors, lint errors, failing tests, and unsafe agent evals.
- Preview deploy on every PR; staging on `main`.

### First deploy

- [ ] `apps/api` returns `GET /health` with DB connectivity.
- [ ] `apps/web` renders a page with data from the API.
- [ ] Sentry receives a test error from both.
- [ ] Preview URL is posted on the PR.

---

## 4. The first 10 working days

| Day | Outcome |
|---|---|
| **1** | Repo, accounts, ADRs 0001–0007, v2 frozen, plan docs committed. |
| **2** | Monorepo skeleton, TypeScript/ESLint/Prettier, CI, first preview deploy. |
| **3** | Supabase Postgres + Drizzle schema v1 (`user`, `profiles`, `audit_events`, `outbox_events`, `idempotency_keys`), migration, seed. |
| **4** | Better Auth: Google login, phone OTP stub, session, onboarding, role selection. |
| **5** | `defineAction` runtime: Zod input/output, auth context, role/ownership guards, risk tier, audit + outbox, idempotency. |
| **6** | First real action: `request.createDraft`; API route; UI form; validation errors. |
| **7** | `request.publish` + `request.browse`; list/detail pages; empty/loading/error states. |
| **8** | Integration tests for actions + E2E for login → draft → publish → list. |
| **9** | Sentry, structured logs, request IDs, feature flags, basic rate limiting, docs. |
| **10** | Demo the walking skeleton; measure CI time; update the plan; cut anything that is not on the critical path. |

**Day-10 gate:** if the walking skeleton is not working end-to-end, stop and fix the foundation. Do not start marketplace features.

---

## 5. Vertical slice template

Every slice follows the same order. Do not start with the UI.

### 5.1 Spec (write before code)

A slice spec is one page:

- **User story:** who, what, why.
- **Actions:** new/changed action names and risk tiers.
- **Schema:** tables/columns/indexes/migrations.
- **Permissions:** roles, ownership, field-level visibility.
- **State transitions:** allowed from/to, guards.
- **Edge cases:** concurrency, retries, expiry, duplicates, empty states.
- **Analytics:** events/metrics to emit.
- **Rollout:** feature flag, migration order, rollback.
- **Out of scope:** what this slice does not do.

### 5.2 Implementation order

1. **Migration** — additive, backwards-compatible.
2. **Schema + types** — Drizzle table, Zod schemas, DTOs.
3. **Repository** — queries and transactions; no business policy.
4. **Action** — policy, risk tier, idempotency, audit, outbox.
5. **API route** — thin adapter: parse, call action, map errors.
6. **UI** — happy path, then empty/loading/error/denied states.
7. **Tests** — unit for policy/state, integration for transaction, E2E for the flow.
8. **Observability** — logs, metrics, Sentry breadcrumbs.
9. **Docs** — update action catalog, ADR if a decision changed.

### 5.3 Exit criteria

- [ ] Works end-to-end on staging.
- [ ] Permission tests pass for every role.
- [ ] Concurrency/retry tests pass.
- [ ] Audit + outbox rows written.
- [ ] No raw DB rows in the response.
- [ ] E2E test covers the critical path.
- [ ] Rollback tested or trivially safe.
- [ ] Analytics events emitted.

---

## 6. Slice order

| Slice | Scope | Depends on | Phase |
|---|---|---|---|
| **S0** | Walking skeleton: health, auth stub, one sample action, one page, deploy | — | 0 |
| **S1** | Auth + onboarding: Google, phone OTP, roles, consent | S0 | 1 |
| **S2** | Customer request: draft, publish, list, detail, attachments | S1 | 2 |
| **S3** | Provider discovery: PostGIS matching, profile, express interest, invite | S2 | 2 |
| **S4** | Quotes: submit, revise, line items, validity, compare | S3 | 2 |
| **S5** | Quote acceptance: atomic accept, reject others, contract draft | S4 | 2 |
| **S6** | Contract draft: versions, comments, terms, hash | S5 | 3 |
| **S7** | Signing: dual OTP, signatures, hash chain, PDF certificate | S6 | 3 |
| **S8** | Milestones: schedule, offline UPI ledger, confirm/dispute | S7 | 3 |
| **S9** | Chat: thread per request × provider, text/files/voice, timeline | S2 | 4 |
| **S10** | Agent: Core 9 tools, approval cards, evals, budgets | S5, S6 | 5 |
| **S11** | WhatsApp supply: templates, webhook, magic links, SSR cards | S3, S4 | 5 |
| **S12** | Admin, reviews, hardening, launch | S7–S11 | 6 |

**Rule:** each slice must be independently deployable behind a flag. If a slice needs three other unfinished slices to demo, it is too big.

---

## 7. v2 parity checklist

Mine v2 for behaviour, then mark each item in v3. Do not copy implementation.

### Auth and users

- [ ] Google login.
- [ ] Phone OTP login/registration.
- [ ] Profile completion and role selection.
- [ ] Expert/supplier profile fields.
- [ ] Role switching for multi-role users.
- [ ] Account deactivation/suspension.
- [ ] Consent capture (DPDP).

### Work requests

- [ ] Create with title, description, category, location, budget, timeline, images, expiry.
- [ ] Edit while open.
- [ ] Publish/open/invite-only.
- [ ] List own requests with status filters.
- [ ] Detail view with quotes/interests.
- [ ] Cancel/expire.
- [ ] Status transitions: open → under review → contracted → in progress → completed / cancelled / disputed.

### Material requests

- [ ] Create with items, quantities, units, delivery location/date, attachments.
- [ ] Link to a work request.
- [ ] Edit while open.
- [ ] List/detail/cancel/expire.
- [ ] Supplier interest and quotes.

### Discovery

- [ ] Find experts by category/location/experience.
- [ ] Find suppliers by category/location.
- [ ] Invite provider.
- [ ] Express interest.
- [ ] Radius matching (new: PostGIS).

### Quotes

- [ ] Submit quote with amount, validity, terms, files.
- [ ] Revise quote (versioning).
- [ ] Compare quotes side by side.
- [ ] Accept/reject; reject others atomically.
- [ ] Expire quotes.
- [ ] Line items for material quotes (new).
- [ ] Tax/GST fields (new).

### Contracts

- [ ] Draft from accepted quote.
- [ ] Revision comments.
- [ ] Both parties sign.
- [ ] Active-contract guard.
- [ ] Status transitions.
- [ ] Terms hash + immutable versions (new).
- [ ] Dual OTP signature (new).
- [ ] PDF audit certificate (new).

### Chat and files

- [ ] Thread per request × provider.
- [ ] Text messages.
- [ ] Images/files.
- [ ] Voice notes (store/play, no transcription).
- [ ] System timeline cards.
- [ ] Presence/typing (post-MVP; SSE/polling in MVP).
- [ ] R2 uploads.

### Agent

- [ ] Customer agent with Core 9 tools.
- [ ] Approval cards for risky actions.
- [ ] No unapproved writes in CI.
- [ ] Token/cost metering.
- [ ] Hinglish/English support.

### Admin

- [ ] Provider verification queue.
- [ ] User suspension.
- [ ] Dispute read-only view.
- [ ] Category manager.
- [ ] Audit log view.

---

## 8. Agent-assisted development workflow

### 8.1 Before asking an agent to code

1. Point the agent at the relevant docs: `README.md`, `engineering-rules.md`, `permissions-matrix.md`, `AGENTS.md`.
2. Give it **one slice** and **one spec**, not the whole roadmap.
3. State the files it may touch and the files it must not touch.
4. Ask for a plan before code for anything > 100 lines.
5. Require tests in the same change.

### 8.2 While coding

- The agent must read the existing code before writing.
- No new dependency without an ADR and human approval.
- No schema change without a migration.
- No weakening of tests, types, or lint rules.
- No secrets, real phone numbers, or production data in prompts.
- No direct database access from agent tools.
- Stop and ask when the spec is ambiguous, a migration is destructive, or a security boundary is unclear.

### 8.3 Review

- Human reviews the diff, not just the summary.
- Check that the change is the smallest correct change.
- Run the full CI locally for risky slices.
- Ask the agent to explain any new abstraction.
- Reject "while I was here" refactors.

### 8.4 Prompt template

```text
Context: Gefifi v3. Read docs/plan/made-by-opencode/README.md,
engineering-rules.md, permissions-matrix.md, and AGENTS.md.

Slice: S4 — quote submit/revise.
Spec: <link or paste>.
Allowed files: packages/core/src/actions/quotes/**, packages/db/src/schema/quotes.ts,
apps/api/src/routes/quotes.ts, apps/web/src/routes/quotes/**, tests.
Do not touch auth, contracts, or chat.

Deliver:
1. A short plan.
2. Migration + schema.
3. Action + policy + tests.
4. API route.
5. UI.
6. E2E test.
7. A list of edge cases covered and not covered.

Stop and ask if a decision is not in the spec.
```

---

## 9. Cutover

### Before cutover

- [ ] Staging UAT with 5–10 real users (customers + providers).
- [ ] WhatsApp templates approved; opt-in/STOP tested on real devices.
- [ ] Contract signing + PDF certificate tested end-to-end.
- [ ] Offline UPI ledger tested by both parties.
- [ ] Backups + restore drill.
- [ ] Sentry alerts, uptime checks, on-call expectation.
- [ ] Legal pages: ToS, privacy, intermediary disclaimer, consent.
- [ ] Support channel and incident runbook.

### Cutover day

1. Announce a maintenance window.
2. Freeze writes on v2.
3. Export v2 reference data only if needed (no bulk migration).
4. Point DNS to v3.
5. Run smoke tests: login, create request, submit quote, accept, sign, milestone.
6. Watch Sentry, error rate, and queue lag for 2 hours.
7. Keep v2 read-only for 30 days.

### Rollback

- DNS back to v2 (if v2 is still deployed).
- v3 Worker rollback to the previous version.
- Database: restore PITR only if data corruption; prefer forward-fix.

---

## 10. Weekly cadence

| Day | Activity |
|---|---|
| **Monday** | Pick the slice; write/refresh the spec; list edge cases. |
| **Tuesday–Thursday** | Implement with agents; tests alongside; deploy preview daily. |
| **Friday** | Demo, measure, update metrics, cut scope if needed. |
| **Every PR** | Typecheck, lint, unit, integration, E2E (critical), agent evals, preview. |

### Weekly questions

1. What did a real user do this week?
2. Which slice is on the critical path?
3. What can we delete or defer?
4. What broke, and what test would have caught it?
5. Is the supply side getting quotes fast enough?

---

## 11. When behind schedule

Cut in this order:

1. Reviews/ratings.
2. Voice notes.
3. PDF certificate (HTML + hash first).
4. Custom admin UI (use SQL/Retool).
5. WhatsApp button replies (outbound + magic link only).
6. Material line items (single amount + notes).
7. Agent scope (5 tools instead of 9).
8. Chat (request comments + WhatsApp).
9. WhatsApp entirely (web-only; last resort).

Never cut: auth, permissions, audit, idempotency, backups, contract hash, or the quote-acceptance transaction.

---

## 12. Definition of a successful rewrite

- One codebase, one database, one deploy pipeline.
- A customer can go from request to signed contract without leaving the product.
- A provider can quote from a WhatsApp link on a budget phone.
- The agent can draft and recommend, but never commit a high-risk action.
- Every mutation is auditable and idempotent.
- CI blocks unsafe writes and permission regressions.
- The team can ship a slice in days, not weeks.
