-- AlterEnum
ALTER TYPE "PointSourceType" ADD VALUE 'FACEBOOK_FOLLOW_REWARD';

-- CreateEnum
CREATE TYPE "FacebookFollowSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "user_profiles"
ADD COLUMN "facebook_name" TEXT,
ADD COLUMN "facebook_profile_url" TEXT,
ADD COLUMN "facebook_linked_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "facebook_follow_submissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "facebook_name" TEXT NOT NULL,
    "facebook_profile_url" TEXT NOT NULL,
    "facebook_page_url" TEXT NOT NULL,
    "screenshot_url" TEXT NOT NULL,
    "status" "FacebookFollowSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "admin_note" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "facebook_follow_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "facebook_follow_submissions_user_id_created_at_idx" ON "facebook_follow_submissions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "facebook_follow_submissions_status_created_at_idx" ON "facebook_follow_submissions"("status", "created_at");

-- AddForeignKey
ALTER TABLE "facebook_follow_submissions"
ADD CONSTRAINT "facebook_follow_submissions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
