# Gefifi v3 — Pre-Code Acquisition Plan

> **Purpose:** Prove that one city and three categories can produce real requests and real quotes before writing v3.  
> **Window:** Week −2 to Week 0 (two weeks, part-time is acceptable but not optional).  
> **Owner:** Founder. AI agents can draft scripts, lists, and follow-ups; they cannot make the calls.  
> **Gate:** Do not start the rewrite until the exit criteria in §8 are met.

---

## 1. Why this exists

The largest risk is not the stack. It is an empty marketplace: a working app with no providers willing to quote and no customers with real jobs. The rewrite is 16–18 weeks of build. This sprint is two weeks that decide whether that build has a market.

The sprint is **concierge**, not a landing-page test:

- talk to named providers;
- collect real customer requests with photos and budgets;
- get written quote commitments;
- test a pricing hypothesis;
- learn the vocabulary and objections the product must handle.

No code, no waitlist vanity metrics, no “100 sign-ups” without a job attached.

---

## 2. Wedge to validate

| Choice | Default | Confirm by |
|---|---|---|
| City | Pune | End of Week −2 |
| Categories | Plumbing, electrical, painting | End of Week −2 |
| Customer | Homeowners and small commercial premises in 3–4 pincodes | End of Week −2 |
| Provider | Independent experts and small firms (1–10 people) | End of Week −2 |
| Promise | Post a job, get verified quotes, sign a clear agreement, track milestones | Day 1 |

If the data says a different city or category is easier to seed, change the wedge **before** the list is built. Do not run two wedges in parallel.

---

## 3. Targets

| Metric | Target | What it proves |
|---|---|---|
| Named providers | **100** | A real list, not a category |
| Providers called | **25** in Week −2, **50** by end of Week −1 | The list is reachable |
| Conversations completed | ≥ 25 | Providers will talk |
| Written “I will quote within 24 hours” commitments | **10** | Supply will respond |
| Real customer requests | **20** | Demand exists now |
| Requests with photos and a budget range | ≥ 12 | Requests are actionable |
| Customers willing to try a paid/commission model | ≥ 5 | Pricing has a pulse |
| Site visits or ride-alongs observed | ≥ 2 | The visit flow is real |
| Providers with documents ready | ≥ 15 | Verification will not block launch |

A “written commitment” is a WhatsApp or email message from the provider that names the category and area and says they will quote within 24 hours. A verbal “sounds good” does not count. “Send me leads” does not count.

---

## 4. Week −2: build the list and collect demand

### Day 1–2: define the wedge

- Pick one city, three categories, and 3–4 pincodes.
- Write the one-sentence promise and the provider value proposition.
- Create a spreadsheet with two tabs: `Providers` and `Requests`.
- Create a business WhatsApp number and a simple call log.
- Confirm the founder has 10–15 hours per week for the sprint.

### Day 3–5: build the provider list

Sources, in order:

1. Google Maps / Justdial / IndiaMART for the chosen categories and pincodes.
2. WhatsApp groups for apartment associations, plumbers, electricians, painters.
3. Hardware stores, paint shops, electrical wholesalers — ask for 3 introductions.
4. Recent customers: ask who did their last repair.
5. Facebook/Instagram local trade groups.
6. Existing v2 beta users and waitlist contacts.

For each provider capture:

| Field | Example |
|---|---|
| Name | Ramesh K. |
| Business | Ramesh Plumbing Services |
| Phone | +91… |
| Category | Plumbing |
| Area / pincodes | Kothrud, Karve Nagar |
| Source | Google Maps |
| Years active | 8 |
| Team size | 3 |
| GST / Udyam | No / Yes |
| Documents ready? | PAN, portfolio |
| Called? | Yes / No |
| Outcome | Committed / Follow-up / No |
| Notes | “Wants leads in Kothrud only” |

Do not put customer PII in the repo. Keep the working list in a private sheet or CRM; commit only the anonymised summary and counts.

### Day 3–7: collect 20 requests

Channels:

- apartment WhatsApp groups and society committees;
- friends, family, and colleagues (ask for a real job, not a hypothetical);
- local hardware/paint shops (customers ask them for fitters);
- Instagram/local community groups;
- the founder’s own home and office.

For each request capture:

- category and description in the customer’s words;
- 2–5 photos;
- approximate area/pincode (never the exact address);
- budget range or “not sure”;
- urgency (today / this week / this month);
- preferred contact method and consent to be contacted;
- whether they would pay a platform fee or accept a commission-inclusive quote.

A request is real if the customer will let a provider visit or quote. A hypothetical “I might renovate next year” is not a request.

---

## 5. Week −1: calls, commitments, and pricing

### Day 8–11: call 50 providers

Call between 10:00–13:00 and 17:00–20:00. Keep calls under 6 minutes.

**Provider call script**

> “Namaste, I’m [name] from Gefifi. We’re starting a service in [area] for [category] work. I’m not selling anything today. I’m looking for 10 good [plumbers/electricians/painters] who can respond to a customer request within 24 hours.  
>   
> Can I ask: how do you currently get work?  
> What makes a lead worth your time?  
> If I send you a job in [area] with photos and a budget, would you quote within 24 hours?  
> What would you need from me to trust it?  
> Can I send you the first one on WhatsApp?”

Record objections verbatim. The top five objections become product copy and onboarding requirements.

**What to listen for**

- Do they ask about payment, scope, or site visit first?
- Do they want a phone call or a WhatsApp message?
- Do they quote from photos or insist on a visit?
- Do they have a GSTIN, a team, and documents?
- Do they ask for a lead fee, commission, or free leads?
- What makes them ignore a lead?

### Day 8–12: test pricing

Ask, do not pitch:

- “If Gefifi brought you a job worth ₹20,000, what would a fair fee be?”
- “Would you pay ₹100–300 per qualified lead, or a percentage when the job is won?”
- “Would you pay a monthly subscription for 10 leads?”
- “Would you charge the customer more if you paid a commission?”

Record the answer, the category, and the provider’s size. Do not collect money in this sprint. The goal is a hypothesis, not revenue.

**Default hypothesis to test:** free for 90 days, then a 5–8% success fee or a ₹100–300 qualified-lead fee. Do not finalise until 10 providers answer and 5 customers react.

### Day 12–14: close the loop

- Send each committed provider one real request (with the customer’s consent) and measure response time.
- Ask 5 customers to review 2–3 provider profiles and say who they would choose and why.
- Run at least 2 site visits or ride-alongs; observe how the address is shared and what the provider does on site.
- Collect documents from the 15 most likely providers; explain the verification SLA and the 24–48h review.
- Update the list: committed, follow-up, no, wrong category.

---

## 6. Customer interview script

> “What broke or needs doing?  
> How have you handled this before?  
> What did you pay, and how did you choose the person?  
> What worried you most — price, trust, timing, or quality?  
> Would you share photos and an approximate area to get quotes?  
> Would you let a verified provider visit before you choose?  
> Would you sign a simple agreement and pay milestones directly to the provider?  
> What would make you not use this?”

Listen for trust, not features. “I don’t know who to trust” and “I don’t want to call five people” are the product.

---

## 7. Data capture and consent

- Ask permission before adding anyone to a WhatsApp follow-up list.
- Record consent source and date.
- Do not add providers to a marketing broadcast without opt-in.
- Do not collect Aadhaar.
- Do not store exact customer addresses in the repo or in analytics; use area/pincode.
- Delete the working list if a person asks.
- Keep the anonymised summary (counts, objections, quotes) in `docs/research/` after the sprint.

---

## 8. Exit gate

Start the rewrite only if **all** are true:

- [ ] One city and three categories are chosen and written down.
- [ ] 100 named providers are in the list.
- [ ] 25 providers have been called; 50 by the end of the sprint.
- [ ] 10 providers have given a written “quote within 24 hours” commitment.
- [ ] 20 real customer requests are collected, with photos and budgets where possible.
- [ ] 15 providers have documents ready or in progress.
- [ ] The top five objections and top five buying triggers are written down.
- [ ] A pricing hypothesis is written down and has at least 5 customer reactions.
- [ ] The founder has observed at least 2 site visits or ride-alongs.

If the gate fails:

- narrow the city or category and run one more week;
- do not start the rewrite to “build first and sell later”;
- if 20 requests cannot be collected, the demand wedge is wrong, not the software.

---

## 9. After code starts: keep the cadence

Acquisition does not stop on Week 1.

| Cadence | Activity |
|---|---|
| Weekly | 10 provider calls; 2 provider onboardings; 5 customer conversations |
| Weekly | Review quote rate, time to first quote, and provider activation |
| Bi-weekly | One site visit or ride-along |
| Monthly | Pricing and objection review; update the plan |

**Guardrail:** if fewer than 30% of published requests receive at least one quote in any week after Week 2, pause feature work and fix supply. The code is not the bottleneck.

---

## 10. Artefacts to keep

- `docs/research/acquisition-summary.md` — anonymised counts, objections, quotes, pricing signals.
- `docs/research/provider-list.csv` — private, not committed; or a CRM link.
- `docs/research/customer-requests.md` — anonymised request archetypes.
- Updated [verification-rubric.md](verification-rubric.md) based on the documents providers actually have.
- Updated [README.md](README.md) §2 if the city or categories change.
