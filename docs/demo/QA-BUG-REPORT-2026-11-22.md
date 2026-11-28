# GEFIFI Demo — UI Bug Report (Customer + Supplier)

- **Date:** 22 Nov 2026
- **Environment:** <https://gefifi.at0.app> (live demo)
- **Roles exercised:** customer account and supplier account in two Chrome profiles
- **Scope:** home, requests, request create/edit/detail, status changes, chat (text/image/PDF/voice),
  contracts, quotes, professionals, profile, help, agent, role boundaries, mobile layout
- **Method:** real UI walkthrough with screenshots, console/network capture, server session inspection,
  and code cross-check against this repo. Line references are from local `HEAD`; the deployed bundle
  may not match the checkout exactly.

> Severity is demo impact, not a formal CVSS rating.
> P0 = blocks a core demo flow, P1 = major/customer-visible, P2 = moderate/UX or workflow gap,
> P3 = minor.
> Quote acceptance and contract signing were **not** executed, per `AGENTS.md`
> (“anything beyond contract draft: stop and do not guess”). Those flows remain unverified.

## Summary

| #   | Severity | Area             | Finding                                                                                        |
| --- | -------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| 1   | **P0**   | Agent            | Tiny/invalid images in agent chat produced no reply and left the session unanswered            |
| 2   | **P0**   | Agent            | Agent replies are not rendered live in new sessions until reload                               |
| 3   | **P0**   | Chat             | Floating Assistant button covers the send/voice button                                         |
| 4   | **P0**   | Chat/requests    | Request “Chat” opens the wrong conversation; notifications go to the wrong chat                |
| 5   | **P1**   | Chat             | PDF attachment viewer always fails with “Unable to load PDF / Failed to fetch”                 |
| 6   | **P1**   | Security         | Quote/contract attachments are publicly readable without authentication                        |
| 7   | **P1**   | Help             | Help page enters an infinite reactive loop, floods console, freezes/crashes the browser        |
| 8   | **P1**   | Contracts        | Contract form accepts impossible money/date values                                             |
| 9   | **P1**   | Contracts/quotes | Draft contract immediately marks the request CONTRACTED; quotes stay open                      |
| 10  | **P1**   | Quotes           | Quote status counters are wrong (submitted quote shows “Under Review 0”)                       |
| 11  | **P1**   | Dashboard        | “Active Contracts” / “Active Requests” counts disagree between home and list pages             |
| 12  | **P1**   | Profile          | Profile GET calls the wrong host and fails; optional fields cannot be cleared                  |
| 13  | **P1**   | Requests         | “More” actions button on request detail does nothing                                           |
| 14  | **P1**   | Requests         | Status update reports success but the UI keeps the old status until reload                     |
| 15  | **P1**   | Contracts        | “Link Contract” dropdown labels all contracts identically                                      |
| 16  | **P2**   | Contracts        | Work-request contracts display as “Material Contract”; Expert filter returns 0                 |
| 17  | **P2**   | Requests         | Edit form pre-fills timeline with the literal “Not specified”; category lists disagree         |
| 18  | **P2**   | Professionals    | Cards are not clickable, so there is no profile/ratings view                                   |
| 19  | **P2**   | Help/routes      | Dead help links and legal pages: `/material-requests`, `/work-requests`, Terms, Privacy        |
| 20  | **P2**   | Requests         | Material request detail has no customer status/edit/cancel actions                             |
| 21  | **P2**   | Roles            | Supplier can open the customer-only create-work-request form (403 only on submit)              |
| 22  | **P2**   | Agent            | Raw model reasoning and hidden instructions are shown to the user                              |
| 23  | **P2**   | Agent            | Approval cards duplicate text and still say “confirmation required” after completion           |
| 24  | **P2**   | Quoting          | Quote review omits entered delivery time and payment terms                                     |
| 25  | **P2**   | Auth             | Login page logs “Google Client ID not found or Google script not loaded”                       |
| 26  | **P3**   | Chat             | Text-only messages show “Uploading files…” and “0 file selected”                               |
| 27  | **P3**   | Runtime          | `effect_update_depth_exceeded` also fires when playing a voice message / opening Send Interest |
| 28  | **P3**   | Contracts        | Link Contract modal ignores Escape                                                             |
| 29  | **P3**   | Requests         | Empty search state uses the wrong copy (“You haven’t created any requests…”)                   |
| 30  | **P3**   | Contracts        | “Filters applied” appears when only the sort order changed                                     |
| 31  | **P3**   | Requests         | Empty “Quick Actions” card for a request in discussion                                         |
| 32  | **P3**   | Console          | Material request pages always log a 404 for the work-request fallback                          |
| 33  | **P3**   | Navigation       | One direct deep link showed a blank page after a dynamic-import failure                        |
| 34  | **P1**   | Security         | User JWT is persisted in the agent session state                                               |
| 35  | **P2**   | Contracts        | Contract-card “Request” button navigates the card and opens a second tab                       |
| 36  | **P3**   | Navigation       | Home dashboard/Agent toggle label is ambiguous when Agent view is active                       |
| 37  | **P1**   | Agent            | Approval cards can be confirmed again on another browser/device and create duplicates          |
| 38  | **P1**   | Agent/Roles      | Supplier and expert accounts have no Agent link or floating button, so their dedicated agents are undiscoverable |
| 39  | **P1**   | Quotes           | Quote submission returns 500 when the optional additional-terms field is omitted                |

## Fix status — branch `fix/demo-ui-bugs-2026-11-23`

Legend: **✅ verified fixed** (retested in the UI on the local production build against the demo API),
**🟡 code fixed, awaiting deploy** (backend/agent or external-origin change not deployable from this
environment), **⛔ blocked** (needs infrastructure/credentials), **🟠 open** (not fixed or not
reproducible).

| #   | Status | Verification / remaining work                                                                                                                                                                                                                  |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ✅     | Retested with a normal 1.8 MB screenshot: the agent described it and replied live. The failure came from 1×1/2×2 test images, which now are rejected client-side with “too small to process” instead of silently poisoning the session.        |
| 2   | ✅     | New agent session: reply rendered live, no reload needed, and the session appeared in the sidebar. Added post-stream reconcile with the ADK session.                                                                                           |
| 3   | ✅     | FAB and send/voice bounds no longer overlap on desktop or mobile; click no longer blocked.                                                                                                                                                     |
| 4   | ✅     | Request → Chat now opens the invitation/request conversation, not the older conversation with the same person. Chat selection prefers `workRequestId`/`materialRequestId`.                                                                     |
| 5   | ✅     | PDF attachment renders inside the viewer; no CORS error. Viewer now embeds the storage URL directly instead of fetching a blob.                                                                                                                |
| 6   | ✅     | Verified 27 Nov: public bucket bindings removed, direct object URL returns 403, and signed URLs load chat images/PDFs, material-request attachments, root work-request images, and GCS avatars. |
| 7   | ✅     | Help loads without errors; search does not loop; console stayed at normal log counts. Firestore analytics write removed. WhatsApp placeholder replaced with email support.                                                                     |
| 8   | ✅     | Verified against deployed API: a contract POST with `total=1000`, `advance=5000` and completion before start returned `400 “Advance amount cannot be greater than the total amount.”` Unit tests and UI validation also pass. |
| 9   | ✅     | Verified end-to-end on 26 Nov with a disposable material request: customer signed → `awaiting_signatures`, request stayed `open`; supplier signed → `signed`, both signature flags true, request `contracted`. Contract UI shows SIGNED with both signatures. |
| 10  | ✅     | One submitted quote now shows **Pending Review 1**; Accept/Reject hidden on the cancelled request.                                                                                                                                             |
| 11  | ✅     | Customer home now shows 14 active requests / 7 active contracts, matching the list pages. Supplier home shows 11 available requests / 5 active contracts.                                                                                      |
| 12  | ✅     | Verified on production: profile GET returns 200, no JSON parse error, and clearing both phone and location persisted (`Phone Number: Not set`, `Location: Not set`). Follow-up #53/#54 fixed nested-map clearing. |
| 13  | ✅     | Dead **More** button removed from request detail.                                                                                                                                                                                              |
| 14  | ✅     | Status badge, details and select update immediately after save; no reload needed.                                                                                                                                                              |
| 15  | ✅     | Link Contract options now include amount/date/contract id and are distinguishable.                                                                                                                                                             |
| 16  | ✅     | Work-request contracts display as **Expert**; the Expert filter returns the two work contracts.                                                                                                                                                |
| 17  | ✅     | Edit form shows a blank timeline for empty values and the same category list as create (including Repair). Backend no longer writes the `Not specified` sentinel.                                                                              |
| 18  | ✅     | Every professional card has **View Profile** and opens a profile dialog.                                                                                                                                                                       |
| 19  | ✅     | `/terms` and `/privacy` pages exist and the landing links point to them; Help quick actions no longer target missing list routes.                                                                                                              |
| 20  | ✅     | Customer material request detail now has Update Status (Request Quotes/Cancel, Place Order, Mark Received) and a working back link.                                                                                                            |
| 21  | ✅     | Supplier session redirected from `/customer/create-work-request` to `/home`.                                                                                                                                                                   |
| 22  | ✅     | Raw thought/process blocks are no longer rendered; only the final assistant answer is shown.                                                                                                                                                   |
| 23  | ✅     | Completed approval card shows **Completed** instead of “confirmation required”; duplicate chat preview suppressed.                                                                                                                             |
| 24  | ✅     | Quote review now shows Delivery Time and Payment Terms.                                                                                                                                                                                        |
| 25  | ✅     | Production Google sign-in completed successfully after the async-script wait. Only harmless COOP `postMessage` warnings remain in the console. |
| 26  | ✅     | Text-only chat send no longer shows “Uploading files… / 0 file selected”.                                                                                                                                                                      |
| 27  | ✅     | Root cause fixed: the Find Professionals effect read the displayed list it had just written. Replaced with a pure `$derived` list and removed the profile/PII logs. Re-tested live: opening Send Interest produced no effect loop or console flood. Some legacy WebM files still trigger a WaveSurfer `MediaError`, but the component now falls back to a native audio player; playback was verified. |
| 28  | ✅     | Escape now closes Link Contract; Escape also closes the PDF viewer.                                                                                                                                                                            |
| 29  | ✅     | Search with no matches says “No requests match your search and filters.”                                                                                                                                                                       |
| 30  | ✅     | Changing only Sort by no longer shows “Filters applied.”                                                                                                                                                                                       |
| 31  | ✅     | Quick Actions card is hidden when a request has no available actions (e.g. in discussion).                                                                                                                                                     |
| 32  | ✅     | Added authenticated `GET /api/requests/:id` and switched My Requests, the quote page, and the edit page to it. Verified production: a material request loaded with one `/api/requests/:id` call and no `/work-requests/...` 404. |
| 33  | 🟠     | Blank deep link was observed once and not reproduced; likely a stale chunk/service-worker state.                                                                                                                                               |
| 34  | ✅     | Frontend sends `temp:auth_token`; ADK keeps temp state for the invocation and trims it from persisted events. Tools read temp with a legacy fallback. Verified a new production session: no raw token and no `auth_token` in state or event deltas (only `auth_data`). |
| 35  | ✅     | Contract “Request” keeps the current tab and opens only the new tab.                                                                                                                                                                           |
| 36  | ✅     | Both “AI Agent” and “Dashboard” labels are visible; active state uses styling instead of hiding the label.                                                                                                                                     |
| 37  | ✅     | Added server-side approval records with atomic claim/complete/release, approval-ID idempotency for created records, and completion retry recovery. Verified production: card completed once, local marker removed, a fresh load showed Completed from the server, and a repeated create returned the same request ID with HTTP 200. |
| 38  | ✅     | Fixed and verified on production as supplier (ARK Flooring): sidebar shows **Agent**, home shows the **AI Agent / Dashboard** toggle with the embedded panel, the FAB opens on `/my-requests`, and an embedded turn used the supplier-only **Browsing material requests** tool. Welcome copy is now role-specific. Experts share the same role-agnostic render path and `expert_agent`; live-tested 28 Nov as Ganesh (geminirahees): nav, home toggle, FAB, expert welcome copy, and `Browsing expert requests` with the Plumbing/Bangalore profile. |
| 39  | ✅     | Found during quote-acceptance testing. The quote object included undefined optional fields, which Firestore rejects. The backend now validates amount/validityDays and omits absent description/amount/additionalTerms; the revision route uses the same handling. Verified production: a quote without additional terms returns 201; `validityDays=0` returns 400. |

Verification commands run on this branch:

```sh
npm run check          # 0 errors
npm test               # 7 tests passed
cd backend && bun test src # 5 validator tests passed
npm run build          # production build completed
```

Post-merge production checks: Google sign-in, profile GET/clear, contract-term API validation, Expert
contract labels, PDF viewer, Help page, quote counters/action hiding, dashboard counts, live agent
replies, supplier agent entry points, the union request endpoint, Find Professionals interactions,
temp-token sessions, approval completion/idempotency, full two-party contract signing, quote
acceptance (accepted one, rejected the other, request contracted), optional quote fields, private
attachment delivery, contract print/Save PDF, logout/fresh Google re-login, the native-audio fallback,
and the live expert agent were re-tested on `https://gefifi.at0.app`. Merge commits: `749ccad` (follow-ups `c7c8b12`, `f470b49` for profile
clearing; `8bc129c` for agent entry points; `bd739b6` for the
remaining QA items; `07f3dd4`/`d9726ec` for signed attachments; `44ac755`/`0d33262` for voice
messages; `a911149` for contract print/Save PDF).

---

## P0 findings

### 1. Agent chat with photos produces no reply and poisons the session

**Role:** customer
**Repro**

1. Open `/agent` and start a new chat.
2. Attach two small PNG images.
3. Send: “Create a work request for a kitchen sink leak … using these two photos. Draft only.”

**Actual**

- No assistant reply appears.
- The session stays on the user message; follow-up text messages in the same session also get no reply.
- Server-side session inspection shows only the `gefifi_router_agent` event and the user event. The two
  image parts have been reduced to `{ "thought": false }` with no content.
- Network trace: the request body does contain `inlineData` (base64, `image/png`), but the SSE response
  is only ~844 bytes versus ~19 KB for a normal text turn.
- A new text-only session works, so this is specific to the attachment request.
- **Re-test 23 Nov:** a normal 1.8 MB dashboard screenshot was processed correctly by the same agent
  (it described the image and replied live). The failure was specific to the 1×1 and 2×2 test PNGs.
  The agent client now rejects images smaller than 16×16 px with a visible message instead of
  sending them and leaving the turn unanswered.

**Expected:** the agent acknowledges the photos, drafts the request, and returns an approval card.

**Impact:** invalid images could silently kill a turn. Normal photos work, so the demo path is
unblocked; validation now prevents the silent failure.

**Likely area:** inline-data handling between the frontend agent client and the Python ADK endpoint.
Frontend lives in `src/frontend/src/lib/services/agentChat.ts` and
`src/frontend/src/lib/utils/agentUtils.ts`; the agent lives in `agents/build_assist_agent/`.

---

### 2. Agent replies are not rendered live in new sessions

**Role:** customer
**Repro**

1. Start a fresh agent session.
2. Send `hi`, then `ping`, then another short message.
3. Keep the page open.

**Actual**

- Only the user messages are shown. There is no “thinking” state and no assistant bubbles.
- A direct query of the ADK session shows complete `customer_agent` replies for every turn.
- After a full page reload, all the missing assistant replies appear.
- The sidebar session list also does not show the new session until reload.

**Expected:** each streamed assistant event renders as it arrives.

**Impact:** the user reasonably concludes that the agent is broken. This was reproducible for a new
session after the image failure in finding 1.

**Likely area:** SSE event merge/reactivity in `src/frontend/src/lib/services/agentChat.ts`,
`src/frontend/src/lib/states/agent.svelte.ts`, and the agent route’s `$effect` that conditionally
fetches a session.

---

### 3. Floating Assistant button covers the chat send/voice button

**Role:** customer and supplier
**Repro**

1. Open any chat on desktop, and again at a 390 × 844 mobile viewport.
2. Type a message.

**Actual**

- The fixed Assistant FAB sits exactly on top of the send button.
- At 390 px the measured bounds overlap almost completely:
  - FAB: `x=310, y=764, w=56, h=56`
  - send/voice: `x=314, y=768, w=48, h=48`
- A normal click fails with “button … is on top of it”; only `force: true` or pressing Enter sent the
  message. On a touch device this leaves no practical way to send or record.

**Expected:** the FAB is offset above the composer, or the composer reserves space for it.

**Impact:** core chat action is blocked by the app’s own overlay.

---

### 4. Request “Chat” opens the wrong conversation; notifications go to the wrong chat

**Role:** customer and supplier
**Repro**

1. A supplier expresses interest in a new material request.
2. As the customer, open that request’s “Interested Suppliers” section and press **Chat**.
3. Also create a contract from the related chat and observe which conversation receives the system
   message.

**Actual**

- Pressing **Chat** opened an old “Painting Bedrooms” conversation instead of the new request
  conversation.
- The supplier created a draft contract for the QA material request, but the system notification
  “A new contract draft … has been created” was posted in the old “TEST - quote acceptance” chat.
- The chat list then contains three separate conversations with the same expert and three with the
  same supplier, with no request context in the list.

**Cause (code):** `RequestQuotationsTab.svelte` builds `chatMap` keyed only by the other participant’s
user ID (`src/frontend/src/lib/components/requests/RequestQuotationsTab.svelte`). Multiple chats with
the same participant collapse to one entry.

**Impact:** messages and contract context can be sent/viewed in the wrong conversation; this is both a
UX and a privacy problem.

---

## P1 findings

### 5. PDF attachment viewer always fails

**Role:** customer and supplier
**Repro:** upload a PDF to a chat → press **View file**.

**Actual:** the modal says “Unable to load PDF / Failed to fetch”. Console:

```
Access to fetch at 'https://storage.googleapis.com/geffi-demo-app-uploads/...pdf'
from origin 'https://gefifi.at0.app' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

The “Open in New Tab” fallback works.

**Expected:** in-app preview works, or the viewer defaults to the external link.

**Impact:** quote/contract PDFs cannot be reviewed in the app.

---

### 6. Quote/contract attachments are publicly readable

**Role:** both
**Repro:** open a quote attachment, copy its storage URL, fetch it without cookies/auth.

**Actual:** `curl` returns `HTTP 200` and the complete PDF. The bucket host is
`storage.googleapis.com/geffi-demo-app-uploads`. The quote PDF and chat attachment are both
retrievable unauthenticated.

**Expected:** attachments require an authenticated request or a short-lived signed URL.

**Impact:** confidential quotes, contracts, and chat files are exposed to anyone who obtains a URL.

---

### 7. Help page infinite reactive loop

**Role:** both
**Repro:** open `/help`.

**Actual**

- Console fills with `effect_update_depth_exceeded` and repeated
  `searchHelpContent called` / `Reactive search triggered` logs.
- A single visit generated over 12,000 console entries before the tab became unresponsive; one run
  disconnected both browser profiles.
- The page also writes analytics directly to Firestore (`setDoc` in
  `src/frontend/src/routes/(app)/help/+page.svelte:40`) instead of going through an Express route.
- WhatsApp support points to `https://wa.me/1234567890`, a placeholder number.

**Expected:** Help loads once, logs no loop, and support destinations are real.

**Impact:** Help is effectively unusable and can crash the browser.

---

### 8. Contract form accepts impossible values

**Role:** supplier (same form for customer)
**Repro**

1. Create a material contract from a request.
2. Set Total Amount `1000`, Advance Amount `5000`, Start Date `31 Dec 2026`, Expected Completion
   `1 Nov 2026`.
3. Submit.

**Actual:** the contract is created and displays Advance ₹5,000 against Total ₹1,000, and a completion
date before the start date. The UI and API accept it without warnings.

**Expected:** reject advance > total, negative amounts, completion before start, and similar impossible
terms.

**Impact:** invalid legal/financial documents can be produced and signed.

---

### 9. Draft contract marks the request CONTRACTED before anyone signs

**Role:** customer and supplier
**Repro**

1. Create a draft contract from an open material request.
2. Open the request after creation.
3. Try submitting another quote and check the status actions.

**Actual**

- The request immediately changes to **CONTRACTED** while the contract is still **DRAFT** with both
  signatures pending.
- The request status card offers **Mark as Completed** / **Cancel Order**.
- The supplier can still press **Submit New Quote** on the contracted request, and the customer quote
  page still exposes **Accept/Reject** on the contracted request. The supplier quote page also still
  offered **Submit New Quote** after the request was cancelled.
- Backend evidence: `backend/src/routes/contracts.ts` updates the request status to `contracted` as
  soon as the contract is created; `backend/src/routes/quotes.ts` accepts quote submissions/status
  changes without checking the request status.

**Expected:** request remains open/in-discussion until the contract is signed (or at least until both
parties accept); quote actions are disabled once contracted/cancelled.

**Impact:** workflow state no longer reflects reality; quotes and contracts can diverge.

---

### 10. Quote status counters are wrong

**Role:** customer
**Repro:** submit one quote, then open `/my-requests/<id>/quote`.

**Actual:** header shows **Total Quotes 1**, **Accepted 0**, **Under Review 0**, **Rejected 0**, while
the quote row is `SUBMITTED`. “Under Review” only counts status `under_review`
(`src/frontend/src/routes/(app)/my-requests/[id]/quote/+page.svelte`), not `submitted`.

**Expected:** submitted quotes are counted as under review, or the card is labelled to match.

---

### 11. Dashboard counts disagree with list pages

**Role:** customer and supplier
**Actual**

- Customer Home: **Active Contracts 11**; Contracts page: **Total 11, Active 7**.
- Customer Home: **Active Requests 17** while My Requests shows **Active 14 + Contracted 3** (the
  dashboard is counting contracted requests as “active”).
- Supplier Home: **Active Requests 0**; Supplier My Requests: **Active 4**.
- Supplier Home: **Active Contracts 9**; Contracts page: **Active 5**.

**Expected:** the dashboard uses the same definitions as the list pages and labels them clearly
(“Open + Contracted” if that is intended).

**Impact:** inconsistent demo numbers undermine trust in the snapshot.

---

### 12. Profile page calls the wrong host and cannot clear optional fields

**Role:** both
**Repro 1:** open `/profile` and watch the console.
**Actual:** `Error loading user profile: SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON`.
The page requests `https://gefifi.at0.app/api/users/me/profile` (the static host, which returns the SPA
HTML) instead of the backend. See `src/frontend/src/routes/(app)/profile/+page.svelte:48`.
The page then displays cached auth-store data; changes made elsewhere will not show.

**Repro 2:** clear Phone Number or Location and save.
**Actual:** “Failed to update profile.” For location alone the API reports success but the old value
remains because `validateProfileData` ignores empty strings (`backend/src/routes/shared/validation.ts`).

**Impact:** stale profile data and optional fields that can never be unset.

---

### 13. Request “More actions” button is dead

**Role:** customer and supplier
**Repro:** open any request detail and press **More** beside Edit.

**Actual:** no menu opens. In `RequestDetailHeader.svelte` the button has no click handler and is
marked “Future Enhancement”.

**Expected:** remove the button until the actions exist, or implement the menu.

---

### 14. Status update reports success but shows the old status

**Role:** customer
**Repro:** open an open work request → choose **Mark as In Discussion** (or Cancel) → Update Status.

**Actual:** “Status updated successfully!” appears, but the header badge, Request Details and status
select still show the old status. A reload shows the new status, proving the backend updated. The
child component calls `onStatusUpdate` without awaiting it and immediately shows success
(`RequestDetailActions.svelte`); the parent refresh does not update the rendered badge in time.
Cancel Request also has no confirmation.

**Expected:** the UI reflects the persisted status immediately; errors are surfaced; cancellation is
confirmed.

---

### 15. “Link Contract” dropdown cannot distinguish contracts

**Role:** both
**Repro:** contract detail → **Link Contract**.

**Actual:** every option is labelled with the _request_ ID, not the contract ID. Since all candidates
belong to the same request, the list reads:

```
Material Contract (9207ebd0...) - draft
Material Contract (9207ebd0...) - signed
Material Contract (9207ebd0...) - awaiting signatures
...
```

**Cause:** `src/frontend/src/lib/components/contracts/ContractLinking.svelte` prefers
`workRequestId/materialRequestId` over `contract.id` in the display label.

**Expected:** show title/counterparty/amount/date plus contract ID so the user can choose safely.

---

### 34. User JWT is persisted in the agent session state

**Role:** customer
**Observation:** inspecting `/apps/build_assist_agent/users/<id>/sessions/<id>` shows the full signed
JWT in `stateDelta.auth_token` on the user event. The frontend deliberately adds the token to
`state_delta` (`src/frontend/src/lib/agents.api.ts:42-49`).

**Expected:** use a short-lived scoped token, or keep it out of persisted session state and logs.

**Impact:** any session dump, support export, or agent-side log containing session state exposes the
user’s bearer token.

---

## P2 findings

### 16. Work-request contracts display as “Material Contract”

- The “Dining Table” contract is linked to a **Work Request** (Carpentry, ₹20,000) but its title and
  type are **Material Contract**; the related chat participant is shown as “ABC Supplier”.
- On both customer and supplier contract lists, the **Expert Contracts** filter returns 0 while work
  requests with contracts exist.
- This may be legacy data created before the current `contractType` derivation, but it is still what
  users see. A migration/backfill or a type derived from the linked request would fix the display.
- `backend/src/routes/contracts.ts` currently derives `expert_contract` from `workRequestId`, so new
  contracts should be correct; existing records need checking.

### 17. Edit Work Request pre-fills “Not specified” and category lists disagree

- Opening Edit on a request with no timeline puts the literal string **Not specified** in the
  Expected Timeline field. `backend/src/routes/work-requests.ts:155` stores
  `timeline: timeline || 'Not specified'` instead of leaving the field absent.
- Create Work Request categories include **Repair**; Edit includes **Flooring, Roofing, HVAC** but not
  Repair. A request created with Repair has no matching option in Edit.
- Backend also defaults category to `'General'`, which is not in either form’s option list.
- The edit form shows required asterisks but uses custom validation instead of `required`; this works
  for title/location/description, but is inconsistent with the create form.

### 18. No professional profile view or ratings

On **Find Professionals**, only the Send Interest button is interactive; clicking a name or card does
nothing. Cards show name, expertise, location and experience, but no bio, portfolio, reviews, or
ratings. The Help guide tells customers to “Review their profiles, experience, and ratings.”

### 19. Dead links and legal placeholders

- Supplier Help quick action links to `/material-requests`; Expert Help links to `/work-requests`.
  Neither route exists (`Not found` / blank page).
- Landing page Terms of Service and Privacy Policy are `href="#"`; direct `/terms` and `/privacy`
  return 404.
- Help “WhatsApp Support” is the placeholder `wa.me/1234567890`.

### 20. Material request detail has no customer actions

As the customer, a material request detail page shows only description, items, interested suppliers
and “Find & Invite Suppliers”. There is no Edit, Update Status, Cancel, or expiry action, even while
the request is open. The equivalent work-request detail has an Update Status card. (Supplier My
Requests has status actions for material requests, so the capability exists server-side.)

### 21. Supplier can open the customer-only create-work-request form

As the supplier, navigate directly to `/customer/create-work-request`. The full form renders and can be
filled; only Submit returns **“Forbidden. Only customers can create work requests.”** (HTTP 403).
The UI should redirect or block the page for non-customers.

### 22. Agent exposes raw reasoning and hidden instructions

The “Thought process” blocks show the model’s internal reasoning verbatim, including platform rules
such as “Approval mode is on…”, “Never say a message was sent unless…”, and chat IDs. This is visible
to end users and leaks implementation details.

### 23. Approval-card duplication and stale status

- A chat-message approval card repeats the message text twice (summary list + preview paragraph).
- After **Send message** / **Request created**, the card shows “Message sent” or “Request created”, but
  the subtitle still says **“Agent draft · your confirmation required”**. The agent then says “Ready —
  the card shows the current status,” which it does not.
- Source: `src/frontend/src/lib/components/agent/AgentApprovalCard.svelte` adds both `approval.summary`
  and `preview` (same content for chat messages) and hard-codes the subtitle.

### 24. Quote review step drops information

The quote wizard’s final “Review Your Quote” screen shows title, amount, validity, description and
attachments, but not the **Delivery Time** and **Payment Terms** that were entered in the previous
step. They do appear later in the quote detail modal. Users cannot verify all terms before submitting.

### 25. Login page Google Sign-In fails to initialize

While checking `/auth/login` (which correctly redirects an authenticated user), the console logged
`Google Client ID not found or Google script not loaded.` The phone-OTP form is still visible, but the
Google button cannot be trusted. Logout was not exercised to avoid losing the only test session.

---

## P3 findings

### 26. “Uploading files…” shown for text-only messages

`handleSendMessage` sets `isUploadingFiles = true` unconditionally in
`src/frontend/src/routes/(app)/chat/[chatId]/+page.svelte`. Every text message briefly displays
“Uploading files… / 0 file selected”, which is misleading.

### 27. `effect_update_depth_exceeded` beyond Help

The same Svelte runtime error fired when:

- pressing **Play audio** on a voice message in chat (then the page logged thousands of messages), and
- opening the **Send Interest** modal on Find Professionals.

It is not limited to Help and may return under repeated interaction; treat it as a shared reactive
state/effect problem.

### 28. Link Contract modal ignores Escape

Pressing Escape leaves the modal open; the only exit is the small X or Cancel. Standard modal behaviour
should include Escape and focus trapping.

### 29. Empty search state uses the wrong message

Searching for a nonexistent string on My Requests shows:

> No Requests Found — “You haven’t created any requests in this category yet.”

It should say no results match the search, with a way to clear it. The clear-search button is present
but the copy is misleading.

### 30. “Filters applied” is shown for sort changes

On My Contracts, changing only “Sort by” shows the “Filters applied” label. Sorting is not a filter.
Minor polish.

### 31. Empty “Quick Actions” card for in-discussion requests

After moving a work request to **In Discussion**, edit is hidden (reasonable) but the Quick Actions card
remains rendered with no links/buttons. The card should be hidden when it has no actions.

### 32. Material request pages log a 404 on every load

Opening a material request makes the client try `GET /api/work-requests/<id>` first, get 404, then
fall back to the material endpoint. This produces console noise on every material detail page and on
the quote page. It does not block the UI but makes diagnostics noisy.

### 33. One blank page on a deep link

Opening a contract detail from a contract list’s nested “Request” button produced a blank white page
with:

```
TypeError: Failed to fetch dynamically imported module:
https://gefifi.at0.app/_app/immutable/entry/app.BjK2fcyy.js
```

Reloading the URL fixed it. This looks like a stale chunk/service-worker mismatch and should be
re-tested after deploy; it is recorded because it was customer-visible.

### 35. Contract-card “Request” button also navigates the card

The “Request” control on a contract card is a `<button>` nested inside the card’s `<a>`. Pressing it:

- opens the related request in a new tab, and
- also navigates the current tab to the contract detail page.

`e.stopPropagation()` prevents bubbling but not the anchor’s default action. Clicking the button
should not change the current tab.

**File:** `src/frontend/src/routes/(app)/contracts/+page.svelte` (nested button inside the card anchor).

### 36. Dashboard / Agent toggle label is ambiguous

On the home dashboard, the toggle shows a dot for the active Agent view and the word **Dashboard** for
the inactive view. The active option has no visible label (only an `aria-label` of “Switch to Agent
view”), so the control reads as a single “Dashboard” button with a decorative dot. It should label both
states or use a normal two-tab control.

### 37. Approval cards can be re-confirmed on another browser/device

The “already confirmed” state of `AgentApprovalCard` is stored only in `localStorage`
(`gefifi:approval:<id>`). Opening the same agent session in another browser profile (or after clearing
storage) shows the card as pending again. Because the approval payload carries no server-side
idempotency key, pressing **Create request** a second time creates a duplicate. This was reproduced
when the same session was opened under the local preview origin.

**Expected:** confirmation state is owned by the backend/approval record, and a second confirm is
rejected as already completed.

**Impact:** duplicate requests/messages/contract drafts from one approval.

### 38. Supplier and expert accounts have no Agent entry point

**Roles:** supplier, expert

**Repro**

1. Sign in as a supplier (e.g. ARK Flooring).
2. Check the sidebar: Home, My Requests, Chat, Contracts, Help — there is no **Agent** link.
3. Check the page: the floating **Open Assistant** button is not rendered.

**Actual**

- The agent page is reachable by typing `/agent` directly and it works. Sent “Find material supply
  opportunities for me. Do not express interest yet.” on production (23 Nov): the reply used the
  supplier-specific **Browsing material requests** tool and matched the supplier profile category
  (Tiles, Marbles, Granites, Flooring Materials) and location (Bangalore). The dedicated
  `supplier_agent` is therefore deployed and routed correctly.
- Only the UI entry points are missing. The same applies to the expert role, which has its own
  `expert_agent`.

**Cause**

`src/frontend/src/routes/(app)/+layout.svelte` hard-codes the customer role in both places:

- sidebar link `{ href: '/agent', label: 'Agent', iconKey: 'agent', types: ['customer'] }` (line 50)
- FAB visibility `currentAuth.user?.userType === 'customer'` (lines 19–24)

The backend already routes by token role: `RoleRouterAgent` selects `customer_agent`,
`expert_agent`, or `supplier_agent` in `agents/build_assist_agent/agent.py` (lines 284–301).

**Not tested in the original walkthrough**

The supplier session was used for requests, chat, quotes and contracts, but the supplier Agent panel
was not exercised. This finding comes from a follow-up check on 23 Nov, after PR #52 was merged.

**Fix direction**

Include `expert` and `supplier` in both the nav link types and `showAgentFAB`, then verify a live turn
for each role. Role-specific empty-state copy would also help.

**Re-test 23 Nov (after deploy, PR #57)**

- Supplier sidebar now shows **Agent**, and the home page shows the **AI Agent / Dashboard** toggle.
- The embedded panel answered a supplier prompt and used **Browsing material requests** with the
  supplier profile's category and location.
- The floating **Open Assistant** button now opens on `/my-requests`.
- The welcome title, subtitle, and suggestion chips are now role-specific for customer, expert, and
  supplier (`AgentChatPanel.svelte`).
- The expert role was live-tested on 28 Nov as Ganesh: sidebar **Agent**, home toggle, FAB, expert
  welcome copy, and a prompt returned **Browsing expert requests** using the Plumbing/Bangalore
  profile.

**Impact**

Suppliers and experts cannot discover the assistant built for them; the demo looks like the agent is a
customer-only feature.

---

### 39. Quote submission 500 when optional fields are omitted

**Role:** supplier/expert

**Repro:** Submit a quote and leave **Additional Terms** empty (or call the API without the field).

**Actual:** HTTP 500 `Failed to submit quote`. The quote object included
`additionalTerms: undefined`, which Firestore rejects.

**Expected:** the quote is created with only the supplied fields.

**Fix:** PR #64. `amount` and `validityDays` are validated, and `description`, `amount`, and
`additionalTerms` are added only when present. The revision route uses the same handling.

**Verified 27 Nov:** a quote submitted without `additionalTerms` returned 201; `validityDays=0`
returned 400.

---

## Test data created / artefacts to clean up

- Created and then **cancelled** two QA work requests and one QA material request (titles contain
  “QA … - ignore”).
- Created one supplier quote on an existing seed request (“Taps, Fitting and Tiles”) and two quotes on
  the QA material request.
- Created one **DRAFT** material contract for the QA material request with deliberately invalid
  amounts/dates. It remains in the account because contracts have no delete action.
- Sent test chat messages and uploaded a test PDF and two tiny PNGs to a chat and to the agent.
- The customer profile’s phone was set to a fake test number and the location to `Bengaluru` while
  testing. Both were later cleared and verified as **Not set** after the #53/#54 fixes.
- Created one **QA Approval Test - ignore** work request through the agent approval card
  (`29a935d7-90c4-4d9f-abc1-dcce635f3ef9`) to verify server-side completion and idempotent retry.
- Created one **QA Signing Test - ignore** material request (`6351994e-e90d-424c-942f-d1edc2689bed`)
  and material contract (`8494d882-c701-4216-af49-3b4eff62246d`) for #9. The contract is **signed** by
  both parties and the request is **contracted**; there is no delete action for contracts.
- Quote acceptance verified on **QA Quote Acceptance Test - ignore** (`0dc6dd06-e0ab-4a69-8ef8-7a225f10900f`): one quote accepted, the other rejected, request contracted.
- Optional-field quote verified on **QA Quote Optional Fields - ignore** (`2903dac7-7a08-48b8-a453-e02e1a7517c3`), then the request was cancelled.
- Validity validation verified on **QA Quote Validation - ignore** (`cc0bf564-1356-4e5c-a3d9-ab71c850e0c8`): `validityDays=0` returned 400, then the request was cancelled.
- One QA contract was signed for verification.

## Areas not verified

- Contract revision completion (signing, print/Save PDF, and signature display are verified).
- Payment/escrow (not present in the demo scope).
- Firestore security-rule enforcement under a hostile client; testing used the UI only.

---

## Making attachments private (#6) — completed 27 Nov

Completed: the public `allUsers` binding was removed and a direct object URL now returns 403. The app
uses the signed-URL layer merged in PRs #61/#62 and all sampled attachment surfaces load successfully.

The bucket is `gs://geffi-demo-app-uploads` in project `gefifi-demo-app` (project number
`591968131600`). The Cloud Run backend runs as
`591968131600-compute@developer.gserviceaccount.com` (see `cloudbuild.yaml`).

The steps below were completed on 27 Nov and remain as a recovery reference. Do not re-add public bindings.

### 1. Grant the backend read + signing permissions (completed)

Console:

1. **Cloud Storage → Buckets → geffi-demo-app-uploads → Permissions → Grant access**
   - Principal: `591968131600-compute@developer.gserviceaccount.com`
   - Role: **Storage Object Viewer**
2. **IAM → Service Accounts → `591968131600-compute@developer.gserviceaccount.com` → Permissions →
   Grant access**
   - Principal: the same service account
   - Role: **Service Account Token Creator** (needed by `file.getSignedUrl()` when the service account
     has no private key)

`gcloud` equivalent:

```sh
gcloud storage buckets add-iam-policy-binding gs://geffi-demo-app-uploads \
  --member=serviceAccount:591968131600-compute@developer.gserviceaccount.com \
  --role=roles/storage.objectViewer

gcloud iam service-accounts add-iam-policy-binding \
  591968131600-compute@developer.gserviceaccount.com \
  --member=serviceAccount:591968131600-compute@developer.gserviceaccount.com \
  --role=roles/iam.serviceAccountTokenCreator
```

### 2. Ship the app-side signed-URL layer (completed in PRs #61/#62)

The backend needs an authenticated endpoint that checks access to the chat/request/contract and
returns a short-lived signed URL for the object. The attachment components then resolve through it.
This is implemented and deployed; the app resolves storage URLs through it.

### 3. Remove public access (completed 27 Nov)

Inspect the current bindings:

```sh
gcloud storage buckets get-iam-policy gs://geffi-demo-app-uploads
```

Remove every `allUsers` / `allAuthenticatedUsers` binding. The role may be
`roles/storage.objectViewer`, `roles/storage.legacyObjectReader`, or a custom role:

```sh
gcloud storage buckets remove-iam-policy-binding gs://geffi-demo-app-uploads \
  --member=allUsers --role=roles/storage.objectViewer

gcloud storage buckets remove-iam-policy-binding gs://geffi-demo-app-uploads \
  --member=allAuthenticatedUsers --role=roles/storage.objectViewer
```

Console: **Permissions** → delete the `allUsers` and `allAuthenticatedUsers` rows.

### 4. Verify (completed)

```sh
curl -i https://storage.googleapis.com/geffi-demo-app-uploads/<known-object>
# expect 401/403
```

Then open a chat attachment, a quote PDF, and a contract attachment in the app. If signing fails with
“Cannot sign data without client_email”, the Token Creator grant in step 1 is missing.

---

## Same-supplier quote rejection — verified 27 Nov

The acceptance route previously skipped quotes from the same supplier. After the fix in
`backend/src/routes/quotes.ts`, a disposable material request with two quotes from the **same supplier**
was accepted through the production API:

- ₹4,500 quote → `accepted`
- ₹4,800 quote → `rejected`
- material request → `contracted`

The test request was cancelled and both quotes were removed after verification.

---

## Photo upload through approval card — found 27 Nov

Uploading one photo in the agent chat produced an approval card with
`attachments: ["image.png"]`, but the session artifact key was
`gefifi-photo-test.png`. Confirming failed with “Some chat attachments are no longer
available.” The agent had guessed the filename because the uploaded filename was only in the UI
message, not in the message sent to ADK.

Fix (awaiting deploy verification):

- the frontend now sends `[Uploaded Artifact: "<filename>"]` in the agent message text;
- the agent instruction says to use that exact filename, never guess `image.png`/`unknown`;
- the approval card falls back to the uploaded session artifacts when a guessed name does not match.

Code: `src/frontend/src/lib/services/agentChat.ts`,
`src/frontend/src/lib/components/agent/AgentApprovalCard.svelte`,
`agents/build_assist_agent/approval.py`.
