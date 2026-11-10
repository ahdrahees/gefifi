# Gefifi v3 — Analytics Events

> **Purpose:** A small, stable event taxonomy that answers the business questions in [README.md](README.md) without collecting PII.  
> **Owner:** Founder. **Implementation:** server-side first; client-side only for UI events.  
> **Rule:** If an event is not in this document, it is not shipped. Add it here first.

---

## 1. Principles

1. **No PII.** Never send names, phone numbers, emails, exact addresses, free-text messages, contract terms, payment references, document URLs, or voice-note URLs.
2. **Pseudonymous.** Use an internal `user_id` (UUID) and `anonymous_id`; never a phone or email as the key.
3. **Server-side truth.** Business events are emitted by the action layer after the transaction commits, not by the browser.
4. **Idempotent.** Each event has an `event_id`; consumers deduplicate.
5. **Small.** 12 core events plus a few supporting events. Do not instrument every click.
6. **Bounded properties.** Enumerated values or bands, not raw amounts or text where a band is enough.
7. **Retention.** 24 months for analytics; raw product data follows the retention schedule.
8. **Consent-aware.** If analytics consent is required, respect it; essential product metrics can use aggregated, non-identifying data.

---

## 2. Common properties

Every event carries:

| Property | Type | Notes |
|---|---|---|
| `event_id` | UUID | Idempotency key |
| `event_name` | string | `snake_case`, past tense |
| `occurred_at` | ISO-8601 UTC | Server timestamp |
| `user_id` | UUID or null | Internal pseudonymous ID |
| `anonymous_id` | UUID or null | Pre-login only |
| `session_id` | UUID or null | Rotated on login |
| `role` | `customer` / `expert` / `supplier` / `admin` | Active role |
| `channel` | `web` / `agent` / `magic_link` / `whatsapp` / `service` | Where it happened |
| `city` | string | Launch city only |
| `app_version` | string | Deploy SHA or semver |
| `environment` | `dev` / `staging` / `production` | |
| `request_id` | UUID or null | Join key; not PII |
| `contract_id` | UUID or null | Join key |
| `thread_id` | UUID or null | Join key |

Do **not** add: phone, email, name, address, pincode (use area band), free text, amount in rupees (use a band), UTR/reference, document URL, IP (store server-side for security, not analytics).

---

## 3. The 12 core events

### 3.1 `user_signed_up`

| Property | Values |
|---|---|
| `auth_method` | `google`, `phone_otp` |
| `primary_role` | `customer`, `expert`, `supplier` |
| `source` | `organic`, `referral`, `whatsapp`, `provider_outreach`, `unknown` |

Questions: which role and channel acquires users? Which source produces providers who quote?

### 3.2 `provider_verification_submitted`

| Property | Values |
|---|---|
| `provider_kind` | `expert`, `supplier` |
| `category_count` | integer |
| `document_types` | array of enums (`pan`, `dl`, `voter_id`, `passport`, `gst`, `udyam`, `trade_cert`, `portfolio`, `reference`) |
| `has_business_registration` | boolean |

Questions: what documents do providers actually have? Where does verification stall?

### 3.3 `provider_verified`

| Property | Values |
|---|---|
| `provider_kind` | `expert`, `supplier` |
| `category` | category slug |
| `hours_since_submit` | number |
| `decision` | `verified`, `rejected` |
| `reason_code` | enum from the verification rubric |

Questions: time-to-verify, rejection reasons, supply activation.

### 3.4 `request_created`

| Property | Values |
|---|---|
| `request_kind` | `work`, `material` |
| `category` | slug |
| `source` | `form`, `agent`, `whatsapp` |
| `item_count` | integer |
| `has_photos` | boolean |
| `budget_band` | `under_5k`, `5k_20k`, `20k_50k`, `50k_1l`, `above_1l`, `unspecified` |
| `area_band` | broad area label, not a pincode |

Questions: which categories create requests? Does the agent increase creation?

### 3.5 `request_published`

| Property | Values |
|---|---|
| `request_id` | UUID |
| `request_kind` | `work`, `material` |
| `category` | slug |
| `time_since_draft_minutes` | number |
| `visibility` | `open`, `invite_only` |
| `invited_provider_count` | integer |

Questions: draft-to-publish conversion; how long creation takes.

### 3.6 `quote_submitted`

| Property | Values |
|---|---|
| `request_id` | UUID |
| `provider_kind` | `expert`, `supplier` |
| `quote_version` | integer |
| `amount_band` | same bands as budget |
| `response_hours` | number since request publication |
| `channel` | `web`, `magic_link`, `whatsapp` |
| `has_line_items` | boolean |

Questions: quote rate, time to first quote, channel effectiveness.

### 3.7 `quote_accepted`

| Property | Values |
|---|---|
| `request_id` | UUID |
| `amount_band` | band |
| `time_to_accept_hours` | number |
| `quote_count` | integer |
| `accepted_rank` | `lowest`, `middle`, `highest`, `only` |

Questions: conversion, price sensitivity, whether customers choose the cheapest.

### 3.8 `contract_signed`

| Property | Values |
|---|---|
| `contract_id` | UUID |
| `request_id` | UUID |
| `amount_band` | band |
| `time_to_sign_hours` | number since contract draft |
| `signer_roles` | array (`customer`, `expert`, `supplier`) |
| `certificate_generated` | boolean |

Questions: the north-star conversion; signing friction.

### 3.9 `milestone_paid`

| Property | Values |
|---|---|
| `contract_id` | UUID |
| `milestone_index` | integer |
| `amount_band` | band |
| `payment_method` | `upi`, `neft`, `cash`, `other` |
| `evidence_attached` | boolean |
| `days_since_previous_milestone` | number |

Questions: whether work progresses and payments are recorded.

### 3.10 `chat_message_sent`

| Property | Values |
|---|---|
| `thread_id` | UUID |
| `request_id` | UUID |
| `kind` | `text`, `file`, `image`, `voice`, `system` |
| `sender_role` | `customer`, `expert`, `supplier`, `system` |
| `is_first_message` | boolean |
| `voice_duration_band` | `under_30s`, `30s_2m`, `2m_5m` (voice only) |

Questions: chat adoption, first-response time, voice usage. Never send the message body.

### 3.11 `site_visit_completed`

| Property | Values |
|---|---|
| `request_id` | UUID |
| `provider_kind` | `expert`, `supplier` |
| `duration_minutes` | number |
| `address_released` | boolean |
| `check_in_recorded` | boolean |
| `check_out_recorded` | boolean |

Questions: whether visits convert to quotes; address-release safety.

### 3.12 `dispute_opened`

| Property | Values |
|---|---|
| `contract_id` | UUID |
| `request_id` | UUID |
| `opened_by_role` | `customer`, `expert`, `supplier` |
| `reason_code` | `quality`, `delay`, `payment`, `scope`, `no_show`, `other` |
| `milestone_index` | integer or null |

Questions: dispute rate and causes. No free-text reason in analytics.

---

## 4. Supporting events

These are not part of the 12 but are needed for the agent, WhatsApp, and safety dashboards.

| Event | Properties | Why |
|---|---|---|
| `agent_thread_started` | `user_id`, `channel` | Agent adoption |
| `agent_draft_created` | `request_kind`, `category`, `source` | Draft conversion |
| `agent_pending_action_created` | `action_name`, `risk_tier` | Approval volume |
| `agent_pending_action_approved` | `action_name`, `minutes_to_approve` | Approval acceptance |
| `agent_pending_action_rejected` | `action_name`, `reason_code` | Friction/safety |
| `agent_kill_switch_triggered` | `scope` (`user`, `thread`), `reason_code` | Safety |
| `whatsapp_template_sent` | `template_name`, `category` (`utility`, `marketing`), `provider_kind` | Channel health |
| `whatsapp_opt_out` | `template_category`, `source` | Compliance/quality |
| `magic_link_used` | `purpose`, `result` (`read`, `mutation`), `channel` | Supply access |
| `provider_suspended` | `reason_code`, `provider_kind` | Trust/safety |

---

## 5. Funnels and dashboards

### 5.1 Acquisition

`user_signed_up` → `request_created` → `request_published` → `quote_submitted` → `quote_accepted` → `contract_signed`

Break down by role, city, category, source, and channel.

### 5.2 Supply activation

`provider_verification_submitted` → `provider_verified` → first `quote_submitted` within 7 days.

Targets: ≥ 50% of onboarded providers quote within 7 days; time to verify < 48h.

### 5.3 Liquidity guardrail

Weekly: published requests with ≥ 1 quote / published requests.

**Target ≥ 30%.** If below 30% after Week 2, pause feature work and fix supply.

### 5.4 Chat health

`chat_message_sent` (first message per thread) → first reply; voice share; median first-response time.

Targets: ≥ 60% of active requests have a thread message; first response < 4h median.

### 5.5 Contract and money

`contract_signed` → `milestone_paid` (first) → `milestone_paid` (final); dispute rate.

### 5.6 Cost and safety

- LLM tokens/cost per request and per signed contract (from `usage_events`, not analytics PII).
- WhatsApp/SMS cost per signed contract.
- `agent_pending_action_*` approval rate; zero unapproved writes.
- `dispute_opened` rate < 10%.
- `provider_suspended` rate and reasons.

---

## 6. Naming and schema rules

- `snake_case`, past tense: `request_published`, not `publish_request`.
- One event per business fact; do not emit `button_clicked` for business actions.
- Properties are flat; arrays only for small enums (`signer_roles`, `document_types`).
- Use bands for money and duration; do not send exact amounts unless needed for finance reconciliation (then use the ledger, not analytics).
- Every event has a versioned schema in `packages/core/src/analytics/events.ts` (or equivalent) with a Zod type.
- Adding/removing a property is a schema change: update this doc and the test.
- Never reuse an event name for a different meaning.

---

## 7. Implementation notes

- Emit after the transaction commits, from the action layer or an outbox consumer.
- Use the outbox for reliability when the action must not fail because analytics is down.
- Deduplicate by `event_id` at the consumer.
- Server-side events use the action's authenticated user; never trust a client-supplied `user_id`.
- Client-side events are only for UI friction (e.g., form abandonment) and carry no PII.
- Sampling is allowed for high-volume UI events, not for the 12 core events.
- Use a single analytics client wrapper; no direct SDK calls scattered through the code.
- In development, log events to the console; never send to production.
- Provide an opt-out for product analytics if required; do not opt out of security/audit logs.

**Tool choice:** SQL/Metabase vs PostHog is an open decision (Week 12). The taxonomy is tool-agnostic.

---

## 8. Testing

- [ ] Every core event has a Zod schema and a unit test for valid/invalid properties.
- [ ] A no-PII test scans serialized event payloads for phone/email/address/free-text patterns.
- [ ] Duplicate `event_id` is deduplicated.
- [ ] Events are emitted once per successful action, not on validation failure or rollback.
- [ ] Agent events record `action_name` and `risk_tier`, never prompt text.
- [ ] Chat events record `kind` and `sender_role`, never message content.
- [ ] Analytics failure does not fail the user action (unless the event is audit, which is separate).
- [ ] Dashboard queries are documented and reproducible.

---

## 9. Questions this must answer

1. Are we acquiring providers who actually quote?
2. Are customers publishing requests with enough detail to quote?
3. How fast is the first quote, and what share of requests get one?
4. Which channel produces quotes and contracts: web, agent, or WhatsApp?
5. Do customers accept the lowest quote or a middle one?
6. How long does signing take, and where do contracts stall?
7. Are milestones paid and confirmed?
8. Is chat used, and how fast do people reply?
9. Are site visits converting to quotes?
10. What is the dispute rate and the top reason?
11. What does a signed contract cost in LLM/WhatsApp/SMS spend?
12. Is the agent proposing actions that humans approve?
