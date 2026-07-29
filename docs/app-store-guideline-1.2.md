# App Store Guideline 1.2 — User-Generated Content

Backend support for Apple's UGC safety requirements.

## What Apple requires

1. Terms / EULA with zero tolerance for objectionable content (before register/login)
2. Filtering objectionable content
3. Users can flag content
4. Users can block abusive users (instant feed removal + developer notification)
5. Developer acts within 24 hours (remove content + eject offender)

## Client APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/client/legal/terms` | Active EULA (public) |
| POST | `/api/v1/client/legal/terms/accept` | Accept current version |
| GET | `/api/v1/client/legal/terms/status` | Whether re-accept needed |
| POST | `/api/v1/client/moderation/reports` | Flag listing/message/review/profile |
| GET | `/api/v1/client/moderation/reports/mine` | My reports |
| POST | `/api/v1/client/moderation/blocks` | Block user (+ notify admins) |
| DELETE | `/api/v1/client/moderation/blocks/:userId` | Unblock |
| GET | `/api/v1/client/moderation/blocks` | List blocked users |
| GET | `/api/v1/client/moderation/blocks/ids` | IDs to hide from feed instantly |

Registration now requires:

```json
{
  "acceptedTerms": true,
  "termsVersion": "1.0"
}
```

## Admin APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/admin/dashboard/moderation/content-reports` | Review queue |
| POST | `.../content-reports/:id/action` | Remove content + optional ban |
| POST | `.../content-reports/:id/dismiss` | Dismiss |
| GET/POST/DELETE | `.../filter-keywords` | Manage denylist |

## iOS app checklist for resubmission

Show Apple a screen recording that demonstrates:

1. EULA / Terms screen **before** register or login (call `GET /client/legal/terms`, require Accept)
   - The Terms API now returns stable localization keys `titleKey` / `contentKey` plus `metadata.version`; the FE language switcher should use these keys for translation and fall back to `title` / `content` (English) if needed.
2. Report / Flag on a listing, chat message, or profile (`POST /client/moderation/reports`)
3. Block user (`POST /client/moderation/blocks`) and that their listings disappear from the feed immediately (catalog filters blocked sellers when the JWT is sent; also refresh with `GET /client/moderation/blocks/ids`)

Reply in App Store Connect with that recording in **App Review Information → Notes**.

Also state that reports notify admins and are actioned within 24 hours via the admin moderation APIs.

## Architecture notes

Follows the same Clean Architecture feature pattern as `fraud-reports`:

- Domain ports + enums
- Application use-cases (one class per action) + DTOs
- Infrastructure Prisma repositories
- Presentation client/admin controllers under `ROUTE_PREFIX`
- Controllers call use-cases only (no Prisma)
