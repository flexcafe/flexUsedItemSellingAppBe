# Performance Testing Runbook (Chat + Product)

For the **full Ubuntu server runbook** (written tests, system API matrix, k6, 100k gate), see **[server-testing.md](./server-testing.md)**.

This repo includes k6 scripts for load testing both sections:

- Chat section: room creation, list rooms/messages, send messages, optional transactional actions
- Product section: home mix (`products` + `categories` + `slider-ads`) and product detail
- Combined suite: runs both together

## Prerequisites

1. Install k6 (local machine or CI runner).
2. Start backend (`npm run start:dev` or deployed test environment).
3. Prepare test users/products/chat rooms in the target environment.

## Scripts

- `npm run perf:k6:chat` -> `perf/k6/chat-section.js`
- `npm run perf:k6:product` -> `perf/k6/product-section.js`
- `npm run perf:k6:suite` -> `perf/k6/chat-and-product-suite.js`

## Required / optional environment variables

### Shared

- `BASE_URL` (default: `http://localhost:3000`)

### Chat script (`perf:k6:chat`)

- **Required**
  - `CHAT_TOKENS` (CSV): bearer tokens for chat participants
- **Recommended**
  - `CHAT_ROOM_IDS` (CSV): existing room ids for list/send tests
  - `CHAT_SELLER_IDS` (CSV): seller ids for room creation scenario
  - `CHAT_LISTING_IDS` (CSV): listing ids mapped to sellers above
  - `CHAT_TRANSACTION_IDS` (CSV): transaction ids for completion calls in transactional scenario
- **Feature toggle**
  - `ENABLE_CHAT_TRANSACTIONAL_FLOW=1` to include direct-trade/status/complete calls
  - default `0` (safe mode; avoids side-effect-heavy flows)

### Product script (`perf:k6:product`)

- `PRODUCT_IDS` (CSV): ids for product detail scenario
- `CATEGORY_IDS` (CSV): optional category ids for catalog filtering
- `PRODUCT_AUTH_TOKEN` (optional): token for authenticated-public tests

## Example commands

### Windows PowerShell

```powershell
$env:BASE_URL="http://localhost:3000"
$env:CHAT_TOKENS="tokenA,tokenB,tokenC"
$env:CHAT_ROOM_IDS="room1,room2"
$env:CHAT_SELLER_IDS="seller1,seller2"
$env:CHAT_LISTING_IDS="listing1,listing2"
npm run perf:k6:chat
```

```powershell
$env:BASE_URL="http://localhost:3000"
$env:PRODUCT_IDS="p1,p2,p3,p4"
$env:CATEGORY_IDS="c1,c2"
npm run perf:k6:product
```

### Bash

```bash
BASE_URL=http://localhost:3000 \
CHAT_TOKENS="tokenA,tokenB,tokenC" \
CHAT_ROOM_IDS="room1,room2" \
CHAT_SELLER_IDS="seller1,seller2" \
CHAT_LISTING_IDS="listing1,listing2" \
npm run perf:k6:chat
```

```bash
BASE_URL=http://localhost:3000 \
PRODUCT_IDS="p1,p2,p3,p4" \
CATEGORY_IDS="c1,c2" \
npm run perf:k6:product
```

## Rare-case / business-logic checks covered by load scripts

- Chat open-room retries while listing + seller combinations vary
- Message send throughput with idempotency keys
- Cursor list pressure for rooms/messages
- Optional transactional pressure: direct trade, safe-payment status, completion calls
- Product home fan-out (`products`, `categories`, `slider-ads`) under concurrent browsing
- Product detail burst on known ids

## Suggested execution sequence

1. Warm-up: run product script for 2-3 minutes.
2. Run chat script with `ENABLE_CHAT_TRANSACTIONAL_FLOW=0`.
3. Run chat script with `ENABLE_CHAT_TRANSACTIONAL_FLOW=1` in isolated staging data.
4. Run combined suite.
5. Compare p95/p99, error rates, and DB/Redis CPU/memory.
