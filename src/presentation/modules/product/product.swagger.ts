/**
 * Long-form Swagger copy for client product APIs.
 */

export const CLIENT_PRODUCT_WORKFLOW = `## Products (listings) — client API

Products are **second-hand listings** stored in the \`listings\` table. The client API exposes them under **\`/client/products\`**.

### Authentication
- **Create**, **update**, **delete**, and **list my products** require **JWT** (\`Authorization: Bearer <accessToken>\`).
- **Public catalog** (\`GET /client/products\`) and **product detail** (\`GET /client/products/:productId\`) are **public** (no JWT) so storefronts and deep links work.

### Category binding
- Every product has a **\`categoryId\`** (UUID). The category must exist and be **active** at create time (and when changing category on update). Inactive or missing category → **404** “Active category not found”.

### Business validation (create / update)
- **Title / description**: cannot be empty or whitespace-only after trim (**400**).
- **\`directTradeLocation\`**: if provided, cannot be blank (**400**).
- **\`directTradeLatitude\` / \`directTradeLongitude\`**: must be **both** set or **both** omitted (**400** if only one is sent).
- **\`paymentMethods\`**: at least one of \`CASH\`, \`KBZPAY\`; max two entries; **no duplicates** (**400**).
- **\`images\`**: max **5** URLs (**400** if more). Typically these are **public URLs** returned by your upload flow (e.g. Supabase).
- **\`preferredLocations\`**: max **3** objects; each **label** and **address** must be non-blank (**400**).
- **\`isDeliveryAvailable\`**: if \`false\`, do not send \`deliveryFeePayer\` (**400** if you do).

### Geo / “nearest first” catalog
- Distance and optional **radius** filtering use the listing’s **direct trade coordinates** (\`directTradeLatitude\` / \`directTradeLongitude\`), synced to PostGIS \`geo_location\` in the database — **not** the seller’s profile GPS.
- **\`GET /client/products\`** with **\`latitude\` + \`longitude\`**: results are ordered by distance (listings without coordinates sort after those with coordinates).
- Optional **\`radiusKm\`**: when set with lat/lng, only listings within that radius are returned (and count respects the same filter).

### Pagination
- **Catalog** (\`GET /client/products\`): query **\`page\`** (≥1) and **\`limit\`** (1–50). Response **data** is **PaginatedResponseDto**: \`items\`, \`total\`, \`page\`, \`limit\`, \`totalPages\`, \`hasNextPage\`, \`hasPrevPage\`.
- **My products** (\`GET /client/products/my\`): same pagination shape; only listings owned by the current user (**not deleted**).

### Create lifecycle
- Successful create stores the listing as **ACTIVE** and returns **ProductResponseDto** (wrapped in **ApiResponseDto**).

### Update / ownership
- **\`PATCH /client/products/:productId\`**: only the **seller** may update. Another user’s id → **403**. Unknown id or soft-deleted → **404**.
- Body is **partial** (**UpdateProductDto**); omitted fields are left unchanged. Optional **\`status\`** allows controlled transitions when you expose them (validate in use-case layer).

### Delete
- **Soft delete**: marks listing deleted and archives it. Idempotent behavior follows repository rules (concurrent deletes may yield **404** if already removed).

### Standard response envelope
All JSON responses use **ApiResponseDto**: \`success\`, \`message\`, \`data\`, \`error\`, \`timestamp\`.`;

export const CLIENT_PRODUCT_CREATE_DOC = `${CLIENT_PRODUCT_WORKFLOW}

### This endpoint: \`POST /client/products\`
Creates a new listing for the authenticated user as seller. Body: **CreateProductDto**. **201** on success.`;

export const CLIENT_PRODUCT_LIST_DOC = `${CLIENT_PRODUCT_WORKFLOW}

### This endpoint: \`GET /client/products\` (public)
Search and browse the catalog.

**Query (ProductFilterDto):**
- \`search\` — optional; case-insensitive match on title/description.
- \`categoryId\` — optional UUID filter.
- \`latitude\`, \`longitude\` — optional; enable nearest-first ordering when both present.
- \`radiusKm\` — optional; requires lat/lng; filters to listings within radius (km).
- \`page\`, \`limit\` — pagination.

**200** returns **PaginatedResponseDto** in \`data\` (field \`items\`: array of **ProductResponseDto**).`;

export const CLIENT_PRODUCT_LIST_MINE_DOC = `${CLIENT_PRODUCT_WORKFLOW}

### This endpoint: \`GET /client/products/my\` (auth)
Paginated list of the current user’s own products (non-deleted). Query: **MyProductsFilterDto** (\`page\`, \`limit\`).`;

export const CLIENT_PRODUCT_GET_DOC = `${CLIENT_PRODUCT_WORKFLOW}

### This endpoint: \`GET /client/products/:productId\` (public)
Returns one product by UUID. Deleted or missing → **404**.`;

export const CLIENT_PRODUCT_UPDATE_DOC = `${CLIENT_PRODUCT_WORKFLOW}

### This endpoint: \`PATCH /client/products/:productId\` (auth)
Partial update; only the owner. Body: **UpdateProductDto**.`;

export const CLIENT_PRODUCT_DELETE_DOC = `${CLIENT_PRODUCT_WORKFLOW}

### This endpoint: \`DELETE /client/products/:productId\` (auth)
Soft-deletes the listing when the caller is the seller.`;
