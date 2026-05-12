/**
 * Long-form Swagger copy for admin category APIs.
 * Imported into @ApiOperation({ description }) on each route.
 */

export const CATEGORY_ADMIN_WORKFLOW = `## Category model (admin dashboard)

Categories are **hierarchical**: each row may have a \`parentId\` pointing to another category, or \`null\` for a **root** category. Child categories are returned nested under their parent in list responses.

### Who can call these routes
- All routes require **JWT** (\`Authorization: Bearer <accessToken>\`).
- The authenticated user must be an **admin** (user with an admin role). Non-admins receive **403 Forbidden**.

### Slugs and names
- **\`name\`**: human-readable label (shown in apps).
- **\`slug\`**: URL-safe identifier, **unique across all categories**. If omitted on create, the server derives a slug from \`name\` (normalized).
- Updating \`slug\` or \`name\` must not collide with another category’s slug (**409 Conflict** if duplicate).

### Sorting and visibility
- **\`sortOrder\`**: lower values appear first among siblings (roots ordered, then children within each parent).
- **\`isActive\`**: read-only in normal edits. **Only \`DELETE\`** retires a category (sets \`isActive\` to \`false\`). **\`PATCH\`** cannot change \`isActive\`. Inactive categories should not be used for **new** client products.

### Create (\`POST\`)
1. **Multipart form-data** (same pattern as slider ads): text fields **\`name\`** (required), optional **\`slug\`**, **\`sortOrder\`**, **\`parentId\`**, and optional binary field **\`icon\`** (PNG, JPEG, WebP, or SVG). The server uploads **\`icon\`** to Supabase (\`SUPABASE_CATEGORY_ICON_BUCKET\`, default \`category-icons\`) and stores the returned **public URL** on the category row.
2. Optional **\`parentId\`**: must reference an existing category; if invalid → **404** parent not found.
3. Validates body → **400** on validation errors; unsupported icon MIME → **400**.

### List (\`GET\`)
- Returns **roots** with nested **children** (tree-shaped array).
- Query **\`includeInactive\`**: omit or any value except the string \`false\` → include inactive categories. Pass \`includeInactive=false\` to hide inactive rows (roots and children filtered to active only).

### Get one (\`GET /:categoryId\`)
- Returns a single category node (with nested relations as loaded by the repository). Unknown id → **404**.

### Update (\`PATCH /:categoryId\`)
- **Multipart** partial update: optional text fields (**name**, **slug**, **sortOrder**, **parentId**) and optional **\`icon\`** file to replace the stored icon (uploaded to Supabase; same rules as create). **Cannot** set \`isActive\` here — use **DELETE** to retire a category.
- **\`parentId\`**: cannot set a category as its own parent; cannot introduce a **cycle** in the tree (e.g. moving A under B when B is under A) → **409** on cycle.
- Slug collision with another row → **409**.

### Delete (\`DELETE /:categoryId\`)
- **Soft delete**: sets \`isActive\` to \`false\` (does not remove the row).
- Cannot delete if the category has **child categories** → **409**.
- Cannot delete if any **non-deleted listing** still references this category → **409**.
- Response envelope: \`{ success, data: { deleted: true }, ... }\`.

### Frontend integration checklist
1. After admin login, store JWT and send it on every admin request.
2. Build category tree UI from list response; use \`id\` as value for product category pickers. Icons are **URLs** returned from the API (upload **\`icon\`** file on create/update, not a pasted link).
3. When hiding disabled categories in pickers, call list with \`includeInactive=false\`.
4. Handle 409 with user-facing copy for “has children” / “in use by products” / slug conflict.`;

export const ADMIN_CATEGORY_CREATE_DOC = `${CATEGORY_ADMIN_WORKFLOW}

### This endpoint: \`POST /admin/dashboard/categories\`
Creates a new category. Send **multipart/form-data** with **\`name\`** and optional **\`slug\`**, **\`sortOrder\`**, **\`parentId\`**, **\`icon\`** (binary). Icon is uploaded server-side; the DB stores the resulting public URL.

**Typical success:** 201 with **CategoryResponseDto** inside the standard **ApiResponseDto** envelope.`;

export const ADMIN_CATEGORY_LIST_DOC = `${CATEGORY_ADMIN_WORKFLOW}

### This endpoint: \`GET /admin/dashboard/categories\`
Returns the full **tree** of root categories with nested children.

**Query:** \`includeInactive\` (optional string). Use \`false\` to only return active categories for cleaner admin tables.`;

export const ADMIN_CATEGORY_GET_DOC = `${CATEGORY_ADMIN_WORKFLOW}

### This endpoint: \`GET /admin/dashboard/categories/:categoryId\`
Returns one category by UUID path param **categoryId**.`;

export const ADMIN_CATEGORY_UPDATE_DOC = `${CATEGORY_ADMIN_WORKFLOW}

### This endpoint: \`PATCH /admin/dashboard/categories/:categoryId\`
Partial update. Send **multipart/form-data** with any of **\`name\`**, **\`slug\`**, **\`sortOrder\`**, **\`parentId\`**, and/or **\`icon\`** file to replace the icon. Validates hierarchy and slug rules on the server.`;

export const ADMIN_CATEGORY_DELETE_DOC = `${CATEGORY_ADMIN_WORKFLOW}

### This endpoint: \`DELETE /admin/dashboard/categories/:categoryId\`
Soft-deactivates the category when allowed. Read the “Delete” section above for conflict rules.`;

export const CLIENT_CATEGORY_LIST_DOC = `## Client categories (storefront)

**No JWT required.** Returns only **active** categories (same rule as product create: inactive categories are hidden).

### This endpoint: \`GET /client/categories\` (public)
Returns the **tree** of root categories with nested **active** children. Use each node’s **\`id\`** as **\`categoryId\`** when calling **\`GET /client/products\`**.

**Base path:** your app’s global prefix (e.g. \`/api/v1\`) + \`/client/categories\`.`;

export const CLIENT_CATEGORY_GET_DOC = `## Client category detail

**No JWT required.** Returns one category only if it is **active**; otherwise **404**.

### This endpoint: \`GET /client/categories/:categoryId\` (public)
Use for labels or breadcrumbs when you already have a **\`categoryId\`** from the product list or picker.`;
