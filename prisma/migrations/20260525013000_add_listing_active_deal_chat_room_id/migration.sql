-- Seller-controlled "active deal" lock for listings.
ALTER TABLE "listings"
ADD COLUMN IF NOT EXISTS "active_deal_chat_room_id" UUID;

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

