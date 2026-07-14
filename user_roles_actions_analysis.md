# GEFIFI Platform: User Roles & Actions Analysis

This document provides a comprehensive breakdown of the capabilities, workflows, and permissions for each user role inside the GEFIFI construction management marketplace.

---

## 1. Customers (`customer`)
Customers are the project visionaries and owners who post requirements, discover providers, negotiate contracts, and manage the execution of their construction projects.

### Detailed Actions
*   **Requirements & Request Management**:
    *   *Create Work Request*: Publish detailed requirements for construction services (title, description, location, category, budget/expected cost, timeline, suggested materials, images, and deadline/expiration date).
    *   *Create Material Request*: Request material procurement from suppliers (delivery location, delivery date, itemized list of items with quantities/notes, attachments, and expiration date).
    *   *Edit/Update Requests*: Modify details of an existing request, allowed **only** if the request is still in `'open'` status.
    *   *Link Requests*: Link a Material Request directly to a Work Request to manage them together.
    *   *Update Request Status*: Manually close or cancel active requests, which triggers automated system notifications to all interested/invited experts/suppliers.
*   **Discovery & Outreach**:
    *   *Express Interest in a Provider*: Initiate contact with an expert or supplier. This automatically starts/retrieves a Chat session and sends a templated message.
    *   *Invite Providers (Batch Action)*: Invite multiple experts to a Work Request or suppliers to a Material Request at once by providing an array of user IDs.
*   **Quote Review & Decisioning**:
    *   *View Quotes*: View all quotes/bids submitted by different experts or suppliers for their requests.
    *   *Update Quote Review State*: Mark a quote as `'under_review'`.
    *   *Accept Quote (Cascading Flow)*: Accept a bid, which automatically:
        1. Sets the quote status to `'accepted'`.
        2. **Batch rejects** all other competing quotes on the same request.
        3. Updates the original request status to `'contracted'`.
        4. Posts a system notification message inside the chat thread.
    *   *Reject Quote*: Explicitly reject a bid, marking its status as `'rejected'`.
*   **Digital Contract Management**:
    *   *Draft a Contract*: Formulate a detailed digital contract linked to a request (specifying payment terms, advance payments, total amount, work details, timelines, and legal clauses).
    *   *Request Revisions*: Send the contract back for edits by posting a comment of type `'revision_request'`, which automatically updates the status to `'revision_requested'` and sends a notification. Supports uploading up to 5 file attachments.
    *   *Edit Contract Terms*: Update contract terms and manage attachments, permitted **only** when the contract is in `'revision_requested'` status. Saving resets the status to `'draft'`.
    *   *Digitally Sign Contract*: Provide final approval. Once both the customer and provider sign, the contract moves to `'signed'`.
    *   *Update Contract Status*: Manually transition contract status (e.g. `'in_progress'`, `'completed'`, `'disputed'`, `'cancelled'`, or `'terminated'`).
*   **Project Progress & Verification**:
    *   *Update Component Status*: Update the status of the project's work component (e.g. to `'Completed'` or `'Disputed'`) or material component (e.g. to `'Delivered'`). The action appends to `statusHistory` and sends an automated chat alert to the expert/supplier.
*   **Chat Collaboration**: Directly chat with providers, share documents/images, and send voice recordings.

### Multiple / Sequential Actions (Workflows)
1.  **Procurement to Contracting Flow**: Create Request $\rightarrow$ Invite Providers $\rightarrow$ View incoming quotes $\rightarrow$ Accept Quote (automatically rejects others and transitions request to contracted) $\rightarrow$ Initiate Contract $\rightarrow$ Review revisions requested by provider $\rightarrow$ Edit Contract $\rightarrow$ Sign Contract.
2.  **Verification Flow**: View project status $\rightarrow$ Receive progress/delivery alert from provider $\rightarrow$ Inspect work or delivery $\rightarrow$ Mark component status as `'Completed'` (or `'Disputed'`).

---

## 2. Experts (`expert`)
Experts are construction professionals (builders, plumbers, electricians, etc.) offering specialized services.

### Detailed Actions
*   **Complete Profile & Verification**: After OTP verification, register personal profile details.
    *   *Expertise Selector*: Add details like name, experience, location, and specific skills (e.g., "Plumbing", "Electrical Work").
    *   *Avatar Upload*: Upload profile avatar to Google Cloud Storage.
*   **Browse Work Requests**: View all open construction/work requirements posted by customers on the marketplace.
*   **Express Interest**: Signal intent to work on a work request.
    *   *Details*: Sends a template/custom message to the customer, initiating a new chat thread, and appending the expert's UID to `interestedExperts` on the request.
*   **Quote Submission**: Submit bids for work requests.
    *   *Details*: Specify amount, validity duration, additional terms, and upload supporting documents (up to 10 files).
*   **Quote Revision (Version Control)**: Revise existing quotes.
    *   *Details*: Creates a new quote object with an incremented version number, linking to the original quote via `parentQuoteId`, while marking the old quote status as `'revised'`.
*   **Contract Negotiation & Signing**:
    *   *Comment/Revise Request*: Collaborate on draft contracts by adding comments or revision requests (with files).
    *   *Digital Signature*: Digitally sign contracts with optional signature comments and proof files.
*   **Project Component Management**:
    *   *Status Progression*: Progress the project's work component through states (e.g., `'In Progress'`, `'Awaiting Review'`). This appends to the history timeline and alerts the customer.
*   **Chat Collaboration**: Directly chat with the customer, send files/images, and send voice recordings.

### Multiple / Sequential Actions (Workflows)
1.  **Work Procurement Flow**: Browse requests $\rightarrow$ Express Interest (starts Chat) $\rightarrow$ Submit Quote $\rightarrow$ Receive Revision Request $\rightarrow$ Revise Quote (version increments) $\rightarrow$ Quote Accepted $\rightarrow$ Contract Created $\rightarrow$ Request Contract Revision $\rightarrow$ Contract Signed.
2.  **Work Execution & Delivery Flow**: Contract becomes Active $\rightarrow$ Move status to `'In Progress'` $\rightarrow$ Execute work $\rightarrow$ Move status to `'Awaiting Review'` $\rightarrow$ Customer approves work $\rightarrow$ Move status to `'Completed'`.

---

## 3. Suppliers (`supplier`)
Suppliers are resource providers who offer materials (cements, bricks, steel, paints, etc.).

### Detailed Actions
*   **Complete Profile & Verification**: Set up supplier profile details.
    *   *Company Details*: Add details like company name, location, experience, and material category (e.g., "Cement & Steel", "Paints & Finishes").
    *   *Avatar Upload*: Upload company logo/avatar.
*   **Browse Material Requests**: Browse all material requirements posted by customers on the marketplace.
*   **Express Interest**: Express interest in providing materials.
    *   *Details*: Adds supplier's UID to `interestedSuppliers` and initiates/retrieves a chat thread with the customer.
*   **Quote Submission**: Submit material supply quotes.
    *   *Details*: Provide material pricing, validity date, delivery timelines, terms, and specifications/catalog documents.
*   **Quote Revision (Version Control)**: Revise pricing/terms if market conditions or requirements change, incrementing the quote version.
*   **Contract Negotiation & Signing**: Sign or comment on material-specific contracts.
*   **Supply Component Management**:
    *   *Fulfilment Tracking*: Update material fulfillment states (e.g., `'Dispatched'`, `'Delivered'`), appending timestamps and notifying the customer in chat.
*   **Chat Collaboration**: Direct communication with the customer, sharing invoices/catalogs and sending voice messages.

### Multiple / Sequential Actions (Workflows)
1.  **Material Procurement Flow**: Browse requests $\rightarrow$ Express Interest $\rightarrow$ Submit Quote $\rightarrow$ Receive Revision Request $\rightarrow$ Revise Quote (version increments) $\rightarrow$ Quote Accepted $\rightarrow$ Contract Created $\rightarrow$ Sign Contract.
2.  **Fulfillment Flow**: Contract Active $\rightarrow$ Move status to `'Dispatched'` (notifies customer) $\rightarrow$ Move status to `'Delivered'` $\rightarrow$ Customer confirms receipt $\rightarrow$ Move status to `'Completed'`.

---

## 4. Common Actions (All Three Roles)
These actions are available to **Customers**, **Experts**, and **Suppliers**:

| Feature Area | Actions | Code Reference |
| :--- | :--- | :--- |
| **Authentication** | Request OTP via Twilio, verify OTP, register userType, log in via Google Sign-In. | [auth.ts](file:///Users/r4h335/.gemini/antigravity/worktrees/gefifi/analyze-user-types/backend/src/routes/auth.ts) |
| **Profile** | Retrieve profile data, update basic fields (email, phone, name, location, experience), upload avatar/logo. | [users.ts](file:///Users/r4h335/.gemini/antigravity/worktrees/gefifi/analyze-user-types/backend/src/routes/users.ts) |
| **Chat & Collaboration** | List active chats, send text messages, upload file/image attachments, record and send audio voice notes, view typing status, track presence status. | [chat.ts](file:///Users/r4h335/.gemini/antigravity/worktrees/gefifi/analyze-user-types/backend/src/routes/chat.ts) |
| **Projects** | View active project list, view detailed project breakdown including sub-components (work & materials). | [projects.ts](file:///Users/r4h335/.gemini/antigravity/worktrees/gefifi/analyze-user-types/backend/src/routes/projects.ts) |

---

## 5. Bilateral Common Actions (Two Roles)

### Customer $\longleftrightarrow$ Expert (Work Workflow)
These actions represent collaboration points specifically between a Customer and an Expert:
*   **Work Request Collaboration**: 
    *   *Status Progression*: Both the Customer and the associated Expert can update the status of a work request.
    *   *Access*: Both parties can view full work request details.
*   **Quote Negotiation**:
    *   The expert submits and revises quotes; the customer views, places under review, and accepts/rejects them.
*   **Contract Negotiation & Signing**:
    *   Both parties collaborate on the `'expert_contract'` (work-based agreement).
    *   Both can initiate a contract, add revision requests/comments, and sign. Both signatures are required to activate the contract.
*   **Project Progress Management**:
    *   Both can update the status of the project's `workComponent`. The expert shifts the status to report progress; the customer shifts status to approve or open a dispute.

### Customer $\longleftrightarrow$ Supplier (Material Workflow)
These actions represent collaboration points specifically between a Customer and a Supplier:
*   **Material Request Collaboration**:
    *   *Status Progression*: Both the Customer and the associated Supplier can update the status of a material request.
    *   *Access*: Both parties can view full material request details.
*   **Quote Negotiation**:
    *   The supplier submits and revises quotes; the customer views, reviews, and accepts/rejects them.
*   **Contract Negotiation & Signing**:
    *   Both parties collaborate on the `'material_contract'` (supply-based agreement).
    *   Both can initiate, add comments/revisions, and sign. Both signatures are required to activate the contract.
*   **Project Progress Management**:
    *   Both can update the status of the project's `materialComponent`. The supplier marks when materials are dispatched/delivered; the customer marks when delivery is confirmed or files disputes.

---

## 6. Direct Expert $\longleftrightarrow$ Supplier Collaboration
*   **No Direct Workflows**: The platform is strictly structured around a hub-and-spoke model where the **Customer** sits at the center. 
*   Experts and Suppliers cannot chat with each other, negotiate quotes with each other, or form contracts together. Their access to each other is restricted to viewing public profiles.
