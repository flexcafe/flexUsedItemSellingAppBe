-- Geospatial + text-search performance improvements for product listings.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "listings"
ADD COLUMN IF NOT EXISTS "geo_location" geography(Point,4326);

CREATE OR REPLACE FUNCTION set_listing_geo_location()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.direct_trade_latitude IS NULL OR NEW.direct_trade_longitude IS NULL THEN
    NEW.geo_location := NULL;
  ELSE
    NEW.geo_location := ST_SetSRID(
      ST_MakePoint(NEW.direct_trade_longitude, NEW.direct_trade_latitude),
      4326
    )::geography;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_listing_geo_location ON "listings";
CREATE TRIGGER trg_set_listing_geo_location
BEFORE INSERT OR UPDATE OF "direct_trade_latitude", "direct_trade_longitude"
ON "listings"
FOR EACH ROW
EXECUTE FUNCTION set_listing_geo_location();

UPDATE "listings"
SET "geo_location" = CASE
  WHEN "direct_trade_latitude" IS NULL OR "direct_trade_longitude" IS NULL THEN NULL
  ELSE ST_SetSRID(ST_MakePoint("direct_trade_longitude", "direct_trade_latitude"), 4326)::geography
END;

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
