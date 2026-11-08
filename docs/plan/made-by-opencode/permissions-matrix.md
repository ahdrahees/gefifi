# Gefifi v3 — Permissions & State Matrix

> **Purpose:** The single reference for who can do what, on which entity, in which state, through which channel.  
> **Rule:** If an action is not in this matrix, it is denied by default. Add it here before implementing it.  
> **Companions:** [README.md](README.md), [engineering-rules.md](engineering-rules.md), [rewrite-playbook.md](rewrite-playbook.md), [AGENTS.md](AGENTS.md).

---

## 1. Actors

| Actor | Description | Auth |
|---|---|---|
| **Guest** | Not signed in. Can view public pages, start login, submit a contact/lead form. | None |
| **Customer** | Posts requests, compares quotes, accepts, signs, confirms milestones. | Session |
| **Expert** | Provides labour/work; browses matching requests, expresses interest, quotes, signs, requests milestones. | Session or magic link |
| **Supplier** | Provides materials; browses material requests, quotes with line items, signs, requests milestones. | Session or magic link |
| **Admin** | Verification, suspension, category management, read-only disputes/audit. | Session + admin role + step-up |
| **Support** | Read-only customer support view; no mutations. | Session + support role |
| **Agent** | In-app assistant acting **on behalf of** an authenticated user. Capped by action risk tier. | User session |
| **External MCP client** | Third-party agent acting on behalf of a user with explicit OAuth scopes. Post-MVP. | OAuth |
| **Magic link** | Passwordless, scoped token for a supply user's card. | Hashed token |
| **Service** | Cron, outbox worker, WhatsApp webhook. Explicit scopes; never impersonates a user. | Internal signature/secret |

A user may hold multiple roles. **One active role per request**; the server validates it.

---

## 2. Authorization layers

Every action passes through all layers, in order:

```text
1. Authenticated?            → 401 if not
2. Active role allowed?      → 403 if not
3. Ownership/participation?  → 404 (preferred) or 403
4. Entity state allows it?   → 409
5. Field-level visibility?   → masked/omitted
6. Risk tier allows caller?  → 403 or PendingAction
7. Rate limit / budget?      → 429
8. Step-up required?         → 401/403 with challenge
9. Execute in a transaction
10. Audit + outbox
```

**Never** rely on:

- a hidden button or route guard;
- a client-supplied `role`, `userId`, `customerId`, or `isAdmin`;
- an LLM's judgement;
- a token's claims without checking the current user status and role;
- a UI filter to hide another user's data.

---

## 3. Symbol legend

| Symbol | Meaning |
|---|---|
| `—` | Not allowed |
| `R` | Read-only |
| `O` | Owner only (the entity belongs to the actor) |
| `P` | Participant only (party to the request/contract/thread) |
| `A` | Allowed with a domain guard (state, verification, etc.) |
| `H` | Human only; agent is blocked |
| `S` | Step-up authentication required |
| `⚠` | Agent requires a `PendingAction` approval |
| `✓` | Allowed (admin/service) |

---

## 4. Action matrix

### 4.1 Identity, profile, consent

| Action | Guest | Customer | Expert | Supplier | Admin | Agent | Guard |
|---|---|---|---|---|---|---|---|
| `auth.login` | ✓ | ✓ | ✓ | ✓ | ✓ | — | Rate limited |
| `auth.logout` | — | ✓ | ✓ | ✓ | ✓ | — | Own session |
| `profile.getOwn` | — | ✓ | ✓ | ✓ | ✓ | R | Own user |
| `profile.updateOwn` | — | ✓ | ✓ | ✓ | ✓ | — | Own user; validated fields |
| `role.switch` | — | ✓ | ✓ | ✓ | ✓ | — | Role must be held |
| `consent.record` | — | ✓ | ✓ | ✓ | ✓ | — | Own user; versioned |
| `consent.withdraw` | — | ✓ | ✓ | ✓ | ✓ | — | Own user; legal retention |
| `user.requestDeletion` | — | ✓ | ✓ | ✓ | ✓ | — | Own user; retention rules |
| `user.exportData` | — | ✓ | ✓ | ✓ | ✓ | — | Own user; rate limited |
| `user.reportAbuse` | — | ✓ | ✓ | ✓ | ✓ | — | Any authenticated user |

### 4.2 Requests

| Action | Guest | Customer | Expert | Supplier | Admin | Agent | Guard |
|---|---|---|---|---|---|---|---|
| `request.createDraft` | — | O | — | — | — | ✓ | Customer; valid category/location |
| `request.updateDraft` | — | O | — | — | — | ✓ | Draft only |
| `request.publish` | — | O | — | — | — | ⚠ | Draft; completeness; not expired |
| `request.cancel` | — | O | — | — | ✓ | — | No accepted quote; or via contract cancel |
| `request.expire` | — | — | — | — | — | — | Service only; expiry date passed |
| `request.browseOwn` | — | O | — | — | ✓ | R | Own requests; paginated |
| `request.get` | — | O | P | P | ✓ | R | Owner, invited/interested provider, or admin |
| `request.inviteProvider` | — | O | — | — | — | — | Own request; provider active/verified |
| `request.interest.express` | — | — | A | A | — | — | Open request; not own; rate limited |
| `request.interest.withdraw` | — | — | O | O | — | — | Own interest; before acceptance |
| `request.attachment.add` | — | O | — | — | — | — | Draft/open; upload policy |
| `request.attachment.remove` | — | O | — | — | — | — | Draft/open; audit |

### 4.3 Quotes

| Action | Guest | Customer | Expert | Supplier | Admin | Agent | Guard |
|---|---|---|---|---|---|---|---|
| `quote.submit` | — | — | A | A | — | — | Request open; verified provider; not own request; no duplicate active quote |
| `quote.revise` | — | — | O | O | — | — | Own quote; request open; new version |
| `quote.withdraw` | — | — | O | O | — | — | Own quote; not accepted |
| `quote.compare` | — | O | — | — | ✓ | R | Own request; masked provider contact |
| `quote.accept` | — | O | — | — | — | H | Own request; quote submitted/under_review; not expired; atomic |
| `quote.reject` | — | O | — | — | — | — | Own request; not accepted |
| `quote.expire` | — | — | — | — | — | — | Service only; validity passed |

### 4.4 Contracts

| Action | Guest | Customer | Expert | Supplier | Admin | Agent | Guard |
|---|---|---|---|---|---|---|---|
| `contract.draft` | — | O | — | — | — | ⚠ | Accepted quote; total matches; both parties verified |
| `contract.updateDraft` | — | O | — | — | — | — | Draft only; new version |
| `contract.requestRevision` | — | P | P | P | — | — | Before signing; comment required |
| `contract.sign` | — | P | P | P | — | H | Current version; OTP; party; not already signed |
| `contract.cancel` | — | P | P | P | ✓ | — | Pre-sign or mutual; reason; audit |
| `contract.get` | — | P | P | P | ✓ | R | Participant; masked fields |
| `contract.downloadCertificate` | — | P | P | P | ✓ | — | Signed contract only |
| `contract.link` | — | O | — | — | ✓ | — | Same customer; visibility rule |

### 4.5 Milestones and payments

| Action | Guest | Customer | Expert | Supplier | Admin | Agent | Guard |
|---|---|---|---|---|---|---|---|
| `milestone.create` | — | O | — | — | — | — | Draft contract; sum = total |
| `milestone.update` | — | O | — | — | — | — | Draft only |
| `milestone.requestPayment` | — | — | P | P | — | — | Contract signed/in progress; sequence |
| `milestone.markPaid` | — | P | — | — | — | H | Customer only; reference + evidence |
| `milestone.confirmReceipt` | — | — | P | P | — | H | Provider only; paid state |
| `milestone.dispute` | — | P | P | P | — | — | Paid/requested; reason |
| `payment.record` | — | O | — | — | ✓ | — | Offline reference; immutable ledger |
| `payment.flag` | — | P | P | P | ✓ | — | Duplicate/mismatch; audit |

### 4.6 Chat and files

| Action | Guest | Customer | Expert | Supplier | Admin | Agent | Guard |
|---|---|---|---|---|---|---|---|
| `chat.thread.get` | — | P | P | P | R | R | Participant; masked contact |
| `chat.message.send` | — | P | P | P | — | ✓ | Participant; content filter; labelled if agent |
| `chat.message.deleteOwn` | — | O | O | O | — | — | Sender only; tombstone |
| `chat.attachment.upload` | — | P | P | P | — | — | Participant; upload policy |
| `chat.thread.mute` | — | P | P | P | — | — | Participant |
| `file.download` | — | O | P | P | R | — | Owning entity; signed URL |
| `file.deleteOwn` | — | O | O | O | — | — | Unattached only; audit |

### 4.7 Admin

| Action | Guest | Customer | Expert | Supplier | Admin | Agent | Guard |
|---|---|---|---|---|---|---|---|
| `admin.provider.verify` | — | — | — | — | S | — | Pending docs; reason |
| `admin.provider.reject` | — | — | — | — | S | — | Reason required |
| `admin.user.suspend` | — | — | — | — | S | — | Reason; revoke sessions |
| `admin.user.reinstate` | — | — | — | — | S | — | Reason |
| `admin.category.manage` | — | — | — | — | S | — | Audit |
| `admin.dispute.view` | — | — | — | — | R | — | Read-only |
| `admin.dispute.resolve` | — | — | — | — | S | — | Reason; audit |
| `admin.audit.view` | — | — | — | — | R | — | PII masked |
| `admin.impersonate` | — | — | — | — | S | — | Consent + banner + time limit |

### 4.8 Agent and approvals

| Action | Guest | Customer | Expert | Supplier | Admin | Agent | Guard |
|---|---|---|---|---|---|---|---|
| `agent.thread.start` | — | O | — | — | — | ✓ | Customer only in MVP |
| `agent.message.send` | — | O | — | — | — | ✓ | Own thread; budget/rate limit |
| `agent.action.execute` | — | — | — | — | — | ✓ | Must map to an action + risk tier |
| `pendingAction.approve` | — | O | — | — | — | — | Owner; not expired; hash match |
| `pendingAction.reject` | — | O | — | — | — | — | Owner; pending |
| `pendingAction.list` | — | O | — | — | — | — | Own actions |

### 4.9 Service

| Action | Guest | Customer | Expert | Supplier | Admin | Service | Guard |
|---|---|---|---|---|---|---|---|
| `outbox.process` | — | — | — | — | — | ✓ | Scoped worker; idempotent |
| `job.run` | — | — | — | — | — | ✓ | Scoped cron; idempotent |
| `notification.send` | — | — | — | — | — | ✓ | Template + opt-in |
| `whatsapp.webhook` | — | — | — | — | — | ✓ | Signature + replay protection |

---

## 5. Field-level visibility

| Field | Guest | Counterparty before contract | Counterparty after contract | Admin | Agent |
|---|---|---|---|---|---|
| Display name | Public | Full | Full | Full | Full |
| Phone | — | Masked (`98****3210`) | Full | Full (logged) | Masked |
| Email | — | Masked | Full | Full (logged) | Masked |
| Exact address | — | Approximate area only | Full | Full (logged) | Masked |
| Geo point | — | Approximate (neighbourhood) | Full | Full | — |
| Request budget | — | Published budget only | Published budget only | Full | Published budget only |
| Quote amount (own) | — | Full | Full | Full | Full (own request) |
| Competing quotes | — | — | — | Full | Summary only, no identity |
| Contract terms | — | — | Full | Full (logged) | Summary only |
| Signature/OTP data | — | — | Own signature | Full (logged) | — |
| Payment reference | — | — | Participants | Full (logged) | — |
| Verification docs | — | — | — | Full (logged) | — |
| Audit log | — | — | — | Read-only | — |
| Internal notes | — | — | — | Full | — |
| Consent records | — | — | Own | Full (logged) | — |
| WhatsApp opt-in | — | — | Own | Full | — |

**Rule:** masking happens in the DTO layer. A hidden field must not be serialized at all, not merely hidden in the UI.

---

## 6. State-transition matrix

### 6.1 Request

| From | To | Who | Guard |
|---|---|---|---|
| `draft` | `open` | Customer owner | Complete, not expired, category valid |
| `draft` | `cancelled` | Customer owner | — |
| `open` | `under_review` | Customer owner / system | At least one quote or interest |
| `open`/`under_review` | `contracted` | System | Quote accepted atomically |
| `contracted` | `in_progress` | System | Contract signed |
| `in_progress` | `completed` | Customer owner | Milestones confirmed |
| `open`/`under_review` | `expired` | System | Expiry passed |
| `open`/`under_review` | `cancelled` | Customer owner | No accepted quote |
| `contracted`/`in_progress` | `disputed` | Either party | Dispute opened |
| `disputed` | `completed`/`cancelled` | Admin | Resolution recorded |

### 6.2 Quote

| From | To | Who | Guard |
|---|---|---|---|
| `draft` | `submitted` | Provider owner | Request open; verified; valid total |
| `submitted` | `under_review` | Customer / system | Customer opened comparison |
| `submitted`/`under_review` | `accepted` | Customer owner | Not expired; atomic; one per request |
| `submitted`/`under_review` | `rejected` | Customer owner / system | On accept or explicit reject |
| `submitted`/`under_review` | `expired` | System | Validity passed |
| `submitted` | `superseded` | Provider owner | Revision creates new version |
| `accepted` | — | — | Terminal; contract created |

### 6.3 Contract

| From | To | Who | Guard |
|---|---|---|---|
| `draft` | `awaiting_signatures` | Customer owner | Both parties verified; total matches quote |
| `draft` | `revision_requested` | Either party | Comment required |
| `revision_requested` | `draft` | Customer owner | New version created |
| `awaiting_signatures` | `signed` | Both parties | Both signatures on current version |
| `signed` | `in_progress` | System | Work started |
| `in_progress` | `completed` | Customer owner | Milestones confirmed |
| `draft`/`awaiting_signatures` | `cancelled` | Either party / admin | Reason; no signatures or mutual |
| `signed`/`in_progress` | `disputed` | Either party | Reason |
| `disputed` | `terminated`/`cancelled` | Admin | Resolution |

### 6.4 Milestone

| From | To | Who | Guard |
|---|---|---|---|
| `pending` | `requested` | Provider participant | Contract signed/in progress; sequence |
| `requested` | `paid` | Customer participant | Reference/evidence; amount ≤ remaining |
| `paid` | `confirmed` | Provider participant | Receipt confirmed |
| `pending`/`requested`/`paid` | `disputed` | Either party | Reason |
| `disputed` | `paid`/`confirmed`/`cancelled` | Admin | Resolution |

### 6.5 Dispute

| From | To | Who | Guard |
|---|---|---|---|
| `open` | `under_review` | Admin | Assign/reason |
| `under_review` | `resolved` | Admin | Resolution note |
| `resolved` | `closed` | System/Admin | Both parties notified |

### 6.6 Provider verification

| From | To | Who | Guard |
|---|---|---|---|
| `unverified` | `pending` | Provider owner | Documents uploaded |
| `pending` | `verified` | Admin | Documents valid; reason |
| `pending` | `rejected` | Admin | Reason; provider may resubmit |
| `verified` | `suspended` | Admin | Reason; revoke quote ability |
| `suspended` | `verified` | Admin | Reason |

### 6.7 PendingAction

| From | To | Who | Guard |
|---|---|---|---|
| `pending` | `approved` | Action owner | Not expired; hash match; revalidated |
| `pending` | `rejected` | Action owner | — |
| `pending` | `expired` | System | 15 minutes elapsed |
| `approved` | `executed` | System | Idempotent; single use |
| `approved` | `failed`/`stale` | System | Domain changed; error recorded |
| `pending` | `stale` | System | Revalidation failed |

---

## 7. Channel rules

### 7.1 Web/PWA

- Session cookie, `HttpOnly`, `Secure`, `SameSite=Lax`.
- CSRF token on mutations.
- Server-rendered route guards are UX only; the action still re-checks.
- No sensitive data in `localStorage`.
- Logout revokes the session; role switch re-checks the active role.

### 7.2 Agent

- Authenticated user session; no anonymous agent.
- Tools are generated from the action catalog; no hand-written HTTP wrappers.
- Risk tier is enforced by the runtime, not the prompt.
- `HUMAN_ONLY` actions are removed from the tool list **and** rejected server-side.
- `NEEDS_APPROVAL` creates an immutable `PendingAction`; the agent cannot approve it.
- Every tool call is audited with model, tokens, latency, and cost.
- The agent may read only what the user may read; DTOs are already masked.
- Prompt injection from messages/files is data, never instructions.
- Budgets: max steps, max tokens, max wall time; stop with a fallback.

### 7.3 MCP (post-MVP)

- OAuth with explicit scopes; no long-lived shared tokens.
- Same action catalog, same policy, same risk tiers.
- Per-client rate limits and audit trail.
- The user can revoke a client at any time.
- `HUMAN_ONLY` actions are not exposed.

### 7.4 Magic links / WhatsApp cards

- Token: 256-bit random, hashed at rest, scoped to user + purpose + request, expires in 7 days, revocable.
- Read-only access by default; mutating actions require a fresh single-use token.
- No role escalation; the token maps to one user and one purpose.
- Rate limit by token and phone.
- Every use is audited.
- WhatsApp webhook verifies Meta's signature and deduplicates by message ID.
- STOP/opt-out is honored immediately.

### 7.5 Cron / outbox / service

- Service actor with explicit scopes.
- Cannot call user-only actions or impersonate a user.
- Idempotent; at-least-once is expected.
- Writes audit events with `actor_type = service`.
- Failures go to a dead-letter queue/table and alert.

### 7.6 Admin

- Admin role + step-up for destructive actions.
- Reason required for verification decisions, suspension, disputes, impersonation.
- Impersonation: user consent, visible banner, time limit, full audit.
- Admin cannot read private contract/chat content without a logged reason (MVP: read-only dispute view).
- Admin actions are never available through the agent.

---

## 8. Permission edge cases

| # | Case | Expected behaviour |
|---|---|---|
| **PM1** | Multi-role user switches role | Server checks active role; old role cannot act until switched. |
| **PM2** | Customer is also an expert and bids on own request | Blocked at `quote.submit` and contract draft. |
| **PM3** | Provider is invited to a private request | Can read the request and quote; cannot see other providers. |
| **PM4** | Provider expresses interest on an open request | Can read the request; cannot see competitors. |
| **PM5** | Provider withdraws interest after quoting | Interest withdrawn; active quote must be withdrawn separately. |
| **PM6** | Customer accepts a quote while another is being revised | Row lock; one accepted; revision rejected/`409`. |
| **PM7** | User suspended mid-contract | Cannot act; contract remains; admin resolves. |
| **PM8** | User deleted with active contract | Anonymized; counterparty retains contract/audit access. |
| **PM9** | Unverified provider tries to quote | Blocked; can browse/express interest. |
| **PM10** | Admin tries to sign for a user | Blocked; admin is not a party. |
| **PM11** | Agent tries to accept a quote | Blocked (`HUMAN_ONLY`); may compare/recommend. |
| **PM12** | Agent tries to approve its own `PendingAction` | Blocked; only the human owner can approve. |
| **PM13** | Magic link reused for a mutation | Blocked; new token required. |
| **PM14** | Magic link user tries to view another request | Blocked by scoped token + ownership check. |
| **PM15** | WhatsApp webhook replays a button action | Deduplicated; no duplicate quote. |
| **PM16** | Service worker tries a user action | Blocked by actor type. |
| **PM17** | Support user tries to edit | Read-only role; blocked. |
| **PM18** | Customer removes a provider from a request | Provider loses access; existing quote preserved/withdrawn per policy. |
| **PM19** | Contract revision after one signature | New version; old signature invalid; both must re-sign. |
| **PM20** | User blocks counterparty | Chat blocked; contract/dispute access preserved. |
| **PM21** | PendingAction expires during approval | `409`; no execution; user must ask agent again. |
| **PM22** | PendingAction payload changed | Hash mismatch; `409`; new action required. |
| **PM23** | Admin access to private documents | Logged; reason; time-bound. |
| **PM24** | Consent withdrawn | Non-essential processing stops; legal records retained. |

---

## 9. Enforcement and tests

Every action needs a test table:

```text
role × ownership × state × caller → expected result
```

Minimum test cases per action:

1. Allowed actor, valid state → success.
2. Wrong role → 403.
3. Correct role, wrong owner → 404 (preferred) or 403.
4. Correct owner, wrong state → 409.
5. Unauthenticated → 401.
6. Agent caller on `HUMAN_ONLY` → 403.
7. Agent caller on `NEEDS_APPROVAL` → `PendingAction`, no write.
8. Suspended/deleted user → 403.
9. Expired token/link → 401.
10. Duplicate/idempotent call → same result, one write.

CI must fail if a permission test is missing for a new action. The matrix is not documentation-only; it is executable.

---

## 10. Review checklist

- [ ] Action is in the matrix with roles, risk, and guard.
- [ ] Ownership/participation checks are server-side.
- [ ] State guard is explicit.
- [ ] DTO masks fields by role.
- [ ] Agent risk tier is correct.
- [ ] Audit event records actor, action, entity, and outcome.
- [ ] Permission tests cover allowed and denied cases.
- [ ] No client-supplied identity or role is trusted.
- [ ] Admin/support paths are logged and least-privilege.
