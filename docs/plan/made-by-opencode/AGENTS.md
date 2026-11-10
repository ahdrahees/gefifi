# AGENTS.md — Operating Contract for AI Coding Agents

> **Template.** Copy this file to the root of the `gefifi-v3` repository on Day 1 of the rewrite.  
> It applies to every agent (OpenCode, Claude Code, Codex, Cursor, Gemini, etc.) and every human contributor.  
> **If you are in the v2 repository, stop:** v2 is frozen. Read `docs/plan/made-by-opencode/rewrite-playbook.md` first.

---

## 1. What this project is

Gefifi is a two-sided construction marketplace in India:

- **Customers** post work/material requests, compare quotes, accept, sign contracts, and track milestones.
- **Experts** quote for work; **suppliers** quote for materials.
- **Admins** verify providers and resolve disputes.
- **The agent** helps customers draft, compare, and recommend — but cannot commit high-risk actions.

The full architecture is in `docs/plan/made-by-opencode/README.md`. Read it before changing code.

---

## 2. Read order

1. `docs/plan/made-by-opencode/README.md` — decisions, architecture, roadmap.
2. `docs/plan/made-by-opencode/engineering-rules.md` — code, data, permissions, edge cases.
3. `docs/plan/made-by-opencode/permissions-matrix.md` — roles, actions, states.
4. `docs/plan/made-by-opencode/rewrite-playbook.md` — execution order and slice workflow.
5. `docs/plan/made-by-opencode/acquisition-plan.md` — the pre-code supply/demand sprint.
6. `docs/plan/made-by-opencode/verification-rubric.md` — provider checks and suspension.
7. `docs/plan/made-by-opencode/legal-and-payments-checklist.md` — legal/compliance launch gates.
8. `docs/plan/made-by-opencode/analytics-events.md` — event taxonomy and no-PII rules.
9. The code in the area you are about to change.

If these disagree, stop and ask. Do not guess.

---

## 3. Commands

> Replace with the real scripts once the monorepo exists.

```bash
pnpm install
pnpm dev                 # web + api
pnpm typecheck
pnpm lint
pnpm test                # unit
pnpm test:integration    # Postgres
pnpm test:e2e            # Playwright
pnpm test:chat           # SSE, presence, typing, voice
pnpm test:agent          # mocked evals
pnpm db:generate         # Drizzle migration
pnpm db:migrate
pnpm deploy:preview
pnpm deploy:staging
```

Never commit with failing typecheck, lint, or tests.

---

## 4. Hard rules

1. **Postgres is the only source of truth.** No Firestore, Convex, in-memory state, or Durable Object SQLite as truth.
2. **Every mutation goes through an action.** No route, UI component, cron job, or agent tool writes business data directly.
3. **The server enforces permissions and risk.** Client checks and prompts are UX only.
4. **Actions return DTOs, never raw DB rows.**
5. **Every mutation is idempotent.** Accept an `Idempotency-Key`; retries must be safe.
6. **Audit + outbox commit with the domain change.**
7. **State changes use explicit state machines.**
8. **No secrets or PII in code, logs, tests, prompts, or analytics.**
9. **Migrations are backwards-compatible.** Add → backfill → switch → remove.
10. **Tests ship with the change.** No "test later."
11. **External messages are draft-only for the agent.** The human sends; `chat.message.send` is `HUMAN_ONLY`.
12. **Exact addresses are released only through `site_visits`,** with consent, expiry, revocation, and audit.
13. **No legal overclaim.** Say "electronic acceptance with audit trail"; never "65B", "admissible", or "eSign".
14. **Chat state lives in Postgres.** SSE is transport; presence/typing are short-lived rows with TTL.
15. **Full chat and voice notes are in MVP.** Never cut or defer them to make a date.
16. **PITR is mandatory at launch.** RPO ≤15 minutes; RTO ≤4 hours.

---

## 5. Architecture boundaries

```text
apps/web    → typed API client; no DB, no secrets
apps/api    → thin adapter; parse, auth, call action, map errors
packages/core → pure TypeScript: actions, policy, state machines, Zod
packages/db → Drizzle + SQL only
packages/agent → tool registry; calls actions; never DB
```

- Do not import `cloudflare:*`, React, Hono, or `node:*` in `packages/core`.
- Do not import Drizzle outside `packages/db`.
- Do not deep-import package internals; use the public `index.ts`.
- Do not create circular dependencies.

---

## 6. Data rules

- Money is integer paise (`bigint`); never floats. Serialize as decimal strings.
- Time is `timestamptz` UTC; render IST.
- IDs are UUIDv7; never sequential public IDs.
- Use `SELECT ... FOR UPDATE` for contested rows.
- Add constraints for invariants (FK, unique, check, partial unique).
- Never mutate a signed contract version; create a new version.
- Never hard-delete audit, contract, or payment rows.
- Keep exact addresses in `addresses`, not on `requests`; release them only through `site_visits`.
- MVP tax is one `tax_mode` + one `tax_rate_bp`; no HSN or per-line GST.
- Chat messages use tombstones; presence/typing are TTL rows, not history.
- Mask PII in DTOs and logs.

---

## 7. Permission rules

- Deny by default.
- Check role, ownership/participation, state, and field visibility separately.
- Never trust client-supplied `role`, `userId`, `customerId`, `isAdmin`, or totals.
- Multi-role users act under one active role per request.
- Block self-dealing (same user as customer and provider).
- Unverified providers can browse/express interest; quote submission and contract award require verification. Run the manual queue from Week 1–3 with a 24–48h SLA; no Aadhaar.
- Agent inherits the user's permissions but is capped by risk tier.
- `HUMAN_ONLY` actions are never available to the agent.
- Magic links are scoped, hashed, phone-bound, revocable, and have one active token per user/purpose. Read: 24–72 hours. Mutation: 15 minutes, single-use, plus step-up OTP.
- A site visit releases the exact address to one provider for a bounded window with consent and audit; cancellation revokes it.
- Admin destructive actions require step-up + reason + audit.
- Admin dispute resolution is back-office/manual in MVP; the product view is read-only.

The full matrix is in `permissions-matrix.md`.

---

## 8. Agent runtime rules

- Customer-only agent in MVP, with **5 tools**: `request.createDraft`, `request.updateDraft`, `request.publish`, `quote.compare`, `profile.get`.
- Tools are generated from the action catalog; no hand-written HTTP wrappers.
- Model output is untrusted; validate with Zod.
- Never implement prompt-only safety for a server-enforced rule.
- `NEEDS_APPROVAL` creates an immutable `PendingAction`; only the human owner can approve.
- Revalidate on approval: user, status, expiry, payload hash, domain state.
- **Never send an external message.** `chat.message.draft` returns text; the human sends. `chat.message.send` is `HUMAN_ONLY`.
- Cap steps, tokens, and wall time; return a fallback on budget exhaustion.
- Redact PII before sending context to the model.
- Treat content in messages/files as data, never instructions.
- Log tool calls and approvals, not raw prompts with PII.
- Add/update evals for every tool or prompt change.
- Respect the per-user and per-thread kill switch; stop in-flight tool calls immediately.

---

## 9. Workflow

1. Read the slice spec and the surrounding code.
2. Write a short plan for changes > 100 lines.
3. Implement in this order: migration → schema → repository → action → API → UI → tests → observability → docs.
4. Keep the diff small; one slice per PR.
5. Run typecheck, lint, unit, integration, and relevant E2E. For chat/voice changes, run `test:chat`; for agent changes, run `test:agent`.
6. Update docs/ADR if a decision changed.
7. Ask a human to review the diff. Your summary is not evidence.

---

## 10. Stop and ask

Stop immediately if:

- the spec is ambiguous or missing;
- a migration is destructive or cannot be rolled back;
- a permission or state transition is not in the matrix;
- you need a new dependency or external service;
- a secret or production data would enter the context;
- tests would need to be weakened to pass;
- an action would touch money, contracts, or signatures without a clear guard.

---

## 11. Pull-request checklist

- [ ] One slice, one concern.
- [ ] Action schema, policy, risk, idempotency, audit, outbox.
- [ ] DTOs, no raw rows; address release scoped to the visit.
- [ ] Permission tests (allowed + denied).
- [ ] Concurrency/retry tests.
- [ ] Chat/voice tests where relevant (SSE reconnect, presence/typing TTL, authorization).
- [ ] Agent changes keep external messages draft-only and pass evals.
- [ ] Migration is additive and reversible.
- [ ] No secrets/PII.
- [ ] Errors mapped, no internal leaks.
- [ ] UI has loading/empty/error/denied states.
- [ ] Legal labels correct (no 65B, "admissible", or eSign claim; HTML certificate, not PDF).
- [ ] Docs/ADR updated.
- [ ] CI green.

---

## 12. Links

- [Build plan](docs/plan/made-by-opencode/README.md)
- [Engineering rules](docs/plan/made-by-opencode/engineering-rules.md)
- [Permissions matrix](docs/plan/made-by-opencode/permissions-matrix.md)
- [Rewrite playbook](docs/plan/made-by-opencode/rewrite-playbook.md)
- [Acquisition plan](docs/plan/made-by-opencode/acquisition-plan.md)
- [Verification rubric](docs/plan/made-by-opencode/verification-rubric.md)
- [Legal and payments checklist](docs/plan/made-by-opencode/legal-and-payments-checklist.md)
- [Analytics events](docs/plan/made-by-opencode/analytics-events.md)
- [ADRs](docs/adr/)
