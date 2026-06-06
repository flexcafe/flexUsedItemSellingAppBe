/**
 * Swagger documentation for the complete auth system.
 * Covers both client and admin authentication flows.
 */

export const AUTH_SYSTEM_OVERVIEW = `# Authentication system

This platform has **two separate authentication paths** — one for **clients** (buyers/sellers) and one for **admin dashboard** (staff management). They share the same \`users\` table and JWT strategy but enforce different login rules.

## Client authentication path

### 1. Registration (\`POST /client/auth/register\`)

New users sign up with:
- **phone** (unique, used for SMS OTP)
- **email** (unique, used for email verification token)
- **password** (hashed with bcrypt, 12 rounds)
- **nickname** (display name)
- **profile** fields (gender, age, marital status, region, GPS)
- **kbzPayAccount** (KBZPay account name + phone number)
- **referralId** (optional, referral code of the inviting user)

After successful registration:
- OTP is sent via SMS (SMSPoh) to the phone number.
- Email verification token is generated.
- The user receives a **registration bonus** (100 points) as a one-time milestone.
- The user is created with \`adminRoleId: null\` (not an admin).
- **No JWT tokens are issued** at registration — the user must verify their identity and log in.

### 2. Phone verification flow

| Step | Endpoint | Description |
|------|----------|-------------|
| 1 | \`POST /client/auth/otp/send\` | Request a 6-digit OTP to be sent via SMS to the registered phone |
| 2 | \`POST /client/auth/otp/verify\` | Submit the OTP code for verification |

After successful phone verification:
- \`isPhoneVerified\` is set to \`true\` on the user.
- A one-time **phone-verified bonus** (100 points) is granted.
- **No JWT issued** — user must still log in.

### 3. Email verification flow

| Step | Endpoint | Description |
|------|----------|-------------|
| 1 | \`POST /client/auth/email/send-verification\` | Request a verification token to be sent to the registered email |
| 2 | \`POST /client/auth/email/verify\` | Submit the token for verification |

After successful email verification:
- \`isEmailVerified\` is set to \`true\` on the user.
- A one-time **email-verified bonus** (100 points) is granted.
- **No JWT issued** — user must still log in.

### 4. Login (\`POST /client/auth/login\`)

Clients sign in with **phone + password**:
- Rejects **admin accounts** (\`adminRoleId !== null\`) with **403** — they must use the admin dashboard login.
- Rejects **inactive/banned** accounts.
- On success, returns \`accessToken\` only; this codebase does **not** issue a refresh token yet.
- The JWT contains:
  - \`sub\` = user UUID
  - \`phone\` = user phone
  - \`authTokenVersion\` = token revocation version
  - Standard \`iat\` / \`exp\` timestamps
- Client login returns \`user.adminRole: null\`.

### 5. KBZPay verification flow

After login, the client can complete KBZPay verification through a manual admin-mediated process:

| Step | Endpoint | Who | Description |
|------|----------|-----|-------------|
| 1 | \`POST /client/auth/kbzpay/request-verification\` | Client | Starts KBZPay verification; marks status PENDING |
| 2 | \`GET /admin/dashboard/auth/kbzpay/verification-requested\` | Admin | Lists users awaiting admin instruction |
| 3 | \`POST /admin/dashboard/auth/kbzpay/:userId/send-instruction\` | Admin | Sends admin phone number for the 100 MMK transfer |
| 4 | \`POST /client/auth/kbzpay/submit-transaction\` | Client | Submits KBZPay transaction ID after making the transfer |
| 5 | \`GET /admin/dashboard/auth/kbzpay/money-check\` | Admin | Lists users who have submitted transaction IDs |
| 6 | \`POST /admin/dashboard/auth/kbzpay/:userId/verify\` | Admin | Manually verifies and marks KBZPay as VERIFIED |
| 7 | \`GET /client/auth/me\` | Client | Confirms KBZPay status is VERIFIED |

After successful KBZPay verification:
- A one-time **KBZPay-verified bonus** (100 points) is granted.
- The user becomes eligible for point withdrawal requests.

### 6. Forgot / Reset password

| Step | Endpoint | Description |
|------|----------|-------------|
| 1 | \`POST /client/auth/forgot-password\` | Requests a password-reset OTP sent via SMS to the registered phone |
| 2 | \`POST /client/auth/reset-password\` | Submits OTP + new password to complete the reset |

- Admin accounts cannot use this flow (must use admin dashboard mechanisms).

### 7. Profile (\`GET /client/auth/me\`)

Returns the authenticated user's profile including verification states, KBZPay account status, points, and rank.

---

## Admin authentication path

### 1. Admin dashboard login (\`POST /admin/dashboard/auth/login\`)

Admins sign in with **email + password**:
- Rejects **client accounts** (\`adminRoleId === null\`) with **403**.
- Rejects **inactive/banned** accounts.
- Returns the same JWT structure as client login.
- The response body includes \`user.adminRole\` with:
  - \`id\`, \`name\`, \`isSystem\`
  - \`permissions\`: the exact permission keys the frontend should use to show/hide admin menus and actions.

### 2. Admin user management (ROOT_ADMIN only)

Root admin can manage staff accounts via the **Admin Dashboard Admin Users** endpoints:

| Endpoint | Description |
|----------|-------------|
| \`GET /admin/dashboard/admin-users\` | List all admin users with their roles |
| \`POST /admin/dashboard/admin-users\` | Create a new admin user with a specific role |
| \`PATCH /admin/dashboard/admin-users/:userId/role\` | Change a staff admin's role |
| \`DELETE /admin/dashboard/admin-users/:userId/role\` | Demote an admin back to client |

The created admin accounts are immediately verified (no OTP needed) and can log in right away.

### 3. Role-based permissions

Staff admins have limited access based on the role assigned to them by the root admin. Available permissions:

| Permission | Description |
|------------|-------------|
| \`MANAGE_CATEGORIES\` | Create, edit, delete categories |
| \`MANAGE_SLIDER_ADS\` | Manage homepage slider advertisements |
| \`MANAGE_USERS\` | Manage user accounts (ban/unban) |
| \`MANAGE_LISTINGS\` | Manage product listings |
| \`MANAGE_WITHDRAWALS\` | Approve/reject point withdrawal requests |
| \`MANAGE_REPORTS\` | Review fraud reports |
| \`MANAGE_SUGGESTIONS\` | Review user suggestions |
| \`MANAGE_TRANSACTIONS\` | Oversee transactions |
| \`MANAGE_SAFE_PAYMENTS\` | Manage safe payment flows |
| \`MANAGE_RANK_CONFIG\` | Configure rank thresholds |
| \`MANAGE_POINT_CONFIG\` | Configure star-to-point conversion |
| \`VIEW_ANALYTICS\` | View dashboard analytics |
| \`SEND_NOTIFICATIONS\` | Send system notifications |

### Admin dashboard authorization matrix

| Route group | Access rule |
|------------|-------------|
| \`/admin/dashboard/admin-users\` | **ROOT_ADMIN only** |
| \`/admin/dashboard/admin-roles\` | **ROOT_ADMIN only** |
| \`/admin/dashboard/categories\` | **Admin JWT + \`MANAGE_CATEGORIES\`** |
| \`/admin/dashboard/slider-ads\` | **Admin JWT + \`MANAGE_SLIDER_ADS\`** |
| \`/admin/dashboard/points/withdrawals\` | **Admin JWT + \`MANAGE_WITHDRAWALS\`** |
| \`/admin/dashboard/points/star-config\` | **Admin JWT + \`MANAGE_POINT_CONFIG\`** |
| \`/admin/dashboard/points/rank-config\` | **Admin JWT + \`MANAGE_RANK_CONFIG\`** |
| \`/admin/dashboard/fraud-reports\` | **Admin JWT + \`MANAGE_REPORTS\`** |
| \`/admin/dashboard/suggestions\` | **Admin JWT + \`MANAGE_SUGGESTIONS\`** |
| \`/admin/dashboard/facebook-follow\` | **Admin JWT + \`MANAGE_USERS\`** |
| \`/admin/dashboard/auth/kbzpay/*\` | **Admin JWT + \`MANAGE_USERS\`** |
| \`/admin/dashboard/chats/safe-payments/*\` | **Admin JWT + \`MANAGE_SAFE_PAYMENTS\`** |
| \`/admin/dashboard/notifications\` | **Active admin only** |
| \`/admin/dashboard/pusher/auth\` | **Active admin only** |

### Frontend notes
- A valid admin JWT is required for every admin dashboard route except \`/admin/dashboard/auth/login\`.
- Root-admin endpoints should be hidden from staff-admin menus.
- Staff-admin menus should be built from \`user.adminRole.permissions\`, not from the \`isAdmin\` flag alone.
- After page refresh, the frontend can call \`GET /client/auth/me\` with the admin JWT to reload the same \`user.adminRole.permissions\` contract.

--- 

## Common JWT behavior

- **Token type:** Bearer token in \`Authorization\` header.
- **Refresh:** This codebase does not issue refresh tokens yet.
- **Expiry:** Access tokens expire after a configured duration (\`JWT_EXPIRATION\`, default \`2h\`).
- **Throttling:** Auth endpoints have rate limits per IP and per identifier (phone/email) to prevent brute-force attacks.
  - Login: 30 req/min per IP, 15 req/min per identifier.
  - Register: 15 req/min per IP, 6 req/min per identifier.
  - OTP send: 10 req/min per IP, 4 req/min per identifier.`;
