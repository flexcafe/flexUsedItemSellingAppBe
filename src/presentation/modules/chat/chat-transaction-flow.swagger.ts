/**
 * Swagger documentation for chat, direct trade, safe payment, completion, and reviews.
 * Mirrors requirement #10 and the KBZPay verification instruction pattern.
 */

export const CHAT_CLIENT_TAG_DOC = `Buyer–seller chat, trade actions, and escrow safe payment.

**Three in-chat actions (mobile UI):**
1. **Direct trade** — meeting date/time + live location sharing between buyer and seller.
2. **Safe payment** — buyer pays admin KBZPay; admin holds funds until both sides complete; admin releases to seller.
3. **Complete transaction** — buyer and seller each confirm; then mutual reviews (stars + optional trade satisfaction text).

**Realtime:** connect to Socket.IO namespace \`/chat\` with JWT (\`auth.token\` or \`Authorization\` header).
Join room: \`chat.join\` → \`{ chatRoomId }\`. Prefer WebSocket for messages/location; HTTP endpoints are fallbacks.

**Performance:** chat lists and history use **cursor** pagination only. Set \`REDIS_URL\` in production for multi-instance Socket.IO.`;

export const CHAT_ADMIN_TAG_DOC = `Admin operations for chat safe payment (escrow).

Workflow mirrors KBZPay account verification: buyer requests → admin sends receiving phone → buyer submits transaction ID → admin verifies receipt → both parties complete trade → admin transfers to seller.

All steps create in-app notifications (\`CHAT_SAFE_PAYMENT_*_ADMIN\` / \`CHAT_SAFE_PAYMENT_*_CLIENT\`) and Pusher pushes where configured.`;

export const CHAT_TRANSACTION_FLOW_DOC = `## End-to-end trade flows

### A. Chat foundation
1. Buyer opens chat: \`POST /client/chats/rooms\` with \`listingId\` + \`sellerId\`.
2. List inbox: \`GET /client/chats/rooms?cursor=&take=20\`.
3. Load history: \`GET /client/chats/:chatRoomId/messages?cursor=&take=20\`.
4. Send text: WebSocket \`chat.message.send\` or \`POST .../messages\` (optional \`idempotencyKey\`).
5. Mark read: \`PATCH .../read\` or \`chat.message.read\`.

### B. Direct trade + location (button 1)
1. Either party: \`POST .../direct-trade\` with \`meetingDate\`, \`meetingTime\`, optional \`meetingLocation\` / coordinates.
   - Creates/updates \`DIRECT_TRADE\` transaction and \`DIRECT_TRADE_REQUEST\` chat message.
2. Each party starts sharing: \`POST .../location/start\` with GPS (\`latitude\`, \`longitude\`, \`expiresInSeconds\`).
   - Posts \`LOCATION_SHARING_STARTED\` in chat; emits \`chat.location.started\`.
3. While sharing: \`POST .../location\` or \`chat.location.update\` (max ~1 update / 3s per user).
4. Stop: \`POST .../location/stop\` or \`chat.location.stop\` → \`LOCATION_SHARING_STOPPED\` message.

### C. Safe payment escrow (button 2)
| Step | Who | API | Transaction status |
|------|-----|-----|-------------------|
| 1 Request | Buyer | \`POST .../safe-payment/request\` | \`SAFE_PAYMENT_AWAITING_INSTRUCTION\` |
| 2 Instruction | Admin | \`POST /admin/dashboard/chats/safe-payments/:id/send-instruction\` | \`SAFE_PAYMENT_INSTRUCTION_SENT\` |
| 3 Pay + submit | Buyer | Pay in KBZ app, then \`POST .../safe-payment/submit\` | \`SAFE_PAYMENT_PENDING\` |
| 4 Verify | Admin | \`POST .../safe-payments/:id/received\` | \`SAFE_PAYMENT_RECEIVED\` |
| 5 Complete (×2) | Buyer + seller | \`POST /client/chats/transactions/complete\` each | \`COMPLETED\` |
| 6 Release | Admin | \`POST .../safe-payments/:id/transferred\` | (transfer flags on safe_payment) |

**Buyer modal (step 3):** call \`GET .../safe-payment\` for \`buyerKbzAccountName\`, \`buyerKbzPhoneNumber\`, \`adminReceivingPhone\`, \`canSubmitPayment\`. Submit body: \`payerKbzName\`, \`payerKbzPhone\`, \`paymentAmount\`, \`kbzTransactionId\`.

**Chat system messages:** \`SAFE_PAYMENT_REQUESTED\`, \`SAFE_PAYMENT_INSTRUCTION_SENT\`, \`SAFE_PAYMENT_INITIATED\`, \`SAFE_PAYMENT_VERIFIED\`, \`PAYMENT_TRANSFERRED\`.

### D. Completion + reviews (button 3)
1. After admin marks payment received, **both** buyer and seller call \`POST /client/chats/transactions/complete\` with \`transactionId\`.
2. When status is \`COMPLETED\`, each party may call \`POST .../transactions/:transactionId/reviews\` once:
   - \`stars\` (1–5, required)
   - \`comment\` (optional) — **trade satisfaction** long text; no separate field.

### E. WebSocket events (namespace \`/chat\`)
| Event | When |
|-------|------|
| \`chat.safePayment.requested\` | Buyer requested safe pay |
| \`chat.safePayment.instructionSent\` | Admin sent KBZ receiving number |
| \`chat.safePayment.submitted\` | Buyer submitted txn ID |
| \`chat.safePayment.received\` | Admin confirmed receipt |
| \`chat.safePayment.transferred\` | Admin released to seller |
| \`chat.directTrade.requested\` | Direct trade scheduled |
| \`chat.location.started\` | User started location share |
| \`chat.location.updated\` | Coordinates updated |
| \`chat.location.stopped\` | User stopped sharing |
| \`chat.transaction.completed\` | One/both sides marked complete |`;

export const CHAT_OPEN_ROOM_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**This endpoint — Step A.1.** Creates or returns the unique room for (listing, buyer, seller). Buyer must not be the listing seller.`;

export const CHAT_LIST_ROOMS_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**This endpoint — Step A.2.** Cursor-paginated inbox with last message preview and unread count per room. Use \`nextCursor\` until null.`;

export const CHAT_LIST_MESSAGES_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**This endpoint — Step A.3.** Newest-first cursor pagination. System messages (safe pay, location, completion) appear here with \`type\` from \`MessageType\` enum.`;

export const CHAT_SEND_MESSAGE_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**This endpoint — Step A.4 (HTTP fallback).** Prefer \`chat.message.send\` over WebSocket. Max content 5000 chars. Optional \`idempotencyKey\` prevents duplicate sends on retry.`;

export const CHAT_MARK_READ_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**This endpoint — Step A.5.** Returns count of messages marked read for the current user in this room.`;

export const CHAT_DIRECT_TRADE_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**This endpoint — Flow B.1.** Either buyer or seller may set meeting details. Required before location sharing. Creates \`DIRECT_TRADE\` transaction if needed.`;

export const CHAT_LOCATION_START_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**This endpoint — Flow B.2.** Wire the app **Start sharing** button here (not \`POST .../location\`).

Requires active direct trade. Body: current GPS + \`expiresInSeconds\` (default 120, max 1800).

- First start: \`LOCATION_SHARING_STARTED\` chat message + \`chat.location.started\`.
- Already active: updates coordinates, \`alreadyActive: true\`, no duplicate started message.

WebSocket equivalent: \`chat.location.start\` with same body + \`chatRoomId\`.`;

export const CHAT_LOCATION_UPDATE_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**This endpoint — Flow B.3.** Updates coordinates during an active session. **Must call \`/location/start\` first** or returns 400.

Rate-limited (~1 request / 3s per user per room). Emits \`chat.location.updated\`.`;

export const CHAT_LOCATION_STOP_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**This endpoint — Flow B.4.** Deactivates this user's share session and posts \`LOCATION_SHARING_STOPPED\` to chat.`;

export const CHAT_SAFE_PAYMENT_REQUEST_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**This endpoint — Flow C step 1 (buyer only).**

Notifies all admins (\`CHAT_SAFE_PAYMENT_REQUESTED_ADMIN\`) and confirms to buyer (\`CHAT_SAFE_PAYMENT_REQUESTED_CLIENT\`). No payment details yet — admin must send KBZ receiving number next.`;

export const CHAT_SAFE_PAYMENT_STATUS_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**This endpoint — Flow C (buyer UI state).**

Returns transaction status, admin instruction fields, \`canSubmitPayment\`, and submitted payer fields if any.

When caller is the **buyer**, also returns \`buyerKbzAccountName\`, \`buyerKbzPhoneNumber\`, \`buyerKbzIsVerified\` for safe-pay modal pre-fill. Seller sees null for buyer KBZ fields.`;

export const CHAT_SAFE_PAYMENT_SUBMIT_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**This endpoint — Flow C step 3 (buyer only).**

Requires \`canSubmitPayment === true\` (admin instruction sent). Body: payer KBZ name/phone, \`paymentAmount\`, \`kbzTransactionId\`.

Posts \`SAFE_PAYMENT_INITIATED\` to chat; notifies admins (\`CHAT_SAFE_PAYMENT_SUBMITTED_ADMIN\`) and buyer (\`CHAT_SAFE_PAYMENT_SUBMITTED_CLIENT\`). Optional \`idempotencyKey\`.`;

export const CHAT_TRANSACTION_COMPLETE_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**This endpoint — Flow D step 1.**

Buyer and seller each call once with \`transactionId\`. Status progresses \`SAFE_PAYMENT_RECEIVED\` → \`BUYER_COMPLETED\` / \`SELLER_COMPLETED\` → \`COMPLETED\` when both have confirmed.

After \`COMPLETED\`, admin may release funds (\`transferred\` endpoint).`;

export const CHAT_TRANSACTION_REVIEW_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**This endpoint — Flow D step 2.**

Only when transaction status is \`COMPLETED\`. Each user reviews the other party once.

- \`stars\`: 1–5 rating (required)
- \`comment\`: optional **trade satisfaction** feedback (long text); stored as review comment — there is no separate \`tradeSatisfaction\` field.`;

export const CHAT_ADMIN_AWAITING_INSTRUCTION_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**Admin — queue before step C.2.** Lists safe payments in \`SAFE_PAYMENT_AWAITING_INSTRUCTION\` (buyer requested, waiting for admin KBZ phone). Cursor pagination.`;

export const CHAT_ADMIN_SEND_INSTRUCTION_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**Admin — Flow C step 2.** Same pattern as KBZPay verification \`send-instruction\`.

Body: \`adminReceivingPhone\`, optional \`adminNote\`. Notifies buyer (\`CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_CLIENT\`) and acting admin (\`CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_ADMIN\`). Emits \`chat.safePayment.instructionSent\`.`;

export const CHAT_ADMIN_PENDING_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**Admin — queue after buyer submit (step C.3).** Lists \`SAFE_PAYMENT_PENDING\` with payer details and \`kbzTransactionId\` for manual KBZ app verification.`;

export const CHAT_ADMIN_RECEIVED_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**Admin — Flow C step 4.** Confirms money received in admin KBZ account. Status → \`SAFE_PAYMENT_RECEIVED\`. Chat: \`SAFE_PAYMENT_VERIFIED\`.

\`adminReceivingPhone\` optional if already set at send-instruction. Notifies buyer, seller, and acting admin.`;

export const CHAT_ADMIN_TRANSFERRED_DOC = `${CHAT_TRANSACTION_FLOW_DOC}

**Admin — Flow C step 6.** Releases escrow to seller **only when transaction status is \`COMPLETED\`** (both parties marked complete).

Body: \`transferRef\` (required), optional \`adminNote\`. Notifies seller, buyer, and acting admin. Records \`isTransferred\` on safe_payment row.`;

export const CHAT_WS_EVENTS_DOC = `### WebSocket reference (namespace \`/chat\`, JWT required)

**Client → server**
- \`chat.join\` / \`chat.leave\` — \`{ chatRoomId }\`
- \`chat.message.send\` — \`{ chatRoomId, content, type?, idempotencyKey? }\`
- \`chat.message.read\` — \`{ chatRoomId }\`
- \`chat.location.start\` — \`{ chatRoomId, latitude, longitude, expiresInSeconds? }\`
- \`chat.location.update\` — same body (requires prior start)
- \`chat.location.stop\` — \`{ chatRoomId }\`

**Server → room**
- \`chat.safePayment.*\`, \`chat.directTrade.requested\`, \`chat.location.*\`, \`chat.transaction.completed\`
- Message payloads mirror HTTP \`ChatMessageResponseDto\` when published via message publisher`;
