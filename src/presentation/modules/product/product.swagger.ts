/**
 * Long-form Swagger copy for client product APIs.
 */

export const CLIENT_PRODUCT_WORKFLOW = `## Products (listings) — client API

Products are **second-hand listings** stored in the \`listings\` table. The client API exposes them under **\`/client/products\`**.

### Authentication
- **Create**, **update**, **delete**, **list my products**, and **get my product detail** require **JWT** (\`Authorization: Bearer <accessToken>\`).
- **Public catalog** (\`GET /client/products\`) and **public product detail** (\`GET /client/products/:productId\`) are **public** (no JWT) so storefronts and deep links work.

### Category binding
- Every product has a **\`categoryId\`** (UUID). The category must exist and be **active** at create time (and when changing category on update). Inactive or missing category → **404** “Active category not found”.

### Business validation (create / update)
- **Title / description**: cannot be empty or whitespace-only after trim (**400**).
- **\`directTradeLocation\`**: if provided, cannot be blank (**400**).
- **\`directTradeLatitude\` / \`directTradeLongitude\`**: must be **both** set or **both** omitted (**400** if only one is sent).
- **\`paymentMethods\`**: at least one of \`CASH\`, \`KBZPAY\`; max two entries; **no duplicates** (**400**).
- **\`images\`**: send multipart binary files in field **\`images\`** (max **5**, PNG/JPEG/WebP). Server uploads to Supabase and stores returned public URLs. You may still send URL strings in JSON mode when needed.
- **\`preferredLocations\`**: max **3** objects; each **label** and **address** must be non-blank (**400**).
- **\`isDeliveryAvailable\` / \`deliveryFeePayer\`**: when delivery is **off** (\`false\`), omit \`deliveryFeePayer\` or send \`null\` (**400** if you send BUYER/SELLER). When delivery is **on** (\`true\`), you **must** set \`deliveryFeePayer\` to **\`BUYER\`** or **\`SELLER\`** (who pays delivery) — omitting it on create (**400**). On **PATCH**, merged rules apply: enabling delivery without a payer fails unless the listing already had one; setting delivery off clears the payer in storage.

### Geo / “nearest first” catalog
- Distance and optional **radius** filtering use the listing’s **direct trade coordinates** (\`directTradeLatitude\` / \`directTradeLongitude\`), synced to PostGIS \`geo_location\` in the database — **not** the seller’s profile GPS.
- **\`GET /client/products\`** with **\`latitude\` + \`longitude\`**: results are ordered by distance (listings without coordinates sort after those with coordinates).
- Optional **\`radiusKm\`**: when set with lat/lng, only listings within that radius are returned (and count respects the same filter).
- Catalog results only include listings whose **category is still active** (inactive/retired categories are excluded even if a listing row still points at them).

### Pagination
- **Catalog** (\`GET /client/products\`): query **\`page\`** (≥1) and **\`limit\`** (1–50). Response **data** is **PaginatedResponseDto**: \`items\`, \`total\`, \`page\`, \`limit\`, \`totalPages\`, \`hasNextPage\`, \`hasPrevPage\`.
- **My products** (\`GET /client/products/my\`): same pagination shape; only listings owned by the current user (**not deleted**). Optional query \`status\` lets seller filter by listing status (for example \`SOLD\` only).
- **My product detail** (\`GET /client/products/my/:productId\`, auth): one listing **owned by the current user**, including **soft-deleted** rows (for seller dashboard). Wrong user or unknown id → **404**.

### Create lifecycle
- Successful create stores the listing as **ACTIVE** and returns **ProductResponseDto** (wrapped in **ApiResponseDto**).

### Update / ownership
- **\`PATCH /client/products/:productId\`**: only the **seller** may update. Another user’s id → **403**. Unknown id or soft-deleted → **404**.
- Body is **partial** (**UpdateProductDto**); omitted fields are left unchanged. **\`price\`** cannot be changed after create (omit it on **PATCH**). Optional **\`status\`** allows controlled transitions when you expose them (validate in use-case layer).
- **Meetup locations locked during direct trade:** while any chat has an open **direct trade** on this listing, **\`directTradeLocation\`**, **\`preferredLocations\`**, coordinates, or **\`mapScreenshotUrl\`** cannot be changed (**400**). Finish or cancel the trade first.

### Delete
- **Soft delete** (seller): JSON body must include **\`confirmTitle\`** matching the listing **title** (trimmed on both sides; case-sensitive). Wrong string → **400**. **Sold** listings cannot be seller-deleted → **409** (support/admin for edge cases). Otherwise marks deleted and archives. Concurrent deletes may yield **404** if already removed.

### Standard response envelope
All JSON responses use **ApiResponseDto**: \`success\`, \`message\`, \`data\`, \`error\`, \`timestamp\`.

### Public \`createdAtDisplay\` (catalog + public detail only)
On **\`GET /client/products\`** and **\`GET /client/products/:productId\`**, the **ApiResponseDto** envelope includes **\`listingDisplayTimezone\`** (IANA string, same as server **\`LISTING_DISPLAY_TIMEZONE\`**, default \`UTC\`). Each **ProductResponseDto** in **\`data\`** includes **\`createdAtDisplay\`**: listing age for UI — **\`just now\`**, **\`N min ago\`** (under 1 hour), **\`N h ago\`** (1–23 hours), **weekday name** (English, e.g. \`Wednesday\`) when the listing is at least 24 hours old but younger than 7 days, then a **short date** (e.g. \`May 6, 2026\`) when the listing is **7 days or older**. **\`createdAt\`** remains the canonical ISO instant. Seller routes (**\`/my\`**, create/update responses) omit both **\`listingDisplayTimezone\`** and per-item **\`createdAtDisplay\`**.`;

export const CLIENT_PRODUCT_CREATE_DOC = `${CLIENT_PRODUCT_WORKFLOW}

### This endpoint: \`POST /client/products\`
Creates a new listing for the authenticated user as seller. Prefer **multipart/form-data** so FE can send image binaries directly:
- **\`images\`**: optional multiple files (product photos)
- **\`mapScreenshot\`**: optional single file
- remaining fields from **CreateProductDto** as form fields
Server uploads files to Supabase and stores public URLs on the listing. **201** on success.`;

export const CLIENT_PRODUCT_LIST_DOC = `${CLIENT_PRODUCT_WORKFLOW}

### This endpoint: \`GET /client/products\` (public)
Search and browse the catalog.

**Query (ProductFilterDto):**
- \`search\` — optional; case-insensitive match on title/description.
- \`categoryId\` — optional UUID filter.
- \`latitude\`, \`longitude\` — optional; enable nearest-first ordering when both present.
- \`radiusKm\` — optional; requires lat/lng; filters to listings within radius (km).
- \`page\`, \`limit\` — pagination.

**200** returns **PaginatedResponseDto** in \`data\` (field \`items\`: array of **ProductResponseDto**). Each item includes **\`createdAtDisplay\`** (public-only label for \`createdAt\`: \`N min ago\` / \`N h ago\` / weekday / date — see workflow).`;

export const CLIENT_PRODUCT_LIST_MINE_DOC = `${CLIENT_PRODUCT_WORKFLOW}

### This endpoint: \`GET /client/products/my\` (auth)
Paginated list of the current user’s own products (non-deleted). Query: **MyProductsFilterDto** (\`page\`, \`limit\`, optional \`status\`).`;

export const CLIENT_PRODUCT_GET_MINE_DOC = `${CLIENT_PRODUCT_WORKFLOW}

### This endpoint: \`GET /client/products/my/:productId\` (auth)
Returns **ProductResponseDto** for a listing that belongs to the JWT user. Use this for the seller “my listing” detail screen instead of the public detail route. Includes **archived / soft-deleted** seller listings that public \`GET /client/products/:productId\` would not return.`;

export const CLIENT_PRODUCT_GET_DOC = `${CLIENT_PRODUCT_WORKFLOW}

### This endpoint: \`GET /client/products/:productId\` (public)
Returns one product by UUID. Deleted or missing → **404**. Response **PublicProductDetailResponseDto** includes:
- All listing fields (map coords, title, price, description, images, payment/delivery, **\`preferredTradeTime\`**, **\`createdAtDisplay\`**, etc.)
- **\`preferredLocations\`**: up to 3 spots (\`label\`, \`address\`, optional lat/lng)
- **\`seller\`**: \`nickname\`, \`avatar\`, \`currentRank\`, \`averageStars\`, \`totalReviews\` (trust card; no private PII)
For star histogram and review comments, call **GET /client/users/:sellerId/reviews** when the user opens reviews (not included here).`;

export const CLIENT_PRODUCT_UPDATE_DOC = `${CLIENT_PRODUCT_WORKFLOW}

### This endpoint: \`PATCH /client/products/:productId\` (auth)
Partial update; only the owner. Prefer **multipart/form-data** with optional replacement files (**\`images\`**, **\`mapScreenshot\`**) plus any **UpdateProductDto** fields (no **\`price\`** field — price is fixed after create).`;

export const CLIENT_PRODUCT_DELETE_DOC = `${CLIENT_PRODUCT_WORKFLOW}

### This endpoint: \`DELETE /client/products/:productId\` (auth)
Soft-deletes the listing when the caller is the seller. **Body (JSON):** **DeleteProductDto** with **\`confirmTitle\`** equal to the listing title (trimmed). **Sold** listings → **409**.`;
