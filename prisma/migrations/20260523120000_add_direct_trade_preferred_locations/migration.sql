-- CreateTable
CREATE TABLE "direct_trade_preferred_locations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "direct_trade_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "direct_trade_preferred_locations_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "direct_trades"
  ADD COLUMN "accepted_location_label" TEXT,
  ADD COLUMN "buyer_requested_location" TEXT,
  ADD COLUMN "buyer_requested_latitude" DOUBLE PRECISION,
  ADD COLUMN "buyer_requested_longitude" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "direct_trade_preferred_locations_direct_trade_id_idx" ON "direct_trade_preferred_locations"("direct_trade_id");

-- AddForeignKey
ALTER TABLE "direct_trade_preferred_locations"
  ADD CONSTRAINT "direct_trade_preferred_locations_direct_trade_id_fkey"
  FOREIGN KEY ("direct_trade_id") REFERENCES "direct_trades"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
