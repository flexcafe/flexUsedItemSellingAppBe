-- CreateEnum
CREATE TYPE "ContentReportTargetType" AS ENUM ('LISTING', 'CHAT_MESSAGE', 'REVIEW', 'USER_PROFILE');

-- CreateEnum
CREATE TYPE "ContentReportReason" AS ENUM ('OBJECTIONABLE_CONTENT', 'HARASSMENT', 'HATE_SPEECH', 'SEXUAL_CONTENT', 'SPAM', 'VIOLENCE', 'SCAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ContentReportStatus" AS ENUM ('PENDING', 'ACTIONED', 'DISMISSED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "terms_accepted_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "terms_version" TEXT;

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN "is_hidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN "is_hidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "terms_of_service" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terms_of_service_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "terms_of_service_version_key" ON "terms_of_service"("version");
CREATE INDEX "terms_of_service_is_active_idx" ON "terms_of_service"("is_active");

-- CreateTable
CREATE TABLE "content_reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reported_user_id" TEXT NOT NULL,
    "target_type" "ContentReportTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" "ContentReportReason" NOT NULL,
    "details" TEXT,
    "status" "ContentReportStatus" NOT NULL DEFAULT 'PENDING',
    "admin_note" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "content_reports_reporter_id_idx" ON "content_reports"("reporter_id");
CREATE INDEX "content_reports_reported_user_id_idx" ON "content_reports"("reported_user_id");
CREATE INDEX "content_reports_target_type_target_id_idx" ON "content_reports"("target_type", "target_id");
CREATE INDEX "content_reports_status_created_at_idx" ON "content_reports"("status", "created_at");

ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" TEXT NOT NULL,
    "blocker_id" TEXT NOT NULL,
    "blocked_id" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_blocks_blocker_id_blocked_id_key" ON "user_blocks"("blocker_id", "blocked_id");
CREATE INDEX "user_blocks_blocker_id_idx" ON "user_blocks"("blocker_id");
CREATE INDEX "user_blocks_blocked_id_idx" ON "user_blocks"("blocked_id");

ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "content_filter_keywords" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_filter_keywords_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "content_filter_keywords_keyword_key" ON "content_filter_keywords"("keyword");
CREATE INDEX "content_filter_keywords_is_active_idx" ON "content_filter_keywords"("is_active");
