# Gefifi V2 Demo — Contractor MVP (Track 1, active)

> **Active track.** 8–12 weeks, demo to 3 construction contractors. Build on V2, no rewrite, no new stack.
> V3 rewrite is parked: `../plan/made-by-opencode/OPERATING-PLAN.md`. Do not load V3 docs for demo work.

## 1. Goal

Present a working V3-feel demo on the V2 codebase: a contractor describes a job in chat (text + photos/voice), the agent drafts the work/material request, a human confirms, quotes get compared, a contract draft is produced. Less form-filling, same V2 backend.

## 2. Non-goals for the demo

No Postgres, no Cloudflare Workers, no React rewrite, no new auth, no escrow, no eSign change, no 100-provider sprint, no multi-city launch. V2 stack stays: SvelteKit (`src/frontend/`), Express (`backend/src/routes/`), Firestore, Python ADK (`agents/build_assist_agent/`).

## 3. Success

3 demos, 1 real project each. Per demo: chat → draft request → human confirm → publish → 2+ quotes → compare → contract draft. Demo data resets. No raw DB writes from UI/agent — everything through existing Express routes.

## 4. What already exists (reuse, don't rebuild)

- Requests: `backend/src/routes/work-requests.ts`, `material-requests.ts`
- Quotes/contracts/chat/files: `quotes.ts`, `contracts.ts`, `contracts-signing.ts`, `chat.ts`, `attachments.ts`
- Agent: `agents/build_assist_agent/agent.py`, `sub_agents/customer_agent.py`, `expert_agent.py`, `supplier_agent.py`, `tools/expert_request.py`, `material_request.py`, `quote.py`, `contract.py`, `chat.py`
- Frontend: `src/frontend/src/`, auth store, chat UI

## 5. Stages

| Weeks | Deliverable | Evidence |
|---|---|---|
| 1–2 | Demo script locked: 3 contractors named, 1 project each, photos/docs sample, done-criteria per demo | One-page script per contractor committed here |
| 3–6 | Agent-first create: chat drafts `expert_request`/`material_request` from text + photos, human confirms before publish | Draft → confirm → publish works on staging with existing routes; no direct DB writes |
| 7–9 | Quote compare + contract draft: agent summarizes quotes, human accepts, contract draft via existing `contracts.ts` | 2 quotes → compare → draft on staging; auth/role checks pass |
| 10–12 | Demo hardening: login/roles, Firestore rules, seed/reset script, offline fallback, dry run | 3 dry runs recorded; reset works; no PII in logs |

## 6. Agent rules for this repo

1. Default load: this file + the code you touch. Nothing else.
2. Do not load `docs/plan/made-by-opencode/` unless the task says `Track 2`.
3. Reuse V2 routes and ADK tools; no new framework, no new DB, no new auth provider without a written decision.
4. Every mutation through Express routes with `authenticateToken`; agent produces drafts, human confirms.
5. No secrets/PII in prompts, logs, or commits. No Aadhaar.
6. Small slices, tests with the change, demo after each slice.

## 7. Stop and ask

Spec ambiguous, permission unclear, new dependency, migration/destructive change, or anything touching money/contracts beyond draft. Stop, do not guess.
