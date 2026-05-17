# Chat Performance Acceptance Criteria (100k Users)

## Capacity assumptions

- 100,000 registered users
- 8,000-12,000 concurrent websocket connections during peak
- 1,500+ messages per second sustained burst
- 3,000+ location updates per second burst (throttled to avoid abuse)

## Realtime architecture targets

- Socket.IO gateway nodes run stateless behind a load balancer.
- Redis adapter (`REDIS_URL`) is required for multi-instance fanout.
- PostgreSQL remains source of truth for message durability.
- Pusher is reserved for push-style user notifications, not high-frequency chat streams.

## API and websocket SLOs

- `POST /client/chats/:chatRoomId/messages` p95 latency <= 250ms
- websocket `chat.message.send` ack p95 <= 150ms
- chat list (`GET /client/chats/rooms`) p95 <= 200ms
- history (`GET /client/chats/:chatRoomId/messages`) p95 <= 220ms
- error rate <= 1% under peak test profile

## Data and query constraints

- Cursor pagination only for rooms/messages.
- No offset pagination for chat room history at scale.
- Enforce indexes:
  - `chat_rooms(buyer_id, updated_at)`
  - `chat_rooms(seller_id, updated_at)`
  - `chat_messages(chat_room_id, created_at)`
  - `chat_messages(chat_room_id, is_read, created_at)`
  - `transactions(chat_room_id, status)` and `transactions(status, created_at)`

## Backpressure and safety controls

- Idempotency keys are supported for message and safe payment submits.
- Per-user rate limits are enforced on HTTP chat actions.
- Location-share updates should be client-throttled to <= 1 update every 3s.
- Maximum message payload: 5,000 chars.

## Load testing gate (must pass before production scale-up)

1. Run staged load with websocket + HTTP mixed traffic for at least 30 minutes.
2. Maintain SLOs without queue backlog growth in Redis pub/sub.
3. Verify message ordering per room is preserved by created timestamp + id.
4. Verify no duplicate writes under retry storms using idempotency keys.
5. Verify admin safe-payment actions complete under p95 <= 300ms.

## Suggested tool profile

- k6 for HTTP and websocket mixed scripts.
- Redis and PostgreSQL metrics scraped via Prometheus.
- Alert thresholds:
  - Redis memory > 80%
  - DB CPU > 75% for 10m
  - websocket disconnect spike > 5% in 5m
