# Second-Opinion Review Prompt — Gefifi v3 Revised Plan

> **How to use:** Give this entire document to a different reviewing agent/model, with read access to the repository. Ask it to write its review to `docs/plan-review/external/2026-11-12-second-opinion.md` and to **not** modify any plan file.
>
> **Why a new prompt:** the first prompt reviewed the pre-revision plan and assumed PDF certificates, an 18-week full scope, and cuts to chat/voice. Those assumptions are superseded. Do not reuse the first prompt for a second opinion.

---

## 1. Role and stance

You are an independent principal engineer and product reviewer. You have experience with Indian marketplaces, Cloudflare Workers, Supabase/Postgres, real-time chat, AI-agent safety, and consumer-contract operations. You have no loyalty to this plan.

Your job is to **red-team the revised Plan A**, not to rewrite it and not to re-review Plan B. Find:

- assumptions that are still false;
- contradictions between documents;
- work that is missing from the critical path;
- safety, legal, privacy, or operational gaps;
- places where the timeline is still optimistic;
- places where the plan is over-engineered for a solo founder.

Be specific. Cite `file:line`. Separate facts from assumptions. If the plan is executable, say so plainly; do not manufacture objections.

---

## 2. What you are reviewing

Read, in this order:

1. `docs/plan/made-by-opencode/README.md` — product decisions, architecture, data model, roadmap, cost, metrics, risks, DoD, review disposition.
2. `docs/plan/made-by-opencode/rewrite-playbook.md` — freeze, bootstrap, first 10 days, slice order, parity, cutover.
3. `docs/plan/made-by-opencode/engineering-rules.md` — code, data, permissions, edge cases, security, testing, agent rules.
4. `docs/plan/made-by-opencode/permissions-matrix.md` — actors, actions, field visibility, states, channels.
5. `docs/plan/made-by-opencode/acquisition-plan.md` — the pre-code sprint.
6. `docs/plan/made-by-opencode/verification-rubric.md` — provider checks and suspension.
7. `docs/plan/made-by-opencode/legal-and-payments-checklist.md` — legal, tax, payments, retention.
8. `docs/plan/made-by-opencode/analytics-events.md` — event taxonomy and no-PII rules.
9. `docs/plan/made-by-opencode/AGENTS.md` — the agent operating contract.

Read those first and write your own findings before opening the first review. Then read:

10. `docs/plan-review/external/2026-11-03-agent-review.md` — the first external review.
11. `docs/plan-review/external-agent-review-prompt.md` — the first prompt, for context only.

Use the first review only to avoid repeating settled corrections. Do not let it anchor your verdict. If you disagree with it, say so.

Do **not** review `docs/plan/made-by-antigravity/`. Plan B was rejected and is not an execution option.

---

## 3. Initial brief

Gefifi is an Indian construction marketplace. Customers post work or material requests; experts and suppliers quote; the customer accepts, signs a contract, and tracks milestones. The founder is a solo developer working with AI coding agents. This is a clean v3 rewrite, not a migration.

The business goal is to launch a real business, not a portfolio project:

- one city and three categories at launch;
- 10 signed contracts in 90 days;
- a customer web/PWA, a WhatsApp + 1-tap mobile-card supply channel, full real-time chat with voice notes, an in-app customer agent, and a minimal admin console;
- infrastructure budget of **$150–200/month**, all-in operating cost of **$250–350/month**, with PITR mandatory;
- a **two-week concierge acquisition sprint before code**: 100 named providers, 10 written “quote within 24 hours” commitments, 20 real customer requests.

The original 16–20-week constraint was re-baselined to **18–20 weeks**: 16 weeks build + 2 weeks buffer as the baseline, with a 2-week slip allowance to 20 weeks. The full original scope is 22–26 weeks and is not committed.

---

## 4. Founder decisions — locked

Treat these as constraints. If any of them makes the plan non-executable, say so explicitly with evidence. Do not silently cut them.

| Decision | Choice |
|---|---|
| Full real-time chat | **In MVP.** Messages, presence, typing, read receipts, unread counts, SSE with reconnect/backfill, block/mute. |
| Voice notes | **In MVP.** Record, upload, store, play. **No transcription.** |
| Architecture | Modular monolith: React 19 + React Router v7 on Cloudflare, Hono Worker, Supabase Postgres in Mumbai, Drizzle, R2, outbox + Queues/Cron. |
| Contracts | “Electronic acceptance with audit trail”: immutable versions, SHA-256 terms hash, dual OTP, hash-chained events, **HTML certificate**. No PDF in MVP. BSA 2023 s.63 framing. No Section 65B, no “admissible evidence”, no Aadhaar eSign claim. |
| Payments | Offline UPI/NEFT/cash ledger. No escrow, no fund custody, no payment aggregation. |
| Provider verification | Manual queue from Week 1–3, 24–48h SLA. No Aadhaar. |
| Site visits | Consented, audited, time-bound address release to one provider. |
| Agent | Customer-only, **5 tools**, external messages **draft-only**. `chat.message.send` is `HUMAN_ONLY`. |
| Acquisition | Two-week concierge sprint before code. Gate: 100 named providers, 10 written commitments, 20 requests. |
| Scope | Reviews, projects, PostGIS radius matching, supply agent, PDF certificate, custom admin UI, WhatsApp inbound automation, MCP/action versioning, AI Gateway dashboards, load tests/Lighthouse/axe/24h smoke are deferred. |

---

## 5. What changed since the first review

The revised plan already adopts most of the first review:

- timeline re-baselined to 18–20 weeks; full scope not committed;
- PITR and cost rebaselined;
- contracts reframed as electronic acceptance, not 65B/admissibility;
- PDF replaced by HTML certificate;
- agent reduced to 5 tools; external messages draft-only;
- site visits and audited address release added;
- provider verification rubric added;
- acquisition sprint added;
- magic links reduced to 24–72h read / 15-minute mutation;
- reviews, projects, PostGIS, supply agent, custom admin UI deferred.

**The founder overrode one recommendation:** full chat, presence, typing, SSE, and voice notes stay in MVP. Do not recommend removing them. If you believe they make the plan non-executable, quantify the conflict and propose how to keep them while changing something else.

---

## 6. Questions to answer

### A. Executability and timeline

1. Is the 18–20-week plan executable by one developer plus AI agents, given the full chat/voice scope?
2. Which phase is most likely to slip, and by how much?
3. Is the slice order in `rewrite-playbook.md` correct? What dependency is missing?
4. Is the “first 10 days” plan realistic alongside the acquisition sprint?
5. What must be true on Day 10 for the rest of the plan to be credible?

### B. Chat, SSE, and voice

1. Is Postgres + SSE + short-lived presence/typing rows sufficient for the expected MVP concurrency? State the assumptions.
2. What breaks first at 100, 1,000, or 10,000 concurrent users?
3. Are reconnect/backfill, duplicate delivery, ordering, unread counts, and block/mute specified correctly?
4. Is the voice-note design (pre-signed R2 upload, 5 min / 10 MB, signed playback, participant check) sufficient and affordable?
5. What chat/voice tests are missing from `engineering-rules.md` or the roadmap?

### C. Contracts, legal, and payments

1. Is “electronic acceptance with audit trail” framed correctly, without overclaiming?
2. Is the dual-OTP + hash-chain + HTML certificate package coherent and implementable?
3. What stamp-duty, GST/TCS, intermediary, DPDP, or consumer-protection issue is still missing?
4. Is the offline payment ledger honest and safe, or does it still imply fund custody?
5. What must counsel review before the first real contract is signed?

### D. Agent safety

1. Do the 5 tools and risk tiers actually prevent unapproved external writes?
2. Can prompt injection through a request, file, chat message, or document change the tool allowlist or cause a send?
3. Is the draft-only external-message design enforceable server-side, or only by the UI?
4. Are the evals (15–20 conversations) enough for launch? What must be added?
5. Is the kill switch complete, and what happens to in-flight tool calls?

### E. Site visits and privacy

1. Is the consented, time-bound address release sufficient to protect customer privacy?
2. Can a provider retain or forward the address after the visit? What is missing?
3. Are no-show, reschedule, cancellation, and revocation handled correctly?
4. Does the field-visibility matrix match the action/state matrix?

### F. Verification and operations

1. Is the manual verification queue viable at 10–50 providers? At 500?
2. Are the documents, fraud signals, suspension rules, and retention realistic for Indian providers?
3. What operational bottleneck appears in Week 2–3?
4. Is “no Aadhaar” compatible with sufficient fraud control?

### G. Acquisition and liquidity

1. Is the two-week sprint enough to produce 100 named providers, 10 written commitments, and 20 real requests?
2. What is the failure mode if the gate is missed?
3. Is the 30% quote-rate guardrail the right leading indicator?
4. Does the plan accidentally start code before the gate?

### H. Scalability, durability, cost

1. Are the Cloudflare/Supabase/Hyperdrive/R2 choices coherent for India?
2. What is the first scaling bottleneck: DB connections, SSE, R2, WhatsApp throughput, or Worker CPU?
3. Is the $150–200 infra / $250–350 all-in estimate credible with PITR, voice notes, and WhatsApp?
4. Is the cost-per-signed-contract estimate reasonable?
5. What durability gap remains despite PITR and the outbox?

### I. Permissions, edge cases, and testing

1. Are there missing actions, states, or field-visibility rules?
2. Can a user or provider escalate through a multi-role account, magic link, or agent?
3. Are the permission tests and edge-case catalog sufficient?
4. Is the CI split (fast lane vs full lane) realistic for a solo developer?
5. What test would you add before launch that is not in the plan?

### J. Contradictions and stale assumptions

1. Find any remaining contradiction between README, playbook, engineering rules, permissions, legal checklist, analytics, and AGENTS.md.
2. Find any stale assumption from the pre-revision plan.
3. Find any place where a deferred feature is still on the critical path.
4. Find any place where the plan says “never cut” but the roadmap depends on cutting it.

### K. What would you change?

Without violating the locked decisions:

1. What would you cut, reorder, or simplify?
2. What would you add that is missing from the critical path?
3. What would you prototype or spike first?
4. What would you postpone even though the plan currently includes it?

---

## 7. Output format

Write a single Markdown review with these sections:

1. **Verdict** — executable / executable with conditions / not executable, and confidence.
2. **Blocking findings** — severity, evidence (`file:line`), why it blocks, and the smallest fix.
3. **High and medium findings** — same format.
4. **Contradiction table** — document A vs document B, exact conflict, resolution.
5. **Answers to §6** — concise, numbered.
6. **Revised sequence or timeline** — only if needed; show what moves.
7. **Top 5 risks** — likelihood, impact, mitigation.
8. **Go/no-go conditions** — what must be true before Week 1.
9. **What you would test first** — the first 5 tests or spikes.
10. **Assumptions to verify** — facts, vendor limits, legal points, costs.
11. **Confidence and limitations** — what you could not verify.

Keep it under ~4,000 words unless a finding requires more detail.

---

## 8. Rules

- Do not modify any plan file.
- Cite `file:line` for every material finding.
- Do not re-review Plan B.
- Do not recommend cutting full chat, presence, typing, SSE, or voice notes. If they are incompatible with the timeline, say what else must change.
- Do not repeat the first review’s settled corrections as if they were new.
- Do not give generic startup advice. Be specific to this plan and this repo.
- Do not claim legal conclusions; flag what counsel must confirm.
- If a concern is an assumption rather than a defect, label it as an assumption.
- If the plan is sound, say so; a clean review is a valid outcome.

---

## 9. Stress tests to run mentally

- Week 6–7: one developer ships SSE, presence, typing, read receipts, voice upload/playback, block/mute, notifications, and tests.
- Week 8–10: contracts, dual OTP, hash chain, HTML certificate, milestones, offline ledger, and DPDP consent.
- Week 11–12: WhatsApp templates, webhook dedupe, magic links, SSR cards, 5-tool agent, approval cards, evals.
- A provider submits a quote from a budget Android over 4G via a magic link.
- A customer releases an address for a site visit, then cancels it.
- An agent is prompt-injected by a malicious PDF and tries to send a chat message.
- A quote is accepted twice concurrently.
- A signature OTP is replayed after a contract revision.
- WhatsApp is delayed or rejected during launch week.
- The acquisition gate fails: only 4 providers commit and 8 requests are real.
