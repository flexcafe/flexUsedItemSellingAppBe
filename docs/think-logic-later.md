# Think / business logic — decide later

Product and trade rules that are **not** implemented today but may be needed. Review before changing chat, listings, or catalog behavior.

---

## Direct trade: per room vs per listing (no listing lock today)

**Checked:** Direct trade is scoped per **chat room** (buyer + seller + listing), **not** locked per listing.

**Today:** Another buyer **can** start direct trade on the same product. The backend does **not** reserve the listing for the first person.

### How it’s scoped today

| Scope | What happens |
|--------|----------------|
| **Per chat room** (`listingId` + `buyerId` + `sellerId`) | One active `DIRECT_TRADE` transaction per room (`getOrCreateTransaction` in `chat.repository.ts`) |
| **Per listing (product)** | **No global lock** — no check for other active direct trades on the same listing |

Examples:

- **Buyer A** ↔ seller → room 1 → direct trade 1  
- **Buyer B** ↔ seller (same listing) → room 2 → direct trade 2  

Both can call `POST /client/chats/:chatRoomId/direct-trade` at the same time. The listing is **not** marked sold/reserved and stays in public catalog.

### Same buyer + seller (one chat)

In **one** room, **either** party may call direct trade:

- **First call** → creates `transactions` row + `direct_trades` row (`StartDirectTradeUseCase` + `upsertDirectTrade`).
- **Later calls** → **reuse** that transaction, **update** meeting details, new `DIRECT_TRADE_REQUEST` chat message.

You do **not** get a second `DIRECT_TRADE` transaction for the same pair in the same room.

### What is **not** enforced

- “Only one buyer can schedule a meetup for this listing”
- Auto-hide listing from catalog when someone starts direct trade
- Block other buyers from opening chat or starting direct trade on that listing

Those would be **new** product rules if desired.

### Practical impact

- **Seller** can have **multiple** direct-trade threads on the **same product** (one per buyer).  
- Each **buyer** only sees their own room (`@@unique([listingId, buyerId, sellerId])` on `chat_rooms`).

### Options if we want “one active direct trade per listing”

Implement later in `StartDirectTradeUseCase` and/or `OpenChatRoomUseCase`:

1. Before create: query active `DIRECT_TRADE` on `listingId` (exclude `CANCELLED` / `REFUNDED` / `COMPLETED`).
2. If another room already has one → `409 Conflict` with clear message for buyer B.
3. Optional listing status e.g. `PENDING_MEETUP` when first direct trade starts; revert on cancel/complete.
4. Optional: still allow chat for other buyers but disable direct-trade / safe-pay buttons only.

**Code references:** `src/application/use-cases/chat/start-direct-trade.use-case.ts`, `src/infrastructure/repositories/chat.repository.ts` (`getOrCreateTransaction`, `upsertDirectTrade`).
