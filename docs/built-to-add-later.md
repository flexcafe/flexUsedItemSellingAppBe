# Will add later

## Using offset today (page + limit) — OK for now, consider cursor later

| Endpoint | Current | When to switch to cursor |
|----------|---------|---------------------------|
| `GET /api/v1/client/products` | `PaginatedResponseDto` + SQL `OFFSET` | Very large catalog, deep scrolling, or you drop `COUNT(*)` for performance |
| `GET /api/v1/client/products/my` | Same, per-seller listings | Seller has hundreds+ listings and scrolls far back |
| `GET /api/v1/client/users/:userId/reviews` | `page` + `limit` (offset in repo) | Public profile with many reviews |

Offset is fine when:

- Users mostly view page 1–3
- You need `total` / `totalPages` for UI
- Dataset per user stays small–medium

## No real pagination yet — add cursor when you add proper paging

| Area | Current behavior | Recommendation |
|------|------------------|----------------|
| `GET /api/v1/client/notifications` | `limit` only (first N rows) | Add cursor when you support “load more” / full history |
| Admin KBZ lists (`/admin/dashboard/auth/kbzpay/...`) | Full list returned | Add cursor (or offset) if lists get large |
| `ListWithdrawalsUseCase` | Full list by status | Offset for admin tables with filters; cursor if queue is huge |
| Facebook follow submissions | Full list | Same as admin queues |

## Seller must not browse/interact with own listing on public catalog

**Problem:** Public `GET /client/products` and `GET /client/products/:productId` show the seller’s own listings like any buyer listing. Sellers already have `GET /client/products/my` and `GET /client/products/my/:productId`. Chat open is already blocked server-side (`Seller cannot open chat as buyer` in `OpenChatRoomUseCase`); safe payment is buyer-only. Gap is discovery/UI and future buyer actions.

**Approach:** Layer **hide from feed** + **block interaction** (do not rely on frontend only).

### Backend — public catalog (`GET /client/products`)

- Add **optional JWT** on the public list route (stay `@Public()`, but if `Authorization` is valid, resolve `userId`).
- Pass `excludeSellerId: userId` into `productRepository.search` when authenticated:
  - SQL: `AND l.seller_id <> ${excludeSellerId}` (only when JWT present).
- **Guests (no token):** unchanged — cannot know who is browsing.
- **Logged-in seller:** own listings excluded from home/search results.

### Backend — public detail (`GET /client/products/:productId`)

- Same optional JWT on public detail.
- Prefer **200 with flags** (not 404) so shared/deep links still work:
  - `isOwnListing: true` when `listing.sellerId === userId`
  - `canInteract: false` for owner; `true` for other logged-in users and anonymous buyers
- Alternative (stricter): **404** for owner on public detail and document “use `/my/:productId`” — worse for shared URLs.
- FE: when `isOwnListing`, redirect or link to **My products** / edit screen.

### Backend — enforce on every buyer action

| Action | Rule |
|--------|------|
| Open chat (`POST /client/chats/rooms`) | Already: reject if `listing.sellerId === userId` |
| Safe payment request | Already: buyer only |
| Direct trade / location | Room participant rules; no seller-as-buyer path |
| Future: favorites, reports, offers | Reject if `listing.sellerId === userId` |

### Response shape (when JWT present)

Add to catalog items and public detail (Swagger + DTOs):

```json
{
  "isOwnListing": true,
  "canInteract": false
}
```

Optional: omit flags when anonymous (or set `isOwnListing: false`, `canInteract: true`).

### Frontend (mobile/web)

When `isOwnListing` / `!canInteract`:

- Hide: Chat, Safe pay, Direct trade, Buy CTAs
- Show: “This is your listing” → **My products** / edit

Do not rely on comparing `sellerId` in the client only; use server flags.

### Do not

- Hide own listings from public catalog **without** auth (impossible).
- **Frontend-only** hiding (APIs remain callable).
- Remove `sellerId` from public JSON (needed for “message seller” for real buyers).

### Implementation checklist

1. Optional-auth decorator/guard for public product routes.
2. `ProductSearchQuery.excludeSellerId` + `buildSearchWhereSql` filter.
3. `ListProductsUseCase` / `GetProductDetailUseCase` accept optional `viewerId`; set flags on DTOs.
4. Update `ProductResponseDto` / `PublicProductDetailResponseDto` + public Swagger DTOs.
5. Tests: seller not in catalog when authed; seller detail flags; guest unchanged; chat still blocked.
6. Product swagger doc: describe optional auth and flags.

## Refund logic (Safe payment escrow) — implement later

### Goal

Support **admin-driven refunds** for `SAFE_PAYMENT` transactions after the buyer has paid and/or admin has verified receipt, while keeping the system consistent with:

- Two-sided completion (`buyerCompleted` / `sellerCompleted`)
- “Authoritative transaction per chat” rule
- Listing lifecycle (`ACTIVE` → `SOLD` only on `COMPLETED`)
- Active-deal lock behavior

### When refund is allowed (recommended)

- Only for `TransactionType.SAFE_PAYMENT`
- Only when transaction is **not** `COMPLETED`
- Only when safe payment has reached at least:
  - `SAFE_PAYMENT_PENDING` (buyer submitted KBZ txn id), or
  - `SAFE_PAYMENT_RECEIVED` (admin verified)
- Reject refund if:
  - `status` is already `REFUNDED` / `CANCELLED` / `COMPLETED`
  - Either party already completed (optional stricter rule):
    - if `buyerCompleted === true` OR `sellerCompleted === true`, require a higher admin permission or reject

### State transition

- `SAFE_PAYMENT_*` → `REFUNDED`
- Also set:
  - `refundedAt` (new column suggested)
  - `refundReason` (optional text)
  - `refundedByAdminId` (audit)
- Listing must remain **not SOLD** (keep `ACTIVE` if it was still active; do not mark sold).

### DB changes (suggested)

Add to `transactions` table:

- `refunded_at TIMESTAMP NULL`
- `refund_reason TEXT NULL`
- `refunded_by_id TEXT NULL` (FK users)

Add to `safe_payments` table (optional but useful):

- `refund_transfer_ref TEXT NULL` (admin’s external KBZ reversal / internal note)

### New admin endpoints (suggested)

1. `POST /api/v1/admin/dashboard/chats/safe-payments/:transactionId/refund`
   - Body:
     - `reason?: string`
     - `refundTransferRef?: string`
   - Response: the updated transaction status (`REFUNDED`)

2. `GET /api/v1/admin/dashboard/chats/safe-payments/:transactionId/refund-preview`
   - Returns whether refund is allowed and why (for admin UI guardrails)

### Notifications and chat messages

On refund:

- Create a **chat system message** in the room:
  - `MessageType.SYSTEM`
  - metadata includes `transactionId`, `status: REFUNDED`, `reason`, `adminId`, `refundedAt`
- Create notifications:
  - Buyer: `CHAT_SAFE_PAYMENT_REFUNDED_CLIENT` (metadata: transactionId, listingId, chatRoomId, reason)
  - Seller: `CHAT_SAFE_PAYMENT_REFUNDED_CLIENT` (metadata: same + role)
  - Acting admin: `CHAT_SAFE_PAYMENT_REFUNDED_ADMIN` (metadata: transactionId, refundTransferRef)

### Active deal + retries

- If refunded transaction’s chat room is currently the listing’s `activeDealChatRoomId`, auto-clear it (unlock listing).
- Endpoint should be idempotent:
  - If already `REFUNDED`, return success without duplicating messages/notifications.

### Interaction rules after refund (client UX)

- Client should show trade as ended:
  - disable “Complete”
  - disable “Review”
  - disable “Submit safe payment” (obviously)
- Seller may select a new active deal and proceed with another buyer if listing is still `ACTIVE`.

### Tests to add later

- Refund allowed only for SAFE_PAYMENT and correct statuses
- Refund rejected for COMPLETED / CANCELLED / REFUNDED
- Idempotent behavior (no duplicate system message, no duplicate notifications)
- Active deal cleared on refund
- Listing is not marked SOLD by refund path
