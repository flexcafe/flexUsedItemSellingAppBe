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
