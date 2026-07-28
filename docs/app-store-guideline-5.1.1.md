# App Store Guideline 5.1.1(v) — Account Deletion

Backend support for permanent in-app account deletion.

## Client API

| Method | Path | Auth |
|--------|------|------|
| DELETE | `/api/v1/client/profile` | JWT |

Body:

```json
{
  "currentPassword": "user-password",
  "confirm": "DELETE"
}
```

Response `data`:

```json
{
  "deleted": true,
  "deletedAt": "2026-07-29T12:00:00.000Z"
}
```

## What deletion does

- Marks account permanently deleted (`deletedAt`) and sets `isActive: false`
- Anonymizes phone/email/Facebook/nickname/password; frees identifiers for re-registration
- Clears profile PII and KBZ Pay personal fields
- Soft-deletes all active listings
- Deactivates chat rooms and location shares
- Revokes sessions (`authTokenVersion` bump + refresh tokens removed)
- Removes blocks and notifications
- Keeps transactions, reviews, and reports for audit (without usable PII)

This is **not** a temporary deactivate/ban. Ban remains a separate admin action.

Admin accounts cannot self-delete via this endpoint.

## iOS checklist for App Review

Screen recording on a physical device:

1. Create account or sign in with demo account
2. Open account settings → **Delete account**
3. Confirm password + confirm DELETE → success
4. Show that login with the deleted account fails / user is signed out

Reply in App Store Connect with the recording in **App Review Information → Notes**.
