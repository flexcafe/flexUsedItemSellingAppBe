-- AlterTable
ALTER TABLE "chat_rooms" ADD COLUMN     "last_message_at" TIMESTAMP(3),
ADD COLUMN     "last_message_id" TEXT,
ADD COLUMN     "last_message_preview" TEXT,
ADD COLUMN     "last_message_type" "MessageType",
ADD COLUMN     "unread_count_buyer" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unread_count_seller" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "chat_messages_chat_room_id_is_read_created_at_idx" ON "chat_messages"("chat_room_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "chat_rooms_buyer_id_updated_at_idx" ON "chat_rooms"("buyer_id", "updated_at");

-- CreateIndex
CREATE INDEX "chat_rooms_seller_id_updated_at_idx" ON "chat_rooms"("seller_id", "updated_at");

-- CreateIndex
CREATE INDEX "chat_rooms_updated_at_idx" ON "chat_rooms"("updated_at");

-- CreateIndex
CREATE INDEX "transactions_chat_room_id_status_idx" ON "transactions"("chat_room_id", "status");

-- CreateIndex
CREATE INDEX "transactions_status_created_at_idx" ON "transactions"("status", "created_at");
