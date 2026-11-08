# GEFIFI v3 — Data Access & Permissions Matrix (RBAC & ABAC)

> [!IMPORTANT]
> **This document is the single source of truth for all data access rules in GEFIFI v3.**  
> Any human developer or AI coding agent implementing API routes, Action Catalog handlers, database queries, or UI views **MUST strictly enforce the rules in this matrix**.  
> If an endpoint or query exposes data marked as `BLIND` or `MASKED` to an unauthorized role, it constitutes a **Severity 1 security breach** and must fail the CI pipeline.

---

## 1. Core Principles

1. **Bid Secrecy (Anti-Collusion)**: Competing providers can **never** see each other's quotes, pricing, duration, or identity on an open request.
2. **Physical Privacy (Anti-Stalking)**: A customer's exact site address (flat number, house number, building name) is **strictly masked** during open discovery and quoting. Only general locality (e.g., *"Baner, Pune"*) and spatial radius are visible. Full site address is unlocked **only after a bilateral contract is signed**.
3. **Disintermediation Defense (Anti-Poaching)**: Personal phone numbers are masked in public profiles and chat until a quote is formally placed under review or accepted.
4. **Tenant Isolation**: Users can never view or mutate resources belonging to another user unless explicitly authorized by ownership or bilateral contract association.

---

## 2. Field-Level Data Access Matrix

### Legend
- 🟢 **FULL**: Complete read and write access (as defined by action risk).
- 👁️ **VIEW**: Read-only access to full data.
- 🟡 **MASKED**: Partial / redacted view (e.g., locality only, masked phone `+91-XXXXX-1234`).
- 🚫 **BLIND / FORBIDDEN**: Zero access (`HTTP 403 / 404`). The field/row is stripped from payloads.

---

### 2.1. Projects & Requests Domain

| Entity & Field | Customer (Owner) | Expert | Supplier | Admin |
| :--- | :---: | :---: | :---: | :---: |
| **`projects.title`, `city`** | 🟢 FULL | 👁️ VIEW (if matching area) | 👁️ VIEW (if matching area) | 👁️ VIEW |
| **`requests.title`, `category`, `budget`** | 🟢 FULL | 👁️ VIEW (within service radius) | 👁️ VIEW (material requests) | 👁️ VIEW |
| **`requests.description`, `photos`** | 🟢 FULL | 👁️ VIEW (within service radius) | 👁️ VIEW (material requests) | 👁️ VIEW |
| **`requests.location.exact_address`**<br>*(House/flat number, landmark)* | 🟢 FULL | 🚫 **BLIND** during open bidding.<br>Unlocked **ONLY after contract signed**. | 🚫 **BLIND** during open bidding.<br>Unlocked **ONLY after contract signed**. | 👁️ VIEW |
| **`requests.location.general_area`**<br>*(e.g., "Kothrud, Pune", lat/lng center)* | 🟢 FULL | 👁️ VIEW | 👁️ VIEW | 👁️ VIEW |
| **`requests.visibility`** | 🟢 FULL | 👁️ VIEW (if open or invited) | 👁️ VIEW (if open or invited) | 👁️ VIEW |
| **`request_invites`** | 🟢 FULL | 👁️ VIEW (own invites only) | 👁️ VIEW (own invites only) | 👁️ VIEW |

---

### 2.2. Quotes & Bidding Domain (Bid Secrecy)

| Entity & Field | Customer (Owner) | Expert / Supplier (Author) | Competing Expert / Supplier | Admin |
| :--- | :---: | :---: | :---: | :---: |
| **`quotes.amount`** | 👁️ VIEW (all quotes on request) | 🟢 FULL (own quote) | 🚫 **STRICTLY BLIND** | 👁️ VIEW |
| **`quotes.terms`, `duration_days`** | 👁️ VIEW (all quotes on request) | 🟢 FULL (own quote) | 🚫 **STRICTLY BLIND** | 👁️ VIEW |
| **`quotes.attachments`** | 👁️ VIEW (all quotes on request) | 🟢 FULL (own quote) | 🚫 **STRICTLY BLIND** | 👁️ VIEW |
| **`quotes.version`, `history`** | 👁️ VIEW (all quotes on request) | 🟢 FULL (own quote) | 🚫 **STRICTLY BLIND** | 👁️ VIEW |
| **`quotes.status`** | 🟢 FULL (can accept/reject) | 👁️ VIEW (own quote) | 🚫 **STRICTLY BLIND** | 👁️ VIEW |

> [!CAUTION]
> **API Query Rule for Quotes**:
> When a provider queries `/api/quotes?requestId=XYZ`, the database query **must strictly include** `WHERE provider_id = :current_user_id`. Never return an array of quotes to a provider.

---

### 2.3. Contracts & Digital Agreements Domain

| Entity & Field | Customer (Party A) | Provider (Party B) | Third-Party User | Admin |
| :--- | :---: | :---: | :---: | :---: |
| **`contracts.terms_text`** | 🟢 FULL | 🟢 FULL (revision requests) | 🚫 **BLIND** | 👁️ VIEW |
| **`contracts.total_amount`** | 👁️ VIEW | 👁️ VIEW | 🚫 **BLIND** | 👁️ VIEW |
| **`contracts.payment_milestones`** | 🟢 FULL (mark paid) | 🟢 FULL (confirm receipt) | 🚫 **BLIND** | 👁️ VIEW |
| **`contracts.contract_hash`** | 👁️ VIEW | 👁️ VIEW | 🚫 **BLIND** | 👁️ VIEW |
| **`contracts.audit_certificate_pdf`** | 👁️ VIEW (downloadable) | 👁️ VIEW (downloadable) | 🚫 **BLIND** | 👁️ VIEW |
| **`contracts.status`** | 🟢 FULL | 🟢 FULL | 🚫 **BLIND** | 🟢 FULL (dispute resolve) |

---

### 2.4. Realtime Chat & Messaging Domain

| Entity & Field | Customer (Participant) | Provider (Participant) | Third-Party User | Admin |
| :--- | :---: | :---: | :---: | :---: |
| **`chat_threads`** | 👁️ VIEW (threads on own request) | 👁️ VIEW (own thread only) | 🚫 **BLIND** | 👁️ VIEW (only if disputed) |
| **`chat_messages.content`** | 🟢 FULL | 🟢 FULL | 🚫 **BLIND** | 👁️ VIEW (only if disputed) |
| **`chat_messages.voice_note_r2_url`** | 👁️ VIEW / STREAM | 👁️ VIEW / STREAM | 🚫 **BLIND** | 👁️ VIEW (only if disputed) |

---

### 2.5. User Profiles & Contact Info (Disintermediation Defense)

| Entity & Field | Self | Customer viewing Provider | Provider viewing Customer | Admin |
| :--- | :---: | :---: | :---: | :---: |
| **`users.name`, `avatar_url`** | 🟢 FULL | 👁️ VIEW | 👁️ VIEW | 👁️ VIEW |
| **`users.phone_number`** | 🟢 FULL | 🟡 **MASKED** until quote review/accept | 🟡 **MASKED** until contract signed | 👁️ VIEW (KYC audit) |
| **`users.email`** | 🟢 FULL | 🚫 **BLIND** | 🚫 **BLIND** | 👁️ VIEW |
| **`expert_profiles.categories`** | 🟢 FULL | 👁️ VIEW | 👁️ VIEW | 👁️ VIEW |
| **`expert_profiles.verification_docs`**<br>*(Aadhaar, trade licenses)* | 🟢 FULL | 🚫 **BLIND** (Only badge visible) | 🚫 **BLIND** | 🟢 FULL (approve/reject) |

---

## 3. Enforcement Implementation Standards

### 3.1. Policy Layer Location in Code
All authorization policies must reside in `packages/core/src/policies/`:
- `request.policy.ts`
- `quote.policy.ts`
- `contract.policy.ts`
- `chat.policy.ts`
- `user.policy.ts`

### 3.2. Mandatory Policy Check Pattern in Every Action

```typescript
// packages/core/src/actions/quotes/get-quote.ts
import { defineAction } from "../../action-runtime";
import { QuotePolicy } from "../../policies/quote.policy";
import { ForbiddenError, NotFoundError } from "../../errors";

export const getQuoteAction = defineAction({
  id: "quote.getById",
  roles: ["customer", "expert", "supplier", "admin"],
  risk: "READ",
  async handler(ctx, input: { quoteId: string }) {
    const quote = await db.query.quotes.findFirst({
      where: eq(quotes.id, input.quoteId)
    });
    if (!quote) throw new NotFoundError("Quote not found");

    const request = await db.query.requests.findFirst({
      where: eq(requests.id, quote.requestId)
    });

    // STRICT POLICY CHECK
    const authorized = QuotePolicy.canView(ctx.user, quote, request);
    if (!authorized) {
      throw new ForbiddenError("You are not authorized to view this quotation.");
    }

    return quote;
  }
});
```

### 3.3. Mandatory Scoped Database Queries
All Drizzle ORM query helpers in `packages/db/src/queries/` must enforce tenant filtering:

```typescript
// packages/db/src/queries/requests.ts
export async function getRequestsForProvider(user: UserSession, bounds: BoundingBox) {
  // STRICT: Provider query NEVER selects exact_address column from database!
  return db.select({
    id: requests.id,
    title: requests.title,
    category: requests.category,
    generalArea: requests.generalArea, // Locality string only!
    latitude: requests.latitude,
    longitude: requests.longitude,
    budget: requests.budget,
    status: requests.status,
    createdAt: requests.createdAt
    // exactAddress is deliberately EXCLUDED from the select projection
  })
  .from(requests)
  .where(and(
    eq(requests.status, "open"),
    sql`ST_DWithin(${requests.geom}, ST_SetSRID(ST_MakePoint(${user.lng}, ${user.lat}), 4326), ${user.serviceRadiusMeters})`
  ));
}
```

---

## 4. Automated CI Security Testing (BOLA & Data Leak Gates)

Every pull request runs automated security test suites in `tests/security/`:
1. **`quote-privacy.test.ts`**: Verifies that calling `GET /api/quotes/:id` with another provider's session returns `403 Forbidden`.
2. **`address-privacy.test.ts`**: Verifies that open request queries executed by uncontracted providers do NOT contain the `exactAddress` string.
3. **`chat-isolation.test.ts`**: Verifies that User C cannot read or post messages into the chat room of User A and User B.
4. **`phone-masking.test.ts`**: Verifies that public profile payloads mask phone digits (`+91-XXXXX-XXXX`).
