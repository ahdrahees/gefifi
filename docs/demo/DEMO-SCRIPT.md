# Gefifi Demo — Contractor Script

> **Purpose:** One repeatable 12-minute demo for a construction contractor.
> **Use with:** `DEMO-PLAN.md`. **Status:** code-ready; contractor slots still TBD.

## 1. The story

You are a contractor with a site in HSR Layout. You need 50 bags of OPC 53 cement by Friday. Instead of calling five suppliers and chasing WhatsApp quotes, you tell the agent. It prepares the request, you confirm, suppliers quote, you compare, you accept, and the contract is drafted.

The point: **the agent does the paperwork; the contractor makes the decisions.**

## 2. Roles and tabs

| Role | Browser | Start page |
|---|---|---|
| Contractor / customer | `chrome-oma` | `https://gefifi.at0.app/agent` |
| Supplier | `chrome-oma-2` | `https://gefifi.at0.app/home` |

Before the demo:

- [ ] Both profiles logged in.
- [ ] Both tabs reloaded with cache bypass.
- [ ] Customer has 2 site/cement photos ready.
- [ ] Supplier home shows the open material request.
- [ ] No old test request is open.
- [ ] Agent approval mode is on (default).

## 3. Run of show

| Time | Actor | Action | What to say |
|---|---|---|---|
| 0:00 | Founder | Context | “You need 50 bags of cement for a site. Watch how little typing this takes.” |
| 0:30 | Customer | Upload 2 photos; ask: “Create a material request for 50 bags of OPC 53 cement, deliver to HSR Layout by Friday, budget ₹25,000.” | “I’m describing the job, not filling a form.” |
| 1:30 | Customer | Agent shows the draft card. Press **Create request**. | “The agent prepared it; I approved it. Nothing is created without me.” |
| 2:30 | Customer | Open the request. | “One request, with photos, quantity, location, budget.” |
| 3:00 | Supplier | Refresh `/home`; open the request; **Express Interest**; **Submit Quote**; ₹24,500; 3 days; 50% advance. | “The supplier sees the same request and quotes in minutes.” |
| 5:00 | Supplier | Submit a second quote: ₹25,200; 5 days; 100% on delivery. | “Two quotes, same supplier or two suppliers—both are comparable.” |
| 6:30 | Customer | Ask: “Compare the quotes for my cement request and recommend the best.” | “The agent reads both quotes and explains the trade-off.” |
| 7:30 | Customer | Ask: “Accept the ₹24,500 quote.” Show the **Accept quote** card. Press **Accept quote**. | “The agent proposes; I commit. One quote is accepted, the other is rejected, the request is contracted.” |
| 9:00 | Customer | Open the request; show status **contracted**. | “No spreadsheet, no status meeting.” |
| 10:00 | Customer | Ask the agent to draft a message to the supplier. Show the **Send message** card. Do not press Send unless needed. | “Even messages are drafts until I send them.” |
| 11:00 | Founder | Close | “The agent handles the busywork. You keep control of price, scope, and commitment.” |

**If the supplier flow is slow:** pre-create the two quotes before the demo and start at 6:30. Do not skip the customer approval/acceptance steps—those are the point.

**Do not demo:** old voice notes, logout/re-login, deep links copied from chat, contract revisions/PDF. These are accepted risks in §5.

## 4. Contractor slots

Fill one row per contractor before the demo. Do not invent real names or projects.

| # | Contractor | Trade | Project | Photos/docs | Done when |
|---|---|---|---|---|---|
| 1 | TBD | TBD | TBD | TBD | TBD |
| 2 | TBD | TBD | TBD | TBD | TBD |
| 3 | TBD | TBD | TBD | TBD | TBD |

Each slot needs:

- one real project or live requirement;
- 2–5 photos or a document;
- location at area/pincode level;
- budget range or “not sure”;
- the contractor’s definition of “this would save me time”.

## 5. Accepted demo risks

| Risk | Decision |
|---|---|
| Blank deep link (#33) | Not reproduced. Navigate through the UI; do not paste raw deep links. |
| Legacy voice `MediaError` | Record a new voice note for the demo; do not play old ones. |
| Logout / re-login | Do not log out during the demo. |
| Firestore hostile-client rules | Out of demo scope; not shown. |
| Expert-agent live turn | Not demoed; supplier agent is verified. |
| Contract revision / signed PDF | Not demoed; draft + two-party signing are verified. |
| Same-supplier quote rejection | Fixed and verified in production on 27 Nov. |

## 6. Reset after each demo

1. Customer: open the demo request → **Update Status** → **Cancel Request**.
2. Supplier: open **Quote Management** → delete any non-accepted quotes.
3. Start a **New chat** for the next contractor.
4. Use a fresh request title per contractor (`TEST` prefix is fine internally; rename for a real project).

Do not reuse a contracted request. Do not edit Firestore by hand.

## 7. Readiness checklist

- [ ] 3 contractor slots filled.
- [ ] 3 project descriptions + photos.
- [ ] 3 dry runs completed (one per contractor).
- [x] Functional dry run with test data completed 27 Nov: request → two quotes → accept → contracted → cleanup.
- [ ] Customer and supplier profiles logged in.
- [ ] Agent reply latency acceptable on the demo network.
- [ ] Fallback quotes prepared (if supplier flow is slow).
- [ ] Contract draft/signing path rehearsed.
- [ ] Reset steps rehearsed once.
