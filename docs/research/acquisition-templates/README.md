# Acquisition Templates

Use these files to run the two-week pre-code sprint in [acquisition-plan.md](../../plan/made-by-opencode/acquisition-plan.md).

## Files

| File | Use | Where it lives |
|---|---|---|
| `provider-tracker.csv` | Template: one row per named provider | Copy to `docs/research/private/`; never commit the filled copy |
| `request-tracker.csv` | Template: one row per real customer request | Copy to `docs/research/private/`; never commit the filled copy |
| `outreach-scripts.md` | Call, WhatsApp, customer, and consent scripts | Commit |
| [../acquisition-summary.md](../acquisition-summary.md) | Anonymised gate dashboard and weekly summary | Commit |
| [../customer-requests.md](../customer-requests.md) | Anonymised request archetypes and form implications | Commit |

## Setup

1. Create `docs/research/private/` (gitignored).
2. **Do not fill the CSV templates in place.** Copy both files to `docs/research/private/` and work there.
3. Remove any extra blank row if your spreadsheet adds one.
4. Keep names, phone numbers, exact addresses, document images, and consent records in the private folder or the CRM.
5. Commit only the anonymised summary: counts, objections, buying triggers, pricing signals, and channel observations.
6. Update `acquisition-summary.md` after every working session.

The provider template records WhatsApp consent, consent scope, source, and opt-out. The request template records preferred contact, consent scope, source, and opt-out. Fill them at the moment consent is given, not from memory later.

## Controlled values

Use these values so the anonymised dashboard can be counted without re-reading notes.

| Column | Values |
|---|---|
| `outcome` | `committed`, `follow_up`, `no`, `wrong_category` |
| `quote_result` | `quoted`, `declined`, `no_response`, `site_visit_needed` |
| `pricing_reaction` | `success_fee`, `lead_fee`, `free_leads`, `customer_pays_more`, `refuses`, `unclear` |
| `document_readiness` | `ready`, `partial`, `not_ready`, `unknown` |
| `verification_status` | `not_started`, `pending`, `verified`, `suspended` |
| `budget_confidence` | `firm`, `range`, `not_sure` |
| `urgency` | `today`, `this_week`, `this_month` |
| `status` (requests) | `new`, `shared`, `quoted`, `closed`, `withdrawn` |

Put exact wording in `notes`; keep the controlled column clean.

## Before you commit

Run this from the repo root and fix anything it reports:

```sh
grep -RInE '[+]91|[6-9][0-9]{4}[ -]?[0-9]{5}|[0-9]{10}|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' docs/research --exclude-dir=private
```

The only expected matches are documentation examples, not real people. Also check `git status --short` and confirm that nothing under `docs/research/private/` is staged.

## Non-negotiable rules

- No cold bulk WhatsApp. Call first and ask permission.
- No Aadhaar collection.
- No exact customer address in the repo or analytics.
- No money collection during the sprint.
- No v3 code until the gate passes.

If a person asks to be deleted, delete their row from the private file and record the request without their PII.
