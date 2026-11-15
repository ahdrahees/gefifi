# Gefifi v3 — Operating Plan

> **Entry point.** Read this first. It fits on two pages.
> Details live in the reference docs linked below — nothing was deleted.
> At any moment only the current stage and its exit gate matter.

## 1. Destination

Launch a real construction marketplace in one city: customers post work/material requests, get verified quotes, sign a clear agreement with electronic acceptance + audit trail, track milestones, and chat in real time (presence, typing, read receipts, voice notes). Experts/suppliers quote from web or WhatsApp + 1-tap mobile cards. Solo developer + AI agents. React 19 + Router v7, Cloudflare + Supabase Postgres Mumbai.

## 2. Excluded from MVP

In-app payments/escrow, Aadhaar eSign, native apps, voice transcription, reviews, projects, PostGIS radius, PDF certificate (HTML + hash instead), custom admin UI, per-line GST/HSN, supply agent, WhatsApp inbound automation, public MCP, multi-city, group chat/video, subscriptions. Full list: `README.md` §3.2, §11.3.

## 3. Success

**10 signed contracts in 90 days, one city, three categories.** Engineering guardrail: fewer than 30% of published requests with ≥1 quote in any week after Week 2 → pause feature work, fix supply.

## 4. Frozen decisions

Clean rewrite, v2 frozen, no migration. Postgres is the only truth. One action catalog with risk tiers (`READ`/`SAFE_WRITE`/`NEEDS_APPROVAL`/`HUMAN_ONLY`). Customer-only agent, 5 tools, external messages draft-only, `chat.message.send` is `HUMAN_ONLY`. Contracts are "electronic acceptance with audit trail" (BSA 2023 s.63 framing; no 65B/admissible/eSign claim; HTML certificate). Offline UPI ledger, no fund custody. Manual verification Week 1–3, 24–48h SLA, no Aadhaar. Address release only via consented, audited, time-bound `site_visits`. PITR mandatory (RPO ≤15m, RTO ≤4h). Full chat + voice are non-negotiable; never cut to make a date.

## 5. Budget and horizon

**$150–200/mo infra, $250–350/mo all-in** (PITR ~$100/mo). Pre-code: 2-week acquisition sprint. Build: 16 weeks + 2 buffer = 18 baseline; allowed slip to 20. Plan the critical path at 20 weeks. Do not compress admin/hardening/launch to absorb chat/agent slip.

## 6. Execution sequence

| Stage | Deliverable | Evidence to proceed | Load only |
|---|---|---|---|
| Before code | Acquisition: city + 3 categories, 100 named providers, 10 written 24h-quote commitments, 20 real requests, manual quote-response test, pricing hypothesis | §8 gate in `acquisition-plan.md` all true | `acquisition-plan.md` + `docs/research/acquisition-summary.md` |
| Week 1 | Walking skeleton: auth, one secure action, DB, deploy, one mobile request | Staging deploy + migration/rollback + OTP login + denial test + idempotent write with audit/outbox | `rewrite-playbook.md` §3–§4 + `AGENTS.md` |
| Weeks 2–5 | Marketplace core: request → 3 quotes → atomic accept → contract draft; verification queue; site visits | Real staging request accepted atomically; state/transaction tests pass | `README.md` §6 + `permissions-matrix.md` §4–§6 + `engineering-rules.md` §4–§7 |
| Weeks 6–7 | Chat + voice on real phones: SSE reconnect, presence/typing TTL, unread, voice upload/play | Two real users chat + voice on mid-range Android; reconnect/auth tests pass | `engineering-rules.md` §7.9 + `permissions-matrix.md` §4.7 |
| Weeks 8–10 | Contracts + milestones: dual OTP, hash chain, HTML certificate, offline UPI ledger | Synthetic dual-party signing + tamper/replay tests; no real acceptance before legal checkpoint | `legal-and-payments-checklist.md` §3–§4 + `engineering-rules.md` §7.2–§7.3 |
| Weeks 11–12 | WhatsApp + agent: templates, magic links, SSR cards; 5-tool agent with approvals/evals | Supply quote via card; agent passes safety tests; zero unapproved writes | `README.md` §7–§8 + `permissions-matrix.md` §7 |
| Weeks 13–16 | Admin, hardening, pilot, launch: verification UI, security tests, UAT, PITR drill, legal clearance | UAT + restore rehearsal + launch checklist (`README.md` §11.2) | `rewrite-playbook.md` §9 + `legal-and-payments-checklist.md` §12 |
| Weeks 17–20 | Buffer, used explicitly | Slip logged, not silently absorbed | This file only |

Full weekly plan: `README.md` §11. Slice workflow: `rewrite-playbook.md` §5–§6. Cut order if behind: `README.md` §11.3.

## 7. Agent context rules (do not bloat context)

1. Default load: this file + `AGENTS.md` + the code you touch. Nothing else.
2. Load a reference doc only when the stage table above names it.
3. Never load all 9 docs at once. The 9 docs are reference, not required reading from Day 1.
4. On conflict: `AGENTS.md` hard rules win, then this file, then the stage doc. Stop and ask.

Reference (all kept, no details lost): `README.md`, `rewrite-playbook.md`, `engineering-rules.md`, `permissions-matrix.md`, `acquisition-plan.md`, `verification-rubric.md`, `legal-and-payments-checklist.md`, `analytics-events.md`, `AGENTS.md`.
