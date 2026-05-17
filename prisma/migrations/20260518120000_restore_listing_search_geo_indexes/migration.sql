-- Restore product catalog indexes (geo KNN, text search, filter composites).
-- Safe to run if indexes already exist (IF NOT EXISTS).
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS listings_geo_location_gix
ON "listings" USING GIST ("geo_location");

CREATE INDEX IF NOT EXISTS listings_title_trgm_idx
ON "listings" USING GIN ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS listings_description_trgm_idx
ON "listings" USING GIN ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS listings_status_deleted_created_idx
ON "listings" ("status", "is_deleted", "created_at" DESC);

CREATE INDEX IF NOT EXISTS listings_category_status_deleted_idx
ON "listings" ("category_id", "status", "is_deleted");
