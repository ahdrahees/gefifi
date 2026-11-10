# Gefifi v3 — Provider Verification Rubric

> **Purpose:** A manual, repeatable standard for verifying experts and suppliers before they can quote.  
> **Owner:** Founder/ops. Reviewed with counsel before launch.  
> **SLA:** First review within **24–48 hours** of a complete submission.  
> **Tooling:** Admin queue if it exists; SQL/Retool from Week 1–3 if it does not.  
> **Hard rule:** **No Aadhaar.** No automated KYC, no OCR, no third-party identity API in the MVP.

---

## 1. What verification is and is not

Verification means Gefifi has checked that a provider is a real person or business, can do the claimed category of work, and has accepted the platform rules. It is **not** a guarantee of quality, a licence, insurance, or a warranty. Copy must say “verified provider”, not “guaranteed” or “certified”.

A provider can be:

| Status | What it means | Can browse | Can express interest | Can quote | Can sign |
|---|---|---|---|---|---|
| `unverified` | Signed up, no review yet | Yes | Yes | No | No |
| `pending` | Documents submitted, review in progress | Yes | Yes | No | No |
| `verified` | Documents and references checked | Yes | Yes | Yes | Yes |
| `rejected` | Review failed; reason recorded | Yes | No | No | No |
| `suspended` | Was verified; privilege removed | Yes | No | No | No (existing contracts handled by admin) |

**Seed rule:** before the first customer request, pre-verify **10–20 providers** through this rubric. Do not launch with an empty verified pool.

---

## 2. Required documents

Collect the minimum needed. Store documents in R2 with admin-only signed access, encrypted at rest, and a retention rule.

### 2.1 Identity (one of)

- PAN card (preferred for name/business matching);
- driving licence;
- voter ID;
- passport.

Do **not** collect Aadhaar. If a provider sends an Aadhaar image unprompted, do not store it; delete it and ask for another document.

Capture only:

- legal name;
- document type and last 4 characters;
- document image (admin-only);
- name-match result.

### 2.2 Business (one of, if available)

- GST registration certificate;
- Udyam registration;
- Shop & Establishment / municipal trade licence;
- partnership deed or incorporation certificate.

An individual expert without a business registration can still be verified at the `basic` level; the badge must say “verified individual”, not “verified business”.

### 2.3 Trade evidence (at least two)

- ITI/NSDC/trade certificate;
- 3–5 photos of past work (not stock images);
- 2 customer references with permission to call;
- a short video of tools/work;
- a supplier's price list or GST invoice sample;
- a hardware/paint shop reference.

### 2.4 Contact and payout

- Phone number verified by OTP.
- WhatsApp number (may be the same).
- UPI ID or bank account name for the offline payment ledger. Verify the name matches the provider; do not store full bank credentials.
- Service areas and categories.

### 2.5 Optional

- Insurance certificate (do not require in MVP).
- Police verification (do not require in MVP; note it as a future trust signal).
- Company website/social profile.

---

## 3. Review procedure

1. **Completeness check.** Required identity + at least two trade signals + verified phone. If incomplete, set `pending` with a specific missing-item message.
2. **Document authenticity.** Check name consistency, document edges, expiry, and obvious edits. Reverse-image-search portfolio photos if suspicious.
3. **Reference call (one).** Ask: how long have you known them, what work did they do, was it on time, any dispute, would you hire again.
4. **Category check.** Ask two technical questions a competent provider should answer; record the answers. Do not turn this into a trade exam.
5. **Service-area check.** Confirm the provider actually serves the pincodes they selected.
6. **Rules acceptance.** Provider accepts: no cash demands before work, no off-platform pressure, no abusive behaviour, accurate quotes, site-visit consent, and dispute cooperation.
7. **Decision.** Approve or reject with a reason code. Record reviewer and timestamp.
8. **Notify.** WhatsApp/email with the decision and next step. Verified providers get the badge and can quote.
9. **Audit.** `provider_documents`, `provider_profiles.verification_status`, and `audit_events` all updated in one transaction.

**Reason codes:** `incomplete_docs`, `name_mismatch`, `invalid_document`, `category_mismatch`, `area_mismatch`, `reference_failed`, `fraud_signal`, `duplicate_account`, `rules_rejected`, `other`.

---

## 4. Fraud and risk signals

Escalate to `rejected` or `suspended` if any of these are credible:

- identity name does not match the bank/UPI name;
- duplicate phone, PAN, GSTIN, or portfolio across accounts;
- stock or stolen portfolio images;
- refuses a reference call or cannot name a past customer;
- asks the customer for a large advance before a site visit;
- pressures the customer to pay off-platform or cancel the request;
- quotes far below market and then adds charges;
- abusive, threatening, or discriminatory messages;
- impersonates another business;
- repeated no-shows (2 in 30 days);
- multiple payment disputes with the same pattern;
- document tampering or inconsistent dates;
- account takeover signals (phone change + payout change in a short window).

Do not auto-reject on a single weak signal. Record evidence and review manually.

---

## 5. Suspension and re-verification

### Suspend immediately

- credible fraud or impersonation;
- threat or abuse;
- evidence of taking money without work;
- admin account takeover;
- a court/regulator request.

### Suspend after review

- 2 no-shows in 30 days;
- 3 upheld disputes in 90 days;
- expired mandatory document;
- repeated inaccurate quotes;
- refusal to cooperate with a dispute.

### Process

1. Set `provider_profiles.verification_status = 'suspended'`.
2. Revoke active magic links and sessions if fraud is suspected.
3. Stop new quotes; keep existing contracts visible for admin review.
4. Notify the provider with the reason and appeal path.
5. Record an audit event with actor, reason, and evidence.
6. Re-verify after 12 months, a category change, a payout change, or a suspension.

**Existing contracts:** suspension does not erase the contract. Admin reviews the contract and decides whether to allow completion, reassign, or mediate. The customer must not lose access to the audit trail.

---

## 6. Documents and data retention

| Data | Retention | Notes |
|---|---|---|
| Verification documents | 1 year after offboarding | Delete after retention; keep audit metadata |
| Verification decision + reason | 8 years | Audit/legal record |
| Reference notes | 1 year after offboarding | Delete with documents |
| UPI/bank name match | Life of account + 1 year | No full bank credentials |
| Chat with provider | 2 years | Tombstones preserved |
| Suspension evidence | 8 years | Legal/audit |

Access is admin-only, logged, and time-bound. Do not put document links in chat, email, analytics, or prompts.

---

## 7. Copy and badges

Use precise labels:

- “Verified individual” — identity + trade evidence checked.
- “Verified business” — business registration + identity checked.
- “Documents pending” — review in progress.
- “Verification suspended” — privileges removed.

Do **not** use:

- “Gefifi certified”;
- “guaranteed”;
- “licensed” unless a licence was actually checked;
- “background verified” unless a police check was done.

Add a short “What verification means” page: identity, trade evidence, and rules acceptance — not a quality guarantee.

---

## 8. Ops checklist

- [ ] Queue monitored twice daily (10:00 and 17:00).
- [ ] First review within 24–48 hours.
- [ ] 10–20 providers pre-verified before the first request.
- [ ] Every decision has a reason code, reviewer, and timestamp.
- [ ] Rejected providers can resubmit after fixing the reason.
- [ ] Suspended providers lose quote access immediately.
- [ ] Documents are encrypted, admin-only, and retention-limited.
- [ ] No Aadhaar is collected or stored.
- [ ] Badge copy matches the level actually checked.
- [ ] Weekly metrics: pending count, time to verify, rejection rate, suspension rate.
