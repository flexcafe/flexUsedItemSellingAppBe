-- Safe payment: admin sends KBZ receiving number before buyer pays (KBZ verification-style flow).

ALTER TYPE "TransactionStatus" ADD VALUE 'SAFE_PAYMENT_AWAITING_INSTRUCTION';
ALTER TYPE "TransactionStatus" ADD VALUE 'SAFE_PAYMENT_INSTRUCTION_SENT';
ALTER TYPE "MessageType" ADD VALUE 'SAFE_PAYMENT_REQUESTED';
ALTER TYPE "MessageType" ADD VALUE 'SAFE_PAYMENT_INSTRUCTION_SENT';

ALTER TABLE "safe_payments"
  ADD COLUMN IF NOT EXISTS "admin_receiving_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "instruction_sent_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "instruction_sent_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "instruction_note" TEXT;

ALTER TABLE "safe_payments"
  ALTER COLUMN "payer_kbz_name" DROP NOT NULL,
  ALTER COLUMN "payer_kbz_phone" DROP NOT NULL,
  ALTER COLUMN "payment_amount" DROP NOT NULL,
  ALTER COLUMN "kbz_transaction_id" DROP NOT NULL;
