-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "event_key" TEXT,
ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "notifications_event_key_idx" ON "notifications"("event_key");
