# Gefifi v3 — Legal & Payments Checklist

> **Purpose:** The launch gate for the legal, tax, and payments decisions that engineering cannot make.  
> **Owner:** Founder, with Indian counsel and a CA.  
> **Status:** Template; not legal advice. Every item marked “counsel” must be confirmed in writing.  
> **Rule:** Do not launch contracts, payments, WhatsApp, or public marketing until the **launch gates** in §12 are closed.

---

## 1. Entity and registrations

- [ ] Choose the entity: private limited, LLP, or proprietorship. Counsel/CA.
- [ ] Incorporate and obtain CIN/LLPIN, PAN, TAN.
- [ ] Open a current account in the entity name.
- [ ] GST registration (if turnover crosses the threshold, or voluntarily for input credit/marketplace posture). CA.
- [ ] Udyam registration (optional; useful for MSME benefits).
- [ ] Professional tax registration (state-specific). CA.
- [ ] Shop & Establishment registration if a physical office exists.
- [ ] Signatory authority and board resolution for contracts, bank, and WhatsApp.
- [ ] Bookkeeping process and monthly close from Month 1.

**Owner:** Founder + CA. **Deadline:** Week 1–2.

---

## 2. Intermediary posture

Gefifi connects customers and independent providers. It does not perform the work, supply materials, or hold funds.

- [ ] Terms describe Gefifi as a **discovery and coordination platform**, not a contractor, employer, or agent of either party.
- [ ] Providers are independent; no exclusivity, minimum wage, or control that implies employment.
- [ ] Customers contract directly with the provider.
- [ ] Gefifi does not guarantee quality, timelines, or payment.
- [ ] Publish a grievance officer, contact details, and response process.
- [ ] Comply with the IT Act, 2000 and IT Rules, 2021 to the extent applicable; counsel to confirm safe-harbour conditions.
- [ ] Publish the intermediary disclaimer on the landing page, request flow, and contract.
- [ ] Do not curate or endorse providers in a way that creates a guarantee; verification is a limited check, not a warranty.
- [ ] Have a notice-and-takedown process for illegal or infringing content.
- [ ] Keep records of complaints and actions.

**Counsel questions:** Does the verification badge or quote comparison create liability? Does the platform “actively curate” in a way that affects safe harbour? What is the grievance-officer SLA and reporting obligation?

---

## 3. Contracts and electronic acceptance

The MVP uses **electronic acceptance with an audit trail**, not Aadhaar eSign and not a claim of legal admissibility.

- [ ] Contract template covers: parties, scope, site address (released only for the visit), price and tax, milestones, timeline, change orders, cancellation, warranty, safety, insurance, dispute process, governing law, jurisdiction, and notices.
- [ ] Both parties accept the same immutable terms version.
- [ ] SHA-256 hash of the canonical terms is stored.
- [ ] Dual OTP: each signer receives a single-use OTP bound to user + purpose + contract version; expiry and attempt limits enforced.
- [ ] `contract_events` is an append-only hash chain (`prev_hash`, `event_hash`).
- [ ] The certificate is **HTML**, includes the terms hash, signer details, timestamps, IP/device/user agent, and the event chain; no PDF in MVP.
- [ ] Copy says “electronic acceptance with audit trail”; never “Section 65B”, “admissible evidence”, “legally binding e-signature”, or “Aadhaar eSign”.
- [ ] BSA 2023 s.63 framing is reviewed by counsel; do not claim a court will admit the record.
- [ ] Contract versions are immutable; revisions create a new version and invalidate prior signatures.
- [ ] Signatures store the OTP challenge ID, not the OTP itself.
- [ ] Audit records are retained for 8 years.

**Stamp duty:** counsel/CA to confirm whether the work contract, quotation, or certificate attracts stamp duty in Maharashtra, and how e-stamping is handled for an electronic instrument. Do not assume “digital means no stamp duty”.

**Owner:** Founder + counsel. **Deadline:** Before Week 8; template frozen before signing goes live.

---

## 4. Payments and money flow

**MVP position:** offline UPI/NEFT/cash between customer and provider. Gefifi records the ledger; it does **not** hold, route, guarantee, or escrow funds.

- [ ] No payment aggregation, escrow, wallet, or fund custody.
- [ ] No claim that Gefifi “protects” or “guarantees” payment.
- [ ] Customer marks a milestone paid with a reference and optional screenshot.
- [ ] Provider confirms receipt; neither party can perform the other's step.
- [ ] Payment records are immutable and audited.
- [ ] Reserve schema fields for a future platform fee, commission, settlement, and licensed payment partner.
- [ ] Terms explain that a payment confirmation is a record, not a verification of funds by Gefifi.
- [ ] Refund/cancellation policy: platform fees (if any) vs provider payments; who decides; timelines.
- [ ] Chargeback/dispute process, even for offline payments.
- [ ] Fraud warnings: never pay a provider before a site visit or written scope; never pay to a personal account that does not match the verified name.

**Tax:** CA to confirm GST on any platform/commission fee, TCS under the GST e-commerce provisions (s.52 CGST) and Income Tax s.194-O, invoicing, and whether Gefifi is an e-commerce operator even without processing payments. Do not invoice or collect commission until confirmed.

---

## 5. DPDP and privacy

- [ ] Publish a privacy notice in plain language: what is collected, why, who it is shared with, how long it is kept, and how to exercise rights.
- [ ] Record consent with version, purpose, timestamp, IP, and user agent.
- [ ] Purpose limitation: verification, matching, chat, contracts, payments, support, and safety.
- [ ] Data minimisation: no Aadhaar, no full bank credentials, no exact address on public requests.
- [ ] Data principal rights: access, correction, erasure, grievance, and consent withdrawal.
- [ ] Retention schedule enforced in code (see §8).
- [ ] Breach response: detect, contain, assess, notify, and record; counsel to confirm notification duties and timelines.
- [ ] Sub-processors listed: Cloudflare, Supabase, Sentry, WhatsApp/Meta, SMS provider, LLM provider, email provider.
- [ ] Cross-border processing reviewed; prefer Mumbai region; counsel to confirm.
- [ ] DPDP Rules commencement and any sectoral rules confirmed by counsel.
- [ ] Children: the service is 18+; add an age affirmation and do not knowingly collect children's data.
- [ ] Consent withdrawal stops non-essential processing but preserves contract/audit/payment records required by law.

**Owner:** Founder + counsel. **Deadline:** Before public launch; privacy notice drafted by Week 8.

---

## 6. WhatsApp, SMS, and communications

- [ ] Meta Business verification completed; WABA and phone number approved.
- [ ] Template categories: **utility** for quote/contract/payment updates; **marketing** for new-lead alerts and promotions.
- [ ] Separate marketing and utility opt-in; store source, timestamp, and STOP.
- [ ] STOP/opt-out honored immediately across templates.
- [ ] No inbound button automation in MVP; replies are not treated as a contract or a quote.
- [ ] Template quality monitored; pause low-quality templates.
- [ ] DLT registration for the SMS sender header and OTP templates.
- [ ] SMS is a fallback, not the primary channel.
- [ ] Data processing terms with Meta/provider reviewed.
- [ ] No phone numbers, addresses, or contract terms in template variables beyond what the user needs.

**Owner:** Founder. **Deadline:** Day 1 start; approved before Week 11.

---

## 7. Consumer protection and marketplace rules

- [ ] Display provider name, business name, area, category, and verification level.
- [ ] Publish pricing/commission terms before a provider pays anything.
- [ ] Publish cancellation, reschedule, no-show, and refund rules.
- [ ] Publish a grievance officer and a 24-hour acknowledgement / 15-day resolution target.
- [ ] No fake urgency, fake reviews, or misleading “verified” claims.
- [ ] Clearly label sponsored or promoted placement if added later.
- [ ] Prohibit off-platform payment pressure, abuse, discrimination, and fake documents.
- [ ] Record complaints and actions; review monthly.
- [ ] E-commerce rules and consumer-protection obligations confirmed by counsel.

---

## 8. Retention and records

| Record | Retention | Notes |
|---|---|---|
| Contracts, signatures, certificate, audit chain | 8 years | Never hard-delete |
| Payment ledger and evidence | 8 years | Tax/legal |
| Audit events | 8 years | Append-only |
| Chat messages | 2 years | Tombstones; legal hold may extend |
| Voice notes | 2 years | Same as chat |
| Verification documents | 1 year after offboarding | Delete after; keep decision metadata |
| Support tickets | 3 years | PII-minimised |
| Analytics events | 24 months | No PII |
| Backups | 30 days | PITR 7 days; encrypted |
| Consent records | Life of account + 8 years | Proof of consent |

- [ ] Deletion anonymises PII but preserves contract, payment, and audit records.
- [ ] Legal hold overrides deletion.
- [ ] Retention jobs are tested and logged.

---

## 9. Insurance

- [ ] Professional indemnity / errors & omissions.
- [ ] Cyber liability.
- [ ] Public liability if a physical office or events.
- [ ] Directors & officers (optional at MVP).
- [ ] Confirm whether providers need their own insurance; do not claim they are covered by Gefifi.

Insurance is not a substitute for contracts or verification. Buy what the budget allows before launch; at minimum, price PI and cyber.

---

## 10. Support, disputes, and refunds

- [ ] Support channel: WhatsApp + email; 24-hour first response.
- [ ] Dispute process: open → evidence → admin review → resolution; manual in MVP.
- [ ] No escrow, so Gefifi cannot “refund” provider work; it can mediate and record outcomes.
- [ ] Platform-fee refunds (if any) follow a written policy.
- [ ] Suspend providers for fraud, abuse, or repeated no-shows.
- [ ] Preserve contract/chat/payment evidence during a dispute.
- [ ] Publish an incident and safety escalation contact.
- [ ] Review disputes weekly for patterns.

---

## 11. Open questions for counsel/CA

1. Does the electronic work contract attract stamp duty in Maharashtra, and how is it paid for an online instrument?
2. Is the dual-OTP + hash-chain record sufficient for the intended use, and what should the certificate say without overclaiming?
3. Does Gefifi’s verification/quote-comparison posture affect intermediary safe harbour?
4. Is Gefifi an e-commerce operator for GST TCS and Income Tax s.194-O even without processing payments?
5. What GST rate applies to a platform/commission fee, and what invoices are required?
6. What are the DPDP notice, consent, breach, and retention obligations at launch, and which Rules are in force?
7. What consumer-protection and e-commerce disclosures are mandatory for a services marketplace?
8. What is the liability cap and dispute-resolution clause that counsel recommends?
9. Are WhatsApp utility templates for lead alerts correctly classified, or are they marketing?
10. What insurance limits are appropriate for the first 12 months?

---

## 12. Launch gates

Do not launch until all are true:

- [ ] Entity, PAN, GST status, and bank account are live.
- [ ] Terms of service, privacy notice, intermediary disclaimer, and grievance officer are published.
- [ ] Contract template and “electronic acceptance with audit trail” copy are approved by counsel.
- [ ] Stamp-duty treatment is confirmed and implemented.
- [ ] Payment ledger wording is approved; no escrow/fund-custody claim.
- [ ] GST/TCS treatment of any platform fee is confirmed; no commission invoicing before sign-off.
- [ ] DPDP consent, retention, deletion, and breach runbook are implemented.
- [ ] WhatsApp templates approved; marketing/utility opt-in and STOP tested.
- [ ] DLT registration complete for SMS.
- [ ] Insurance quotes obtained; PI/cyber purchased or explicitly deferred with a written risk note.
- [ ] Support and dispute process is live with a 24-hour first-response target.
- [ ] Contract/audit/payment retention is enforced in code.
- [ ] Legal review is recorded in `docs/adr/` and the launch checklist.
