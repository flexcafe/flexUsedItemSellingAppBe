# Account Deletion Test Plan (Guideline 5.1.1(v))

API under test: `DELETE /api/v1/client/profile`  
Docs: [app-store-guideline-5.1.1.md](./app-store-guideline-5.1.1.md)

**Prerequisite:** apply migration `prisma/migrations/20260729020000_add_account_deletion` before manual QA.

---

## Automated vs manual

| Area | Automated (CI) | Manual / App Review device |
|------|----------------|----------------------------|
| Validation (`confirm`, password, admin, already deleted) | Yes — use-case + controller specs | Spot-check in Swagger optional |
| Anonymization side effects (listings, chats, profile, tokens) | Yes — repository mock spec | Spot-check DB after one delete |
| Login / JWT rejected after delete | Yes — login + JWT strategy / entity | **Required** in App Review recording |
| Re-register same phone/email | Entity/repo frees identifiers; optional manual | Recommended once in staging |
| iOS Settings → Delete Account UI flow | No (FE) | **Required** screen recording |

App Review recording still needs: sign in → navigate to delete → confirm → signed out / login fails.

---

## Happy path

1. Register (or login) a normal client account; note phone/email/password and JWT.
2. `DELETE /api/v1/client/profile` with body:

```json
{
  "currentPassword": "<correct password>",
  "confirm": "DELETE"
}
```

3. Expect `200` and `data.deleted === true` with `data.deletedAt` set.
4. `GET /api/v1/client/auth/me` with the **same** JWT → `401` (session revoked / inactive).
5. `POST /api/v1/client/auth/login` with old phone/email + password → fail (`401`, deactivated/banned/deleted).
6. Register again with the **same** phone/email → succeeds (identifiers freed).

---

## Validation / auth edge cases

| Case | Expect |
|------|--------|
| No `Authorization` header | `401` |
| Missing `currentPassword` or `confirm` | `400` |
| `confirm` is not exactly `DELETE` (e.g. `delete`, `YES`) | `400` |
| Wrong `currentPassword` | `401` |
| Admin JWT calling client delete | `403` |
| Second delete on already-deleted account | `409` |
| Unknown/missing user id in token | `404` |

---

## Business / data side effects (after successful delete)

Check DB (or admin tools) for the deleted `userId`:

| Check | Expected |
|-------|----------|
| `users.deleted_at` | Non-null |
| `users.is_active` | `false` |
| `users.nickname` | `Deleted User` |
| `users.phone` | `deleted:{userId}` |
| `users.email` / `facebook_id` | `null` |
| `auth_token_version` | Incremented |
| Seller listings previously active | `is_deleted=true`, status `ARCHIVED` |
| Chat rooms as buyer or seller | `is_active=false` |
| Location shares | `is_active=false` |
| User blocks involving user | Removed |
| Notifications for user | Removed |
| Profile PII (avatar, GPS, FB link fields, etc.) | Cleared |
| KBZ account name/phone | Anonymized |
| Transactions / reviews / fraud & content reports | Rows still exist (FK audit) |
| Public catalog `GET /client/products` | Deleted seller’s listings not shown |

---

## Regression / other

- Admin **ban** (`POST .../fraud-reports/users/:id/ban`) still works and is reversible; delete is permanent from the user’s perspective.
- Deleting user A does not change user B’s data or sessions.
- Ban alone must **not** be treated as satisfying 5.1.1(v) (PII retained; reversible).

---

## Suggested manual QA order (staging)

1. Migration applied; server on build with package version matching Swagger `info.version`.
2. Happy path steps 1–6 above via Swagger or FE.
3. Edge cases table (at least wrong password, bad confirm, second delete).
4. Spot-check one listing + one chat room for soft-close.
5. FE device recording for App Store Connect Notes.
