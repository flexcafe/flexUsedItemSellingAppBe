/**
 * Long-form Swagger copy for admin user management APIs.
 */

export const ADMIN_USER_MANAGEMENT_WORKFLOW = `## Admin user management — RBAC overview

This system uses **Role-Based Access Control (RBAC)** to delegate admin responsibilities without sharing the root admin account.

### Account types

| Type | Description | Login method |
|------|-------------|-------------|
| **Root admin** | Seeded once, full permissions, immutable role. Manages all other admins. | Email + password via \`POST /admin/dashboard/auth/login\` |
| **Staff admin** | Created by root admin with cherry-picked permissions. Managed via these endpoints. | Email + password via \`POST /admin/dashboard/auth/login\` |
| **Client** | Regular buyer/seller account. No admin panel access. | Phone + password via \`POST /client/auth/login\` |

### Authentication
- **All endpoints on this page require JWT** (\`Authorization: Bearer <accessToken>\`).
- **Only ROOT_ADMIN** can create or modify admin users. Non-root admins receive **403 Forbidden**.
- Staff admins have restricted access depending on their assigned permissions (checked per feature).

### Workflow
1. **Seeded root admin** logs in via admin dashboard login.
2. Root admin creates **admin roles** (permission sets) via \`POST /admin/dashboard/admin-roles\`.
3. Root admin creates **staff admin accounts** via \`POST /admin/dashboard/admin-users\` and assigns them a role.
4. Staff admins log in and can only access features matching their permissions.
5. Root admin can **change roles** or **demote** staff admins back to client accounts.

### Staff admin creation rules
- **phone** and **email** must be unique across all users (clients included) — **409** on conflict.
- The created account is automatically **phone-verified** and **email-verified** — no OTP flow needed.
- Staff admins cannot access the root admin's permission-manager endpoints.
- Cannot assign the **ROOT_ADMIN** role to anyone — it is system-managed and unique.`;

export const ADMIN_USER_LIST_DOC = `${ADMIN_USER_MANAGEMENT_WORKFLOW}

### This endpoint: \`GET /admin/dashboard/admin-users\`
Returns all users that have an admin role assigned (including root). Each row includes:
- \`id\`, \`nickname\`, \`phone\`, \`email\`
- \`isActive\`, \`isBanned\`
- \`adminRoleId\` — the role's UUID
- \`adminRoleName\` — human-readable role name (e.g. "CONTENT_MODERATOR")
- \`createdAt\`, \`updatedAt\`

Use this to populate the admin staff management table in the dashboard.`;

export const ADMIN_USER_CREATE_DOC = `${ADMIN_USER_MANAGEMENT_WORKFLOW}

### This endpoint: \`POST /admin/dashboard/admin-users\`
Creates a new admin user account in one step.

**Required fields:**
- \`nickname\` — display name
- \`phone\` — unique phone number (validated server-side)
- \`email\` — unique email address
- \`password\` — min 8 characters, will be hashed with bcrypt (12 rounds)
- \`adminRoleId\` — UUID of an existing admin role (created via \`POST /admin/dashboard/admin-roles\`)

**What happens server-side:**
1. Validates that the requesting user is **ROOT_ADMIN** (otherwise **403**).
2. Validates that \`adminRoleId\` references an existing role (otherwise **404**).
3. Checks uniqueness of \`phone\` and \`email\` (otherwise **409**).
4. Hashes password and generates a unique referral code.
5. Creates the user with \`registrationType: EMAIL_ONLY\`, minimal profile, and KBZPay stub.
6. Immediately assigns the admin role and sets \`isEmailVerified: true\`, \`isPhoneVerified: true\`.
7. Returns the new admin user's details \`AdminUserListDto\` (wrapped in \`ApiResponseDto\`).

**Important:** The new admin can log in immediately with their email + password via \`POST /admin/dashboard/auth/login\`. No verification flow is needed.`;

export const ADMIN_USER_UPDATE_ROLE_DOC = `${ADMIN_USER_MANAGEMENT_WORKFLOW}

### This endpoint: \`PATCH /admin/dashboard/admin-users/:userId/role\`
Changes the admin role assigned to an existing admin user.

**Rules:**
- Cannot change your own role (**400**).
- Cannot assign the **ROOT_ADMIN** role to anyone (**400**).
- The target user must exist (**404**).
- The new role must exist (**404**).

**Use case:** Promoting or demoting a staff admin's permissions — e.g. moving from "VIEWER" to "MODERATOR" without deleting and recreating the account.`;

export const ADMIN_USER_DEMOTE_DOC = `${ADMIN_USER_MANAGEMENT_WORKFLOW}

### This endpoint: \`DELETE /admin/dashboard/admin-users/:userId/role\`
Completely removes the admin role from a user, converting them to a regular client account.

**Rules:**
- Cannot demote yourself (**400**).
- Target user must exist and currently have an admin role (**400** if already a client).
- Target user must exist (**404**).

**What happens:**
1. Sets \`adminRoleId\` to \`null\` on the user record.
2. The user retains their existing profile, listings, transactions, points, and KBZPay data.
3. They lose all admin panel access immediately — subsequent \`POST /admin/dashboard/auth/login\` attempts will fail with **403**.
4. They can still log in via \`POST /client/auth/login\` with their phone number.

**Use case:** Decommissioning a staff member without deleting their account history.`;
