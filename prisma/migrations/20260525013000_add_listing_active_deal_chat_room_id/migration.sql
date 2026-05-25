-- Seller-controlled "active deal" lock for listings.
ALTER TABLE "listings"
ADD COLUMN IF NOT EXISTS "active_deal_chat_room_id" TEXT;

-- Safety for retries: if a previous failed run created UUID, convert to TEXT.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'listings'
      AND column_name = 'active_deal_chat_room_id'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE "listings"
    ALTER COLUMN "active_deal_chat_room_id" TYPE TEXT
    USING "active_deal_chat_room_id"::text;
  END IF;
END $$;

-- FK is optional: if a chat room is deleted, unlock the listing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listings_active_deal_chat_room_id_fkey'
  ) THEN
    ALTER TABLE "listings"
    ADD CONSTRAINT "listings_active_deal_chat_room_id_fkey"
    FOREIGN KEY ("active_deal_chat_room_id") REFERENCES "chat_rooms"("id")
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS listings_active_deal_chat_room_id_idx
ON "listings" ("active_deal_chat_room_id");
