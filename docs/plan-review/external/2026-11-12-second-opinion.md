# Second-Opinion Review — Revised Plan A

Unless noted otherwise, citations are files under `docs/plan/made-by-opencode/`. “Defect” means a documentary or technical inconsistency; “assumption” means something requiring measurement or external validation.

## 1. Verdict

**Executable with conditions; not executable as currently sequenced. Confidence: medium.** The modular-monolith architecture, offline-ledger boundary, electronic-acceptance wording, and server-enforced agent tiers are sound. Retaining full chat and voice does **not**, by itself, force the old 22–26-week estimate: that estimate covered the pre-revision scope. The revised scope can fit **18–20 weeks** if the founder reserves roughly 30 build hours weekly after acquisition/verification work, uses the admin fallback, and proves chat/voice early.

However, four issues block execution or go-live: the first-ten-days plan duplicates much of Weeks 2–12; deny-by-default permissions omit required actions/states; chat/voice lacks implementable ordering and playback semantics; and the rollback path can strand production writes. The cut list also contradicts the locked five-tool agent (`README.md:485-495`, `README.md:855-863`). Fix these before Week 1 rather than discovering them through agent-generated code.

## 2. Blocking findings

### B1 — Defect: the Day-10 gate consumes later phases

**Evidence:** Days 1–10 require the entire schema, verification, quote acceptance, dual-OTP signing/hash chain/certificate, and a WhatsApp card, followed by a real end-to-end transaction (`rewrite-playbook.md:145-160`). Those same items are scheduled through Weeks 2–12 (`README.md:816-822`), alongside at least ten hours of outreach (`rewrite-playbook.md:162`).

**Why it blocks:** Failure of this gate stops marketplace development even though its criterion is most of the marketplace. It also puts real signing before the contract/template checkpoint.

**Smallest fix:** Make Day 10 a true walking-skeleton gate: deploy, migrations, auth, one policy-checked mutation with retry/audit/outbox, one mobile request/photo flow, and measured CI/latency/cost. Keep contracts and WhatsApp in their roadmap phases; use only synthetic signatures in staging.

### B2 — Defect: required slices are denied or lack valid states

**Evidence:** Anything absent from the matrix is denied (`permissions-matrix.md:3-5`). Yet provider discovery has no browse/search/profile-list action (`permissions-matrix.md:88-103`) despite S3 (`rewrite-playbook.md:220-224`). Site visits sit in S2 before the provider interest on which they depend. `quote.withdraw` exists but its transition does not (`permissions-matrix.md:124-132`, `permissions-matrix.md:279-289`); rescheduling has actions but no transition; and PM19 permits revision after one signature while `awaiting_signatures → revision_requested` is absent (`permissions-matrix.md:291-303`, `permissions-matrix.md:438-439`).

**Why it blocks:** The operating contract tells agents to stop on missing permissions; implementing around the gaps creates divergent authorization.

**Smallest fix:** Close the action/state matrix before S2/S3, including provider list/detail, open-request editing, withdraw, reschedule/re-consent, and signed-version replacement. Order request → discovery/interest → site visit → quote. Keep verification writes action-backed.

### B3 — Defect: SSE and voice authorization semantics are not yet implementable as promised

**Evidence:** Reconnect is based on `Last-Event-ID`, while messages are ordered by `(created_at,id)` (`engineering-rules.md:321-331`). There is no shared ordered per-thread event cursor covering messages and reads. A delayed commit can therefore appear behind an already-issued cursor. Separately, playback must check participation “on every request” (`engineering-rules.md:220-221`), but the design uses pre-signed R2 URLs (`engineering-rules.md:165`, `permissions-matrix.md:358-361`); R2 cannot perform that Postgres check.

**Why it blocks:** Missed messages and bearer-URL leakage violate core, non-negotiable behavior.

**Smallest fix:** Add a per-thread event log with a sequence allocated while locking the thread; reconnect by `(thread_id,seq)`, deduplicate by event ID, and treat presence/typing as expiring snapshots. Make unread updates atomic or derive them from monotonic read cursors. Choose either short-lived URLs issued only after authorization, explicitly acknowledging bearer access until expiry, or an authenticated Worker playback endpoint.

### B4 — Defect: production rollback can strand all v3 writes

**Evidence:** The rewrite has no migration (`rewrite-playbook.md:23`), but rollback is DNS back to v2 (`rewrite-playbook.md:402-417`). v2 cannot see contracts, chat, or payments written to the new Postgres database.

**Why it blocks:** After the first real v3 write, DNS rollback is data loss/unavailability by another route.

**Smallest fix:** Prohibit v2 DNS rollback after production writes. Roll back Worker versions and forward-fix; retain v3 emergency access/export and a manual reconciliation runbook. Test this distinction during cutover rehearsal.

## 3. High and medium findings

| ID | Severity/type | Evidence and finding | Smallest fix |
|---|---|---|---|
| H1 | **High / defect** | Publish approval binds only `requestId`, while draft update is a safe write (`README.md:446-463`, `README.md:485-513`). Content can change after proposal yet still pass payload/domain checks. “Immediate” in-flight cancellation is undefined (`README.md:499`), and system execution of approvals conflicts with service actors being barred from user-only actions (`engineering-rules.md:116-117`, `permissions-matrix.md:338-347`). | Bind approval to draft revision/content hash and display that snapshot. Execute approval synchronously as the authenticated human, or define a delegated capability. Use a kill-switch epoch checked before tools and inside commit; report already-committed results rather than claiming undo. |
| H2 | **High / assumption** | The sprint allows 10–15 hours/week (`acquisition-plan.md:60-67`) but demands 100 records, 50 calls, 20 requests, 15 document packages, pricing interviews, and two visits (`acquisition-plan.md:40-52`, `acquisition-plan.md:163-169`). Concierge sends occur, but actual quotes are not an exit signal. | Preserve locked counts, but record actual 24-hour quote responses from the ten manual sends. Timebox a second week or narrow the wedge if behavior contradicts commitments. Reserve verification time separately. |
| H3 | **High / defect** | Hash-chain/OTP rules omit canonical event bytes, chain serialization, and atomic challenge consumption (`README.md:411-417`, `engineering-rules.md:155-162`). Day 9–10 real signing precedes the Week-8 template/stamp-duty checkpoint (`rewrite-playbook.md:157-158`, `legal-and-payments-checklist.md:61-63`). | Specify canonicalization, per-contract locking, genesis/hash formula, unique signature constraints, and atomic `consume where consumed_at is null`. Hash stored certificate bytes too. Do not obtain real acceptance before counsel/stamp clearance. |
| H4 | **High / assumption** | Verification requires document review, reference calls, and technical questions (`verification-rubric.md:82-93`), plus twice-daily queue coverage (`verification-rubric.md:186-197`). At an assumed 30–60 minutes each, 10/50/500 reviews consume roughly 5–10/25–50/250–500 hours, excluding follow-up. | Add queue-arrival and handling-time metrics. Ten to fifty total providers is feasible; a surge beyond 2–4/day or 500 cumulative providers needs delegated operations. |
| H5 | **High / defect** | The cost table’s high case exceeds $200 before Workers usage, then adds a buffer containing channels already counted (`README.md:618-635`). `$600–1,050/10 = $60–105` is arithmetically inconsistent with a stated $250–350 monthly all-in floor (`README.md:637`). | Remove double counting and itemize legal, CA/entity, insurance, support, and Retool/analytics. Three post-launch months cost **$750–1,050**, hence **$75–105 per contract at ten contracts**, before founder/acquisition time. Reprice all channels at current volumes. |
| M1 | **Medium / defect** | Analytics says “No PII” but includes stable user/session/request/contract/thread IDs (`analytics-events.md:9-18`, `analytics-events.md:24-43`). Its signing event includes certificate status although generation is asynchronous (`analytics-events.md:135-145`, `README.md:415-417`). | Describe the feed as pseudonymous/no direct contact or free-text fields; apply access, retention, and deletion mapping accordingly. Derive certificate status operationally or add generate/fail events. |
| M2 | **Medium / defect** | EICAR must quarantine while virus scanning is post-MVP (`engineering-rules.md:277-284`), and DWG/DXF are “previewed” without parsing (`README.md:115-116`). | Either provide a real quarantine scanner or clearly quarantine all unverified active files with safe download headers. Store DWG/DXF and offer metadata/download only, not visual preview. |
| M3 | **Medium / privacy gap** | The sprint collects verification documents before the application’s secure R2 intake exists (`acquisition-plan.md:163-169`, `verification-rubric.md:29-47`). Address revocation cannot retract copies, screenshots, or forwarded text. | During pre-code, collect readiness rather than identity images, or establish an access-controlled intake/deletion register first. Tell customers release controls future views only; provide safety escalation and provider sanctions. |
| M4 | **Medium / defect** | Fifteen to twenty mocked evals are useful seeds, but live-model runs start only after launch (`README.md:523-535`). | Run the same adversarial set against the pinned live model before launch and on model/prompt changes; additionally test parallel calls, stale approval, budget timeout, Hinglish, malicious files, and kill races. |

## 4. Contradiction table

| Document A | Document B | Exact conflict | Resolution |
|---|---|---|---|
| `rewrite-playbook.md:149-160` | `README.md:816-822` | Day 1–10 includes work assigned to Weeks 2–12. | Adopt B1’s narrow skeleton. |
| `README.md:485-495` | `README.md:855-863`; `rewrite-playbook.md:443-451` | Five agent tools are declared, but the contingency cuts them to three. | Remove that contingency; reduce material-line/optional channel work instead. |
| `engineering-rules.md:404-405` | `README.md:137`, `README.md:750` | Performance tests are required before launch while load tests are deferred. | Defer broad load/Lighthouse/axe gates, not two focused SSE/quote performance spikes. |
| `engineering-rules.md:13-18` | `permissions-matrix.md:323`; `verification-rubric.md:5-7` | Every mutation uses actions, but manual SQL may resolve/review records. | SQL is read-only; Retool/scripts invoke action endpoints with step-up, reason, audit, and outbox. |
| `engineering-rules.md:333-334` | `permissions-matrix.md:173-175` | EC61 treats mute like block and denies messages; the matrix lists separate actions. | Mute suppresses notifications only; block denies sends. Explicitly test both. |
| `permissions-matrix.md:79` | `permissions-matrix.md:205`; `AGENTS.md:135-149` | `profile.getOwn` versus tool name `profile.get`. | Use one canonical action name in the matrix and generated registry. |
| `README.md:753-757`, `README.md:796-804` | `README.md:120-137` | Gateway dashboards are used operationally but also described as deferred. | Keep basic token/cost/latency logs; defer fallback, caching, A/B, and custom dashboard work. |
| `README.md:567-574` | `permissions-matrix.md:388-396` | The card offers all active leads, while read tokens are request-scoped and cross-request access is denied. | MVP card is request-scoped; use the authenticated web dashboard for all jobs, or define a separate user-scoped read grant. |

## 5. Answers to §6

### A. Executability and timeline
1. **Conditionally yes.** Assume ≥30 focused engineering hours/week, no additional feature scope, early spikes, and the B1–B4 fixes. AI generation does not remove device testing, review, legal work, or operations.
2. **Chat is most likely to slip 1–2 weeks**, especially reconnect semantics, unread races, and Android/iOS audio. WhatsApp + agent can slip another 1–2 weeks because external approval and adversarial evals converge late (`README.md:818-821`). A combined 2–4-week slip exceeds the two-week buffer unless scope elsewhere is simplified.
3. **No:** move site visits after discovery/interest; build the verification action path before provider quoting; add the event log before SSE UI; add revision binding before agent approval. See B2/B3/H1.
4. **Not alongside the initial sprint, because code is correctly forbidden before its gate** (`acquisition-plan.md:200-218`). It is still unrealistic alongside continuing weekly acquisition and verification (`acquisition-plan.md:222-233`).
5. **Day-10 credibility:** staging SSR/API deploy; repeatable migration and rollback; Google and real phone OTP; active-role/ownership denial tests; one idempotent mutation with audit/outbox; mobile request/photo upload; CI baseline; measured India latency and upload cost; Meta/DLT submitted. No certificate or WhatsApp card is necessary.

### B. Chat, SSE, and voice
1. **Yes at MVP scale after B3**, assuming one stream per open 1:1 thread, roughly 100 concurrent streams, bounded history, 30-second presence heartbeat, typing only while composing, and a measured 1–3-second DB poll. Do not assume `LISTEN/NOTIFY` works through the chosen pooler.
2. **At 100:** likely manageable after the spike. **At 1,000:** naive one-second polling means ~1,000 reads/sec before messages; presence alone is ~33 writes/sec, multiplied by audit/outbox rows. **At 10,000:** ~10,000 poll reads/sec and hundreds of ephemeral writes/sec make DB CPU/WAL/connection pressure the first failure, not voice storage. Typing storms, fanout, unread updates, and reconnect storms amplify it. These are analytical estimates, not vendor benchmarks; throttle/coalesce ephemeral updates and use adaptive polling before considering another transport.
3. **Not fully.** Dedup/idempotency intent is good, but commit ordering, cursor coverage, unread/read races, backward read marks, and mute semantics remain unspecified (B3 and contradiction table).
4. **Affordable at low volume, conditionally sufficient.** Ten MB/two years is inexpensive relative to PITR until abuse or Worker-proxy bandwidth appears. Add per-user/thread quotas, orphan-upload cleanup, actual object validation, duration enforcement, quotas, and a verified codec pair for Android Chrome and iOS Safari (`README.md:659`, `README.md:772-783`).
5. Add delayed-commit/backfill, event eviction/snapshot resync, multi-tab streams, unread-versus-read races, mute notifications, reconnect storm/load, codec/Range playback, signed-link expiry/revocation, spoofed duration/MIME, and orphan cleanup tests.

### C. Contracts, legal, and payments
1. **Yes.** “Electronic acceptance with audit trail” is properly restrained; no admissibility/eSign claim remains (`legal-and-payments-checklist.md:45-63`).
2. **Coherent after H3.** Dual OTP establishes an authentication event; hashes establish consistency only for canonical bytes. A hash chain is not independent proof if an administrator can rewrite events and recompute every hash.
3. The checklist already covers the major stamp/GST/TCS/intermediary/DPDP/consumer issues. Add counsel review of **contract formation/attribution and applicable IT Act exclusions**, separately from BSA s.63, plus provider/customer tax-invoice responsibilities. Clarify who purchases stamping for work versus material contracts.
4. **Honest if implemented exactly as wording-only recordkeeping**: no pay button accepting funds, no Gefifi payee account, and separately invoiced fees (`legal-and-payments-checklist.md:67-82`). Screenshots and confirmations must be labelled unverified evidence, not settlement.
5. Before first real acceptance: final template/version and notices, OTP/phone attribution, stamp workflow, entity/signatory authority, consumer disclosures/grievance flow, privacy/subprocessors/retention, liability/insurance posture, and offline-ledger/fee invoicing—all documented by counsel/CA.

### D. Agent safety
1. **Yes for direct external sends, subject to H1.** Tool scarcity and `HUMAN_ONLY` runtime rejection are strong; draft update/publish binding needs repair.
2. Injection cannot change a server-side allowlist, but it can still induce allowed reads/draft writes or manipulate what a human approves. Treat extracted file/chat text as untrusted data and bind consequential approval to immutable content.
3. **Enforceable server-side:** exclude send from the model registry, reject caller type at runtime, and ensure draft creation writes neither a chat message nor an outbox delivery (`permissions-matrix.md:363-376`). UI warnings are supplementary.
4. Fifteen to twenty conversations are enough as a **seed**, not as a safety case. Deterministic policy/adversarial tests carry the launch burden; add M4’s cases and pre-launch live-model execution.
5. **Incomplete.** Specify abort checkpoints, transaction kill epochs, model-run cancellation, and outcomes for committed/in-flight work. Disabling must prevent new calls; it cannot retroactively erase a committed draft.

### E. Site visits and privacy
1. **Good for future server-side disclosure**, not for information already seen. Keep access out of every request DTO and log each view (`permissions-matrix.md:218-244`).
2. **Yes, providers can retain or forward it.** No expiring link can prevent photography or copying. Provide a plain-language warning, purpose limitation, complaint/safety escalation, and enforceable provider rules rather than technical overclaims (M3).
3. **No:** reschedule needs a transition, fresh time confirmation and release; distinguish customer/provider no-show and abuse/dispute handling (`permissions-matrix.md:266-277`).
4. **Not fully:** B2 state/action gaps, open-request edit parity (`rewrite-playbook.md:250-267`), and the all-leads/token conflict prevent a consistent implementation.

### F. Verification and operations
1. See H4: viable at 10–50 with protected founder time; not solo-scalable to 500 without triage/delegation.
2. Documents and signals are plausible for small Indian firms, and badge distinctions are good (`verification-rubric.md:49-78`). Replace “no cash demands before work” with no **unagreed/off-contract** advance (`verification-rubric.md:84-90`); legitimate signed mobilization/material advances exist. Minimize/crop identity images containing excess data.
3. Week 2–3’s bottleneck is complete-document chasing and reference calls, not queue UI. Secure pre-code intake is also missing (M3).
4. **Yes:** no Aadhaar is compatible with a deliberately limited check using phone, alternate ID, references, business evidence, and bank-name matching. It does not establish assured identity, quality, or safety; copy already mostly respects this.

### G. Acquisition and liquidity
1. **Only with a warm network or substantially more than 20–30 hours** (H2). The plan should measure hours rather than call this generically part-time.
2. With four commitments and eight real requests, **do not code**. Narrow/re-wedge and repeat once with a fixed timebox; persistent failure rejects the acquisition premise rather than triggering an endless succession of one-week extensions.
3. Thirty percent is a useful minimum alarm, not proof of liquidity. Denominator: requests published in a cohort that has had a full seven days to respond, with a minimum cohort such as ten. Also track quotes/request, category mix, and zero-response providers (`analytics-events.md:234-238`). Otherwise very small samples and late quotes cause false pauses.
4. **No formal violation:** code starts only after all exit conditions (`acquisition-plan.md:200-218`). The defect is the unrealistic post-gate Day-10 workload, not secret pre-code work.

### H. Scalability, durability, and cost
1. **Coherent for India**, conditional on actual Mumbai region, Hyperdrive, Worker route, and SSE measurements—not PoP-count claims.
2. **Postgres polling/ephemeral write amplification and DB connections first**, then reconnect fanout; WhatsApp quality/throughput and solo support become business bottlenecks. R2 and Worker CPU are not first unless media is proxied/processed.
3. **Possible at the low case, not demonstrated.** Use H5’s corrected arithmetic and current quotes. Voice storage is unlikely to break the cap; WhatsApp marketing template count and LLM usage need hard per-request caps.
4. **Reasonable target: $75–105 per contract at ten contracts over three months**, excluding founder/acquisition/setup costs. At $250–350 total the prior $60–105 range understates the minimum by $15 per contract.
5. PITR does not restore matching R2 objects, external WhatsApp/email side effects, or v2 DNS state. R2 versioning is not by itself a tested restore process; add DB/object reconciliation, lifecycle/deletion tests, external-side-effect replay rules, and the B4 restriction (`README.md:654-661`).

### I. Permissions, edge cases, and testing
1. Missing: provider discovery/detail, open-request edit, withdrawal/reschedule/revision transitions, explicit upload-complete, unblock, and coherent all-leads access.
2. The same-account controls are strong: current active role/status, self-dealing blocks, request-scoped tokens, OTP mutation step-up, and agent caller rejection (`permissions-matrix.md:417-465`). A forwarded bearer read link is still possession-based, and different-account self-dealing needs verification/duplicate detection; these are residual assumptions.
3. Breadth is good, but add B3, H1, unread/mute, post-signature revision, magic-link job-scope, and retention/R2 restore tests.
4. **Realistic once stabilized**, provided preview deployment is not counted as a synchronous <5-minute test gate and quarantined flakes are actively fixed (`README.md:701-726`). Playbook’s early every-PR integration/eval description should align with the later fast/nightly split (`rewrite-playbook.md:125-134`, `rewrite-playbook.md:421-428`).
5. First add the delayed-commit SSE test and the “draft changes between proposal and approval” test; they expose defects ordinary happy paths miss.

### J. Contradictions and stale assumptions
1. See §4. These are implementation-affecting, not editorial nits.
2. “WhatsApp conversations” is stale pricing terminology against the earlier verified per-message model (`README.md:628`; `docs/plan-review/external/2026-11-03-agent-review.md:130`). The Day-10 super-skeleton and cost-per-contract arithmetic are also inherited assumptions, now contradicted by the revised sequencing/math.
3. No deferred feature is inherently on the critical path **if** SQL is read-only, Retool calls actions, CAD preview becomes download-only, and Gateway monitoring stays basic. Otherwise custom admin work and dashboard work quietly return.
4. **Yes:** the roadmap’s three-tool agent cut violates the locked five-tool decision. Remove it; the full chat/voice “never cut” rules have no equivalent contradiction.

### K. What would you change?
1. Keep chat/voice and all five tools. Simplify material quotes to one amount plus notes under pressure; use Retool/actions; drop visual CAD preview, optional email, and all-active-leads mobile cards before touching locked scope.
2. Add B3’s event model, H1’s content-bound approvals, secure document intake, an actual quote-response baseline, legal-before-real-signing, and R2/PITR reconciliation.
3. Spike SSE reconnect/delayed commit and Android/iOS voice in Week 1, not Week 6; manually pilot ten leads before code.
4. Postpone all-active-leads cards, signature-time attachments, and any nonessential notification channel. Do not postpone safety, permission, restore, or pinned-model tests.

## 6. Revised sequence and timeline

| Weeks | Change |
|---|---|
| −2–0 | Existing locked acquisition gate, plus measured responses to ten manual leads; no code. |
| 1 | Narrow walking skeleton plus SSE/voice feasibility spikes; Meta/DLT/counsel started. |
| 2–3 | Foundation, action-backed verification, discovery prerequisites. |
| 4–5 | Requests → discovery/interest → site visits → quotes/acceptance. |
| 6–8 | Full chat/voice, now three weeks rather than two; no parallel feature phase. |
| 9–11 | Contracts/milestones with legal template frozen before any real acceptance. |
| 12–14 | WhatsApp + five-tool agent, now three weeks; threat/eval gates complete. |
| 15 | Minimal admin, security/UAT; admin UI remains Retool where possible. |
| 16 | Production readiness and restore/rollback rehearsal. |
| 17–18 | Reserved pre-launch buffer, then staged launch—not pre-labelled post-launch feature work. |
| 19–20 | Slip allowance only; if consumed earlier, explicitly reset the launch date rather than silently compressing tests. |

## 7. Top 5 risks

| Risk | Likelihood/impact | Mitigation |
|---|---|---|
| Apparent supply does not quote | High / launch-ending | Behavioral concierge evidence, cohort metrics, weekly acquisition (H2/G3). |
| Chat correctness and device incompatibility | High / core-scope failure | Week-1 SSE/audio spikes; event sequence and race tests (B3). |
| Total solo workload exceeds capacity | High / 2–4+ week slip | Reserve operations hours, simplify nonlocked scope, use revised sequence (A2/H4). |
| Unauthorized disclosure or manipulated approval | Medium / customer harm | Action-backed admin, content-bound approvals, residual address warnings (H1/M3). |
| Legal/external/vendor delay | Medium-high / launch blocked | No real signing before clearance; current Meta/DLT/vendor quotes and working web/phone fallback (H3/H5). |

## 8. Go/no-go conditions before Week 1

1. Locked city/categories and 100/10/20 gate are evidenced; ten manual leads have been dispatched and observed.
2. Founder calendar shows at least 30 build hours and separately funded acquisition/verification/support hours each week.
3. B1/B2 decisions and the five-tool cut-list conflict are reconciled in the execution baseline.
4. Counsel/CA, secure document intake, verification owner, budget/runway, and current infra/channel quotes are confirmed; real signing is explicitly gated.
5. Meta/DLT applications can start immediately, and phone/web/manual fallback can operate without approved WhatsApp templates.

## 9. What you would test first

1. **Concierge pilot:** ten real matched leads; actual quotes within 24 hours, category/area, provider handling time, and customer willingness to proceed.
2. **SSE adversarial spike:** two delayed-commit senders, reconnect/cursor/backfill, reconnect bursts, and 100→1,000 short-lived scale checkpoints while measuring DB reads/writes/connections.
3. **Budget-device media/card spike:** Android Chrome and iOS Safari recording/playback, 4G interruption/resume, codec support, R2 expiry, request-scoped magic links, and step-up OTP.
4. **Contract transaction suite:** concurrent accepts, concurrent OTP consumption, revision between OTP issue/signing, certificate retry, and chain-fork attempts.
5. **Agent race/injection suite:** malicious PDF instructions, draft mutation after proposal, stale approval, direct send attempts, and kill before tool start/between commit and response.

## 10. Assumptions to verify

- **Founder capacity:** measured weekly engineering/operations hours, runway, and sustainable 24-hour support/verification coverage.
- **Usage model:** actual concurrent open streams, messages/sec, typing/heartbeat rates, voice count/average bytes, and WhatsApp messages/request. Scale numbers above depend on these inputs.
- **Cloudflare:** current SSE duration/concurrency and billing behavior, Smart Placement/latency, Hyperdrive connection/query limits, Queues retries/DLQs, and R2 signed-URL/Range/versioning semantics.
- **Supabase:** Mumbai availability, actual PITR price/retention/RPO, restore time for a seeded production-like database, connection ceiling, and backup behavior/timing.
- **Channels:** current Meta per-template-message rates and category approval for lead alerts; STOP policy; SMS DLT/provider price and OTP P95 on Jio/Airtel/Vi; final LLM token/latency budget.
- **Legal/finance:** counsel-confirmed electronic-formation applicability/exclusions, acceptance wording, stamp implementation by contract kind, GST/TCS/194-O and invoices even without fund custody, DPDP commencement/processors/breach/retention, intermediary and consumer obligations, and insurance posture.
- **Privacy/security:** actual bearer-link behavior, signed playback expiry, document redaction/minimization, low-end browser codecs, malicious-upload handling, and deletion/legal-hold interaction for R2 plus PITR backups.

## 11. Confidence and limitations

Confidence is **high** on documentary contradictions, **medium** on data/authorization failure modes, and **low-to-medium** on the schedule, market response, scale breakpoints, and cost until the stated spikes and quotes exist. I reviewed the required revised documents and the first review only after recording independent findings. I did not review Plan B, inspect a v3 implementation (none was supplied here), run infrastructure benchmarks, test devices, access acquisition evidence or vendor dashboards, or obtain Indian legal advice. Nothing here determines enforceability or statutory compliance; those remain counsel/CA decisions.
