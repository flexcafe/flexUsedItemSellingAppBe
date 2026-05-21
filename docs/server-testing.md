# Server Testing Runbook (Ubuntu)

Complete guide for testing this backend on an **Ubuntu server** (staging or production-like). Covers:

1. **Written tests** — Jest unit tests run on the server (CI-style).
2. **System tests** — manual/API checks for every major module and edge case.
3. **Load tests** — k6 scripts (smoke + full profile).
4. **100k-user gate** — criteria from `docs/chat-performance.md`.

Use a **staging** database for destructive steps (seed, transactional chat flows). Do **not** run `db:seed` against production unless you intend to wipe all data.

---

## Table of contents

1. [Server prerequisites](#1-server-prerequisites)
2. [One-time project setup on Ubuntu](#2-one-time-project-setup-on-ubuntu)
3. [Environment variables](#3-environment-variables)
4. [Phase A — Written / automated tests (on server)](#4-phase-a--written--automated-tests-on-server)
5. [Phase B — Build and process verification](#5-phase-b--build-and-process-verification)
6. [Phase C — Full system tests (API matrix)](#6-phase-c--full-system-tests-api-matrix)
7. [Phase D — Load and performance tests (k6)](#7-phase-d--load-and-performance-tests-k6)
8. [Phase E — 100k-user readiness gate](#8-phase-e--100k-user-readiness-gate)
9. [Test result log template](#9-test-result-log-template)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Server prerequisites

Run on a fresh Ubuntu 22.04 / 24.04 VPS or staging host.

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Build tools (native modules, Prisma)
sudo apt install -y curl git build-essential ca-certificates

# Node.js 22 LTS (recommended)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

node -v   # v22.x
npm -v

# k6 (load testing)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt update && sudo apt install -y k6
k6 version

# Optional: process manager
sudo npm install -g pm2

# Optional: reverse proxy
sudo apt install -y nginx
```

**Recommended staging stack**

| Component | Purpose |
|-----------|---------|
| PostgreSQL (Supabase or self-hosted) | Primary data |
| Redis (`REDIS_URL`) | Socket.IO multi-instance fanout (required at scale) |
| Nginx | TLS termination, `TRUST_PROXY=1` on API |
| 2+ API instances | Horizontal scale behind load balancer |

---

## 2. One-time project setup on Ubuntu

```bash
# Clone (or pull latest)
cd ~
git clone <YOUR_REPO_URL> flexUsedItemSellingAppBe
cd flexUsedItemSellingAppBe

# Install dependencies
npm ci

# Configure environment (edit with real secrets)
cp .env.example .env
nano .env

# Generate Prisma client + apply migrations
npm run db:generate
npm run db:migrate:deploy

# Seed STAGING ONLY (truncates all public tables, then inserts root admin + test client)
# WARNING: wipes all application data in public schema
npm run db:seed
```

**Default seed credentials** (override in `.env` with `TEST_CLIENT_*` / `ROOT_ADMIN_*`):

| Role | Phone / email | Password |
|------|----------------|----------|
| Test client | `+959111111111` | `client-1234` |
| Root admin | `admin@example.com` | `change-me` |

---

## 3. Environment variables

Minimum for server testing:

```bash
# In .env on the server
DATABASE_URL="postgresql://..."
JWT_SECRET="long-random-secret"
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS="https://your-frontend.example.com"

# Scale / realtime (staging prod-like)
REDIS_URL="redis://127.0.0.1:6379"
TRUST_PROXY=1

# For k6 fixture collector on same host
BASE_URL="http://127.0.0.1:3000"
```

Export helpers for manual curl tests (add to `~/.bashrc` or a `test-env.sh` file):

```bash
export API="http://127.0.0.1:3000/api/v1"
# After login:
export TOKEN_CLIENT=""
export TOKEN_ADMIN=""
export ROOM_ID=""
export LISTING_ID=""
export SELLER_ID=""
export TRANSACTION_ID=""
export PRODUCT_ID=""
export CATEGORY_ID=""
export NOTIFICATION_ID=""
```

Load before curl:

```bash
source ~/test-env.sh
```

---

## 4. Phase A — Written / automated tests (on server)

Run from project root after `npm ci`. These are the **Jest `*.spec.ts` files** in `src/` (36+ spec files).

### A.1 Lint

```bash
cd ~/flexUsedItemSellingAppBe
npm run lint
```

**Pass:** exit code `0`.

### A.2 Production build

```bash
npm run build
```

**Pass:** `dist/src/main.js` exists.

### A.3 Full unit test suite

```bash
npm test
```

**Pass:** all tests green, exit code `0`.

### A.4 Module-focused test runs (faster debugging)

```bash
# Chat (30 tests — rooms, messages, direct trade, safe payment, completion, admin)
npm test -- --testPathPatterns=chat.use-cases

# Auth
npm test -- --testPathPatterns=auth.use-cases

# Product
npm test -- --testPathPatterns=product.use-cases

# Category
npm test -- --testPathPatterns=category.use-cases

# Notifications
npm test -- --testPathPatterns=notifications.use-cases

# Points / profile / slider-ads (run individually as needed)
npm test -- --testPathPatterns=points.use-cases
npm test -- --testPathPatterns=profile.use-cases
npm test -- --testPathPatterns=slider-ads.use-cases
```

### A.5 Coverage (optional, for release audit)

```bash
npm run test:cov
```

Review `coverage/lcov-report/index.html` locally or copy to your machine.

### A.6 E2E (minimal — health only today)

```bash
npm run test:e2e
```

**Note:** Current e2e only asserts `GET /api/v1/health`. Full HTTP e2e across modules is covered in **Phase C** below.

### A.7 Written-test checklist

| ID | Command | Pass |
|----|---------|------|
| A1 | `npm run lint` | ☐ |
| A2 | `npm run build` | ☐ |
| A3 | `npm test` | ☐ |
| A4 | `npm test -- --testPathPatterns=chat.use-cases` | ☐ |
| A5 | `npm run test:e2e` | ☐ |

---

## 5. Phase B — Build and process verification

### B.1 Start API (foreground smoke)

```bash
# Correct production entry (Nest outputs to dist/src/)
node dist/src/main.js
```

Or with PM2:

```bash
pm2 start dist/src/main.js --name flex-api
pm2 logs flex-api
pm2 status
```

**Pass:** logs show `Application running on http://0.0.0.0:3000` (or your `PORT`).

### B.2 Health check

```bash
curl -sS "$API/health" | jq .
```

**Pass:** HTTP `200`, body contains `"status":"ok"` (or equivalent healthy payload).

### B.3 Swagger UI

Open in browser:

```text
http://<SERVER_HOST>:<PORT>/api/docs
```

**Pass:** Swagger loads; spot-check chat + product response DTOs (not empty `{}`).

### B.4 Redis adapter (scale requirement)

```bash
grep REDIS_URL .env
# Start API and check logs — should NOT say "Socket.IO will run without Redis adapter"
```

**Pass:** `REDIS_URL` set and log shows Redis connected (no warning).

### B.5 Process checklist

| ID | Check | Pass |
|----|-------|------|
| B1 | API starts without crash | ☐ |
| B2 | `GET /api/v1/health` → 200 | ☐ |
| B3 | Swagger `/api/docs` loads | ☐ |
| B4 | `REDIS_URL` configured (staging prod-like) | ☐ |

---

## 6. Phase C — Full system tests (API matrix)

Authenticate first, then run section by section. All paths are under `/api/v1`.

### C.0 Authentication helpers

**Client login**

```bash
export API="http://127.0.0.1:3000/api/v1"

curl -sS -X POST "$API/client/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+959111111111","password":"client-1234"}' | jq .

# Set token (adjust jq path if response shape differs)
export TOKEN_CLIENT=$(curl -sS -X POST "$API/client/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+959111111111","password":"client-1234"}' \
  | jq -r '.data.tokens.accessToken')
echo "TOKEN_CLIENT=${TOKEN_CLIENT:0:20}..."
```

**Admin login**

```bash
curl -sS -X POST "$API/admin/dashboard/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"change-me"}' | jq .

export TOKEN_ADMIN=$(curl -sS -X POST "$API/admin/dashboard/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"change-me"}' \
  | jq -r '.data.tokens.accessToken')
```

**Negative: wrong password → 401**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "$API/client/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+959111111111","password":"wrong"}'
# Expect: 401
```

**Current user**

```bash
curl -sS "$API/client/auth/me" \
  -H "Authorization: Bearer $TOKEN_CLIENT" | jq .
```

| ID | Test | Method | Path | Expect | Pass |
|----|------|--------|------|--------|------|
| C0.1 | Client login | POST | `/client/auth/login` | 200 + token | ☐ |
| C0.2 | Admin login | POST | `/admin/dashboard/auth/login` | 200 + token | ☐ |
| C0.3 | Bad password | POST | `/client/auth/login` | 401 | ☐ |
| C0.4 | Me | GET | `/client/auth/me` | 200 | ☐ |

---

### C.1 Public catalog (no auth)

```bash
curl -sS "$API/client/categories" | jq .
export CATEGORY_ID=$(curl -sS "$API/client/categories" | jq -r '.data[0].id')

curl -sS "$API/client/slider-ads" | jq .

curl -sS "$API/client/products?page=1&limit=10&latitude=16.85&longitude=96.16" | jq .
export PRODUCT_ID=$(curl -sS "$API/client/products?page=1&limit=5&latitude=16.85&longitude=96.16" \
  | jq -r '.data.items[0].id')
export SELLER_ID=$(curl -sS "$API/client/products?page=1&limit=5&latitude=16.85&longitude=96.16" \
  | jq -r '.data.items[0].sellerId')

curl -sS "$API/client/products/$PRODUCT_ID" | jq .
curl -sS "$API/client/categories/$CATEGORY_ID" | jq .
```

| ID | Test | Expect | Pass |
|----|------|--------|------|
| C1.1 | List categories | 200 | ☐ |
| C1.2 | List slider ads | 200 | ☐ |
| C1.3 | List products (geo) | 200 + items | ☐ |
| C1.4 | Product detail | 200 + seller | ☐ |
| C1.5 | Category detail | 200 | ☐ |
| C1.6 | Invalid product id | 404 | ☐ |

```bash
curl -sS -o /dev/null -w "%{http_code}\n" "$API/client/products/00000000-0000-0000-0000-000000000000"
# Expect: 404
```

---

### C.2 Client products (authenticated seller)

Requires `TOKEN_CLIENT` with permission to create listings.

```bash
# List my products
curl -sS "$API/client/products/my" \
  -H "Authorization: Bearer $TOKEN_CLIENT" | jq .

# Create product (minimal example — adjust fields to match your DTO)
# curl -sS -X POST "$API/client/products" \
#   -H "Authorization: Bearer $TOKEN_CLIENT" \
#   -H "Content-Type: application/json" \
#   -d '{ ... }' | jq .

# Update / delete — use PRODUCT_ID from your listing
# curl -sS -X PATCH "$API/client/products/$PRODUCT_ID" ...
# curl -sS -X DELETE "$API/client/products/$PRODUCT_ID" ...
```

| ID | Test | Expect | Pass |
|----|------|--------|------|
| C2.1 | GET my products | 200 | ☐ |
| C2.2 | POST create product | 201 (staging) | ☐ |
| C2.3 | PATCH update | 200 | ☐ |
| C2.4 | DELETE | 200/204 | ☐ |
| C2.5 | No token → 401 | 401 | ☐ |

---

### C.3 Chat — core messaging

```bash
# Open or get room (buyer messages seller on a listing)
curl -sS -X POST "$API/client/chats/rooms" \
  -H "Authorization: Bearer $TOKEN_CLIENT" \
  -H "Content-Type: application/json" \
  -d "{\"sellerId\":\"$SELLER_ID\",\"listingId\":\"$PRODUCT_ID\"}" | jq .

export ROOM_ID=$(curl -sS -X POST "$API/client/chats/rooms" \
  -H "Authorization: Bearer $TOKEN_CLIENT" \
  -H "Content-Type: application/json" \
  -d "{\"sellerId\":\"$SELLER_ID\",\"listingId\":\"$PRODUCT_ID\"}" \
  | jq -r '.data.id')

# Inbox (enriched listing + counterparty)
curl -sS "$API/client/chats/rooms?take=20" \
  -H "Authorization: Bearer $TOKEN_CLIENT" | jq .

# Message history
curl -sS "$API/client/chats/$ROOM_ID/messages?take=20" \
  -H "Authorization: Bearer $TOKEN_CLIENT" | jq .

# Send message (idempotency)
export IDEM_KEY="manual-test-$(date +%s)"
curl -sS -X POST "$API/client/chats/$ROOM_ID/messages" \
  -H "Authorization: Bearer $TOKEN_CLIENT" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"Hello from server test\",\"type\":\"TEXT\",\"idempotencyKey\":\"$IDEM_KEY\"}" | jq .

# Duplicate idempotency → same result, no duplicate row
curl -sS -X POST "$API/client/chats/$ROOM_ID/messages" \
  -H "Authorization: Bearer $TOKEN_CLIENT" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"Hello from server test\",\"type\":\"TEXT\",\"idempotencyKey\":\"$IDEM_KEY\"}" | jq .

# Mark read
curl -sS -X PATCH "$API/client/chats/$ROOM_ID/read" \
  -H "Authorization: Bearer $TOKEN_CLIENT" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

| ID | Test | Expect | Pass |
|----|------|--------|------|
| C3.1 | POST open room | 200/201 + room id | ☐ |
| C3.2 | GET rooms (inbox) | 200 + listing/counterparty | ☐ |
| C3.3 | GET messages | 200 + cursor | ☐ |
| C3.4 | POST send message | 201 | ☐ |
| C3.5 | Idempotent resend | 200, no duplicate | ☐ |
| C3.6 | PATCH read | 200 | ☐ |
| C3.7 | Seller opens as buyer | 400 | ☐ |
| C3.8 | No auth | 401 | ☐ |

---

### C.4 Chat — direct trade & location

```bash
curl -sS -X POST "$API/client/chats/$ROOM_ID/direct-trade" \
  -H "Authorization: Bearer $TOKEN_CLIENT" \
  -H "Content-Type: application/json" \
  -d '{
    "meetingDate":"2026-12-31",
    "meetingTime":"18:00",
    "meetingLocation":"Test location",
    "meetingLatitude":16.85,
    "meetingLongitude":96.15
  }' | jq .

curl -sS -X POST "$API/client/chats/$ROOM_ID/location/start" \
  -H "Authorization: Bearer $TOKEN_CLIENT" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .

curl -sS -X POST "$API/client/chats/$ROOM_ID/location" \
  -H "Authorization: Bearer $TOKEN_CLIENT" \
  -H "Content-Type: application/json" \
  -d '{"latitude":16.85,"longitude":96.15}' | jq .

curl -sS -X POST "$API/client/chats/$ROOM_ID/location/stop" \
  -H "Authorization: Bearer $TOKEN_CLIENT" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

| ID | Test | Expect | Pass |
|----|------|--------|------|
| C4.1 | Direct trade | 201 | ☐ |
| C4.2 | Location start/update/stop | 200/201 | ☐ |

---

### C.5 Chat — safe payment & completion

Use an **isolated staging room**; these mutate transaction state.

```bash
curl -sS -X POST "$API/client/chats/$ROOM_ID/safe-payment/request" \
  -H "Authorization: Bearer $TOKEN_CLIENT" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .

curl -sS "$API/client/chats/$ROOM_ID/safe-payment" \
  -H "Authorization: Bearer $TOKEN_CLIENT" | jq .

# Submit requires valid payload per your DTO (receipt, amount, etc.)
# curl -sS -X POST "$API/client/chats/$ROOM_ID/safe-payment/submit" ...

# Admin: awaiting instruction
curl -sS "$API/admin/dashboard/chats/safe-payments/awaiting-instruction" \
  -H "Authorization: Bearer $TOKEN_ADMIN" | jq .

# Admin: send instruction (set TRANSACTION_ID from response)
# curl -sS -X POST "$API/admin/dashboard/chats/safe-payments/$TRANSACTION_ID/send-instruction" ...

# Admin: mark received / transferred
# curl -sS -X POST "$API/admin/dashboard/chats/safe-payments/$TRANSACTION_ID/received" ...
# curl -sS -X POST "$API/admin/dashboard/chats/safe-payments/$TRANSACTION_ID/transferred" ...

# Both parties complete (may need seller token)
# curl -sS -X POST "$API/client/chats/transactions/complete" \
#   -H "Authorization: Bearer $TOKEN_CLIENT" \
#   -d "{\"transactionId\":\"$TRANSACTION_ID\"}" | jq .
```

| ID | Test | Expect | Pass |
|----|------|--------|------|
| C5.1 | Request safe payment | 201 | ☐ |
| C5.2 | GET safe payment status | 200 | ☐ |
| C5.3 | Submit (valid) | 201 | ☐ |
| C5.4 | Admin instruction | 200 | ☐ |
| C5.5 | Admin received/transferred | 200 | ☐ |
| C5.6 | Complete handshake | 200 | ☐ |
| C5.7 | Post-completion review | 201 | ☐ |

---

### C.6 Admin chat (safe payment queue)

```bash
curl -sS "$API/admin/dashboard/chats/safe-payments/pending" \
  -H "Authorization: Bearer $TOKEN_ADMIN" | jq .
```

| ID | Test | Pass |
|----|------|------|
| C6.1 | Awaiting instruction list | ☐ |
| C6.2 | Pending list | ☐ |

---

### C.7 Notifications

```bash
curl -sS "$API/client/notifications" \
  -H "Authorization: Bearer $TOKEN_CLIENT" | jq .

export NOTIFICATION_ID=$(curl -sS "$API/client/notifications" \
  -H "Authorization: Bearer $TOKEN_CLIENT" | jq -r '.data.items[0].id')

curl -sS -X PATCH "$API/client/notifications/$NOTIFICATION_ID/read" \
  -H "Authorization: Bearer $TOKEN_CLIENT" | jq .

curl -sS "$API/admin/dashboard/notifications" \
  -H "Authorization: Bearer $TOKEN_ADMIN" | jq .
```

| ID | Test | Pass |
|----|------|------|
| C7.1 | Client list | ☐ |
| C7.2 | Mark read | ☐ |
| C7.3 | Admin list | ☐ |

---

### C.8 Points, profile, rank

```bash
curl -sS "$API/client/profile/rank-config" | jq .
curl -sS "$API/client/profile/points" -H "Authorization: Bearer $TOKEN_CLIENT" | jq .
curl -sS "$API/client/profile/stats" -H "Authorization: Bearer $TOKEN_CLIENT" | jq .
curl -sS "$API/client/users/$SELLER_ID/public-profile" | jq .
curl -sS "$API/client/users/$SELLER_ID/reviews" | jq .
```

| ID | Test | Pass |
|----|------|------|
| C8.1 | Rank config (public) | ☐ |
| C8.2 | Points / stats | ☐ |
| C8.3 | Public profile | ☐ |

---

### C.9 Admin — categories & slider ads

```bash
# Categories CRUD (admin)
curl -sS "$API/admin/dashboard/categories" \
  -H "Authorization: Bearer $TOKEN_ADMIN" | jq .

# Slider ads
curl -sS "$API/admin/dashboard/slider-ads" \
  -H "Authorization: Bearer $TOKEN_ADMIN" | jq .
```

| ID | Test | Pass |
|----|------|------|
| C9.1 | Admin categories list | ☐ |
| C9.2 | Admin slider ads list | ☐ |

---

### C.10 Realtime (Pusher auth)

```bash
# Client channel auth (requires valid socket_id + channel_name from Pusher client SDK)
curl -sS -X POST "$API/client/pusher/auth" \
  -H "Authorization: Bearer $TOKEN_CLIENT" \
  -H "Content-Type: application/json" \
  -d '{"socket_id":"1234.5678","channel_name":"private-user-UUID"}' | jq .
```

| ID | Test | Pass |
|----|------|------|
| C10.1 | Pusher auth | 200 (valid channel) | ☐ |

---

### C.11 Rate limits / throttling (corner cases)

```bash
# Burst public catalog from one IP (expect 429 after catalog-search-ip limit)
for i in $(seq 1 80); do
  code=$(curl -sS -o /dev/null -w "%{http_code}" \
    "$API/client/products?page=1&limit=5&latitude=16.85&longitude=96.16")
  echo "request $i -> $code"
done
# Expect: mostly 200, then 429

# Categories should stay 200 (not throttled)
curl -sS -o /dev/null -w "categories %{http_code}\n" "$API/client/categories"
```

| ID | Test | Pass |
|----|------|------|
| C11.1 | Catalog throttle | 429 after burst | ☐ |
| C11.2 | Categories not throttled | 200 | ☐ |

---

### C.12 System-test master checklist

| Section | Area | Done |
|---------|------|------|
| C0 | Auth | ☐ |
| C1 | Public catalog | ☐ |
| C2 | Seller products | ☐ |
| C3 | Chat messaging | ☐ |
| C4 | Direct trade / location | ☐ |
| C5 | Safe payment flow | ☐ |
| C6 | Admin chat | ☐ |
| C7 | Notifications | ☐ |
| C8 | Points / profile | ☐ |
| C9 | Admin CMS | ☐ |
| C10 | Pusher | ☐ |
| C11 | Throttling | ☐ |

---

## 7. Phase D — Load and performance tests (k6)

Scripts live in `perf/k6/`. See also `docs/performance-testing.md`.

### D.1 Install / verify on Ubuntu

```bash
k6 version
cd ~/flexUsedItemSellingAppBe
```

### D.2 Collect fixtures (from running API on same server)

```bash
# API must be running
export BASE_URL="http://127.0.0.1:3000"   # or your PORT
node perf/collect-fixtures.mjs > perf/k6/.env.fixtures
cat perf/k6/.env.fixtures
```

Fixtures include: `PRODUCT_IDS`, `CATEGORY_IDS`, `CHAT_TOKENS`, `CHAT_SELLER_IDS`, `CHAT_LISTING_IDS`, `CHAT_ROOM_IDS`.

**Note:** Tokens are signed with `JWT_SECRET` for load testing when seed logins are unavailable. Prefer real login tokens on staging when possible.

### D.3 Smoke profile (default — ~1–2 min each)

`run-with-fixtures.mjs` defaults to `K6_PROFILE=local` (lower VUs).

```bash
# Product: catalog + categories + sliders + detail
npm run perf:k6:product

# Chat: open room, list rooms/messages, send messages
npm run perf:k6:chat
```

With summary export:

```bash
node perf/k6/run-with-fixtures.mjs perf/k6/product-section.js \
  --summary-export=perf/k6/reports/product-summary.json

node perf/k6/run-with-fixtures.mjs perf/k6/chat-section.js \
  --summary-export=perf/k6/reports/chat-summary.json
```

### D.4 Full staging profile (~4+ min, higher VUs)

**Only on staging** with Redis + enough CPU. Do not run on a small dev laptop.

```bash
export K6_PROFILE=full
export BASE_URL="http://127.0.0.1:3000"

node perf/k6/run-with-fixtures.mjs perf/k6/product-section.js \
  --summary-export=perf/k6/reports/product-full.json

node perf/k6/run-with-fixtures.mjs perf/k6/chat-section.js \
  --summary-export=perf/k6/reports/chat-full.json
```

Optional transactional chat pressure (isolated data only):

```bash
export ENABLE_CHAT_TRANSACTIONAL_FLOW=1
node perf/k6/run-with-fixtures.mjs perf/k6/chat-section.js
```

### D.5 Combined suite

```bash
npm run perf:k6:suite
```

### D.6 Pass thresholds (from scripts)

| Script | Metric | Target |
|--------|--------|--------|
| Product | `http_req_failed` | &lt; 2% |
| Product | home catalog p95 | &lt; 350 ms |
| Product | product detail p95 | &lt; 350 ms |
| Chat | `http_req_failed` | &lt; 2% |
| Chat | list rooms p95 | &lt; 250 ms |
| Chat | list messages p95 | &lt; 280 ms |
| Chat | send messages p95 | &lt; 300 ms |
| Chat | open room p95 | &lt; 250 ms |

**Interpretation on staging:**

- High **429** on catalog/detail = per-IP throttles working (`catalog-search-ip`, `catalog-detail-ip`).
- **Open room** failures under load = duplicate `POST /rooms` or buyer/seller conflicts — add more fixture users/rooms.
- Latency above SLO = DB region, missing indexes, or need horizontal scale.

### D.7 Load-test checklist

| ID | Test | Pass |
|----|------|------|
| D1 | Fixtures collected | ☐ |
| D2 | `perf:k6:product` (local) | ☐ |
| D3 | `perf:k6:chat` (local) | ☐ |
| D4 | `K6_PROFILE=full` product (staging) | ☐ |
| D5 | `K6_PROFILE=full` chat (staging) | ☐ |
| D6 | Combined suite (staging) | ☐ |

---

## 8. Phase E — 100k-user readiness gate

From `docs/chat-performance.md`. **100,000 registered users** — not 100k concurrent.

| Requirement | Target | Verified |
|-------------|--------|----------|
| Peak concurrent WebSockets | 8,000–12,000 | ☐ |
| Message burst | 1,500+ msg/s | ☐ |
| Chat HTTP p95 | ≤ 200–250 ms | ☐ |
| Error rate under peak | ≤ 1% | ☐ |
| `REDIS_URL` + multi-instance API | Required | ☐ |
| 30+ min mixed HTTP + WS load | No SLO drift | ☐ |
| Idempotency under retry storm | No duplicates | ☐ |
| Message order per room | By `createdAt` + id | ☐ |
| Admin safe-payment p95 | ≤ 300 ms | ☐ |
| DB indexes (chat_rooms, chat_messages, transactions) | Present | ☐ |

**Gate command sequence (staging)**

```bash
# 1. Written tests
npm test && npm run build

# 2. System matrix C0–C11
# (manual curl section above)

# 3. Full k6 + monitoring
export K6_PROFILE=full
node perf/k6/run-with-fixtures.mjs perf/k6/chat-and-product-suite.js \
  --summary-export=perf/k6/reports/suite-full.json

# 4. Watch Redis memory, DB CPU, API memory during test
# redis-cli INFO memory
# htop / Grafana
```

**Verdict**

- **Ready for 100k registered users:** only after Phase E rows are checked on **staging** infrastructure.
- **Not proven** by local smoke tests alone.

---

## 9. Test result log template

Copy for each release:

```markdown
## Release test log

- **Date:**
- **Server:**
- **Git commit:**
- **Environment:** staging | production
- **Tester:**

### Phase A — Written tests
- [ ] lint
- [ ] build
- [ ] npm test (full)
- [ ] chat.use-cases
- [ ] test:e2e

### Phase B — Process
- [ ] health 200
- [ ] Redis adapter OK
- [ ] Swagger OK

### Phase C — System (C0–C11)
- [ ] All sections pass

### Phase D — k6
- [ ] product local
- [ ] chat local
- [ ] product full (staging)
- [ ] chat full (staging)
- Notes:

### Phase E — 100k gate
- [ ] Not applicable (pre-scale)
- [ ] Passed on staging
- [ ] Failed — blockers:

### Sign-off
- [ ] Approved for deploy
```

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `node dist/main` not found | Nest outputs `dist/src/main.js` | Use `node dist/src/main.js` or fix `start:prod` script |
| k6 98% failed, millions of iterations | Old `URLSearchParams` bug (fixed) | Pull latest `perf/k6/product-section.js` |
| k6 product detail all fail, few HTTP calls | `PRODUCT_IDS` not passed to k6 | Use `node perf/k6/run-with-fixtures.mjs` not raw `source .env` on Windows; on Ubuntu same |
| Catalog 429 under load | Throttle by design | Expected; test from multiple IPs or raise limits on staging |
| Chat p95 &gt; 1s | Remote DB latency | Move API closer to DB, pool tuning, indexes |
| Open room failures under k6 | Duplicate room creation | More `CHAT_*` fixture variety |
| Socket.IO no cross-node fanout | Missing `REDIS_URL` | Set Redis and restart |
| Seed wiped production | Ran `db:seed` on prod | Restore backup; seed staging only |

---

## Quick reference — all npm test commands

```bash
npm run lint
npm run build
npm test
npm run test:cov
npm run test:e2e
npm test -- --testPathPatterns=chat.use-cases
npm test -- --testPathPatterns=auth.use-cases
npm test -- --testPathPatterns=product.use-cases
npm run db:migrate:deploy
npm run db:seed                    # STAGING ONLY — wipes data
npm run perf:fixtures
npm run perf:k6:product
npm run perf:k6:chat
npm run perf:k6:suite
K6_PROFILE=full npm run perf:k6:product
K6_PROFILE=full npm run perf:k6:chat
```

---

## Related docs

- `docs/performance-testing.md` — k6 env vars and scripts
- `docs/chat-performance.md` — 100k SLOs and architecture
- `perf/k6/run-with-fixtures.mjs` — reliable env loading for k6
- `perf/collect-fixtures.mjs` — auto-build `perf/k6/.env.fixtures`
