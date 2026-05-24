-- Seller "my listings" performance index (count + page scan).
-- Matches default filter: seller_id + is_deleted + (status != SOLD) ordered by created_at desc.
CREATE INDEX IF NOT EXISTS listings_seller_deleted_status_created_idx
ON "listings" ("seller_id", "is_deleted", "status", "created_at" DESC);

