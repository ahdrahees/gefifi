# AGENTS.md — V2 Demo Repo Contract (Track 1 active)

This repo is on **Track 1: V2 contractor demo**. Track 2 (V3 rewrite) is parked.

## Read order

1. `docs/demo/DEMO-PLAN.md` — the active plan. Start here.
2. The code in the area you are about to change.

Do not load `docs/plan/made-by-opencode/` by default. Those 10 V3 files are parked reference for Track 2 only. Load one only when the task explicitly says `Track 2`.

## Hard rules

- Reuse the V2 stack: SvelteKit, Express routes in `backend/src/routes/`, Firestore, Python ADK in `agents/build_assist_agent/`. No new framework, DB, or auth provider without a written decision.
- Every mutation goes through an Express route with `authenticateToken`. No direct DB writes from UI or agent. Agent produces drafts; a human confirms before publish/accept/sign.
- No secrets, Aadhaar, or real PII in prompts, logs, tests, or commits.
- Small slices, tests with the change, demo after each slice.
- V3 hard rules (`docs/plan/made-by-opencode/AGENTS.md`) do not apply here — that file is a template for the future `gefifi-v3` repo.

## Stop and ask

Ambiguous spec, unclear permission, new dependency, destructive change, or anything beyond contract draft. Stop, do not guess.
