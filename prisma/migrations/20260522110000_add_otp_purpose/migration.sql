-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('PHONE_VERIFICATION', 'PASSWORD_RESET');

-- AlterTable
ALTER TABLE "otp_verifications" ADD COLUMN "purpose" "OtpPurpose" NOT NULL DEFAULT 'PHONE_VERIFICATION';

-- CreateIndex
CREATE INDEX "otp_verifications_phone_status_purpose_idx" ON "otp_verifications"("phone", "status", "purpose");
