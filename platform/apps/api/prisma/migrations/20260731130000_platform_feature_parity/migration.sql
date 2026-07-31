-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('LESSON', 'REVIEW', 'SPEAKING_CLUB', 'PERSONAL');

-- CreateEnum
CREATE TYPE "CalendarEventStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SpeakingClubBookingStatus" AS ENUM ('BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'MISSED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'DELAYED', 'BOUNCED', 'FAILED', 'COMPLAINED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "LibraryMaterialType" AS ENUM ('LINK', 'VIDEO', 'AUDIO', 'FILE', 'GUIDE', 'CHECKLIST', 'TEMPLATE', 'COLLECTION');

-- CreateEnum
CREATE TYPE "LibraryMaterialStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrainingMode" AS ENUM ('CHOICE', 'LETTERS', 'MATCHING', 'CONTEXT', 'IRREGULAR_VERBS', 'PERSONAL_SET');

-- CreateEnum
CREATE TYPE "TrainingSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('ISSUED', 'REVOKED');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('LOCAL', 'VERCEL_BLOB');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "AssistantSession" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'Новый чат';

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "status" "CertificateStatus" NOT NULL DEFAULT 'ISSUED',
ADD COLUMN     "verificationToken" TEXT;

UPDATE "Certificate"
SET "verificationToken" = 'legacy-' || "id"
WHERE "verificationToken" IS NULL;

ALTER TABLE "Certificate" ALTER COLUMN "verificationToken" SET NOT NULL;

-- AlterTable
ALTER TABLE "CourseLevel" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "estimatedMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "skill" TEXT;

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "skill" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'system';

-- AlterTable
ALTER TABLE "UserDictionaryTerm" ADD COLUMN     "confidence" TEXT NOT NULL DEFAULT 'NEW',
ADD COLUMN     "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fsrsState" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lapses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN     "learningSteps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "repetitions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scheduledDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "setName" TEXT,
ADD COLUMN     "stability" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "UserStudyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionsPerWeek" INTEGER NOT NULL DEFAULT 4,
    "sessionMinutes" INTEGER NOT NULL DEFAULT 30,
    "preferredDays" JSONB NOT NULL DEFAULT '[]',
    "preferredTime" TEXT NOT NULL DEFAULT '19:00',
    "targetDate" TIMESTAMP(3),
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderMinutes" INTEGER NOT NULL DEFAULT 30,
    "autoReschedule" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStudyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CalendarEventType" NOT NULL,
    "status" "CalendarEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "sourceId" TEXT,
    "metadata" JSONB,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingClub" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "levelCodes" JSONB NOT NULL DEFAULT '[]',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "capacity" INTEGER NOT NULL DEFAULT 16,
    "meetingUrl" TEXT,
    "materials" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingClub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingClubBooking" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SpeakingClubBookingStatus" NOT NULL DEFAULT 'BOOKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingClubBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationCampaign" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "href" TEXT,
    "channels" JSONB NOT NULL DEFAULT '["IN_APP"]',
    "audience" JSONB NOT NULL DEFAULT '{"type":"ALL"}',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseUpdatesEmail" BOOLEAN NOT NULL DEFAULT true,
    "remindersEmail" BOOLEAN NOT NULL DEFAULT true,
    "achievementsEmail" BOOLEAN NOT NULL DEFAULT true,
    "communityEmail" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT,
    "providerId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "lastEventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "provider" "StorageProvider" NOT NULL,
    "pathname" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryMaterial" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "assetId" TEXT,
    "type" "LibraryMaterialType" NOT NULL,
    "status" "LibraryMaterialStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "levels" JSONB NOT NULL DEFAULT '[]',
    "skills" JSONB NOT NULL DEFAULT '[]',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibrarySave" (
    "materialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibrarySave_pkey" PRIMARY KEY ("materialId","userId")
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "TrainingMode" NOT NULL,
    "status" "TrainingSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "total" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "combo" INTEGER NOT NULL DEFAULT 0,
    "maxCombo" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "termId" TEXT,
    "prompt" JSONB NOT NULL,
    "answer" JSONB NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "rating" INTEGER,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DictionaryReviewLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "state" INTEGER NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "stability" DOUBLE PRECISION NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL,
    "scheduledDays" INTEGER NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DictionaryReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonBookmark" (
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonBookmark_pkey" PRIMARY KEY ("userId","lessonId")
);

-- CreateTable
CREATE TABLE "LessonReaction" (
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonReaction_pkey" PRIMARY KEY ("userId","lessonId")
);

-- CreateTable
CREATE TABLE "FeedPoll" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "closesAt" TIMESTAMP(3),

    CONSTRAINT "FeedPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedPollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "FeedPollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedPollVote" (
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedPollVote_pkey" PRIMARY KEY ("pollId","userId")
);

-- CreateTable
CREATE TABLE "OutboxJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserStudyPlan_userId_key" ON "UserStudyPlan"("userId");

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_startsAt_idx" ON "CalendarEvent"("userId", "startsAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_status_startsAt_idx" ON "CalendarEvent"("status", "startsAt");

-- CreateIndex
CREATE INDEX "SpeakingClub_status_startsAt_idx" ON "SpeakingClub"("status", "startsAt");

-- CreateIndex
CREATE INDEX "SpeakingClubBooking_clubId_status_createdAt_idx" ON "SpeakingClubBooking"("clubId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingClubBooking_clubId_userId_key" ON "SpeakingClubBooking"("clubId", "userId");

-- CreateIndex
CREATE INDEX "NotificationCampaign_status_scheduledAt_idx" ON "NotificationCampaign"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailDelivery_providerId_key" ON "EmailDelivery"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailDelivery_idempotencyKey_key" ON "EmailDelivery"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailDelivery_campaignId_status_idx" ON "EmailDelivery"("campaignId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmailEvent_webhookId_key" ON "EmailEvent"("webhookId");

-- CreateIndex
CREATE INDEX "EmailEvent_deliveryId_occurredAt_idx" ON "EmailEvent"("deliveryId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "StorageAsset_pathname_key" ON "StorageAsset"("pathname");

-- CreateIndex
CREATE INDEX "StorageAsset_ownerId_createdAt_idx" ON "StorageAsset"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "LibraryMaterial_status_publishedAt_idx" ON "LibraryMaterial"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "LibrarySave_userId_createdAt_idx" ON "LibrarySave"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TrainingSession_userId_startedAt_idx" ON "TrainingSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "TrainingAnswer_sessionId_createdAt_idx" ON "TrainingAnswer"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "DictionaryReviewLog_userId_reviewedAt_idx" ON "DictionaryReviewLog"("userId", "reviewedAt");

-- CreateIndex
CREATE INDEX "DictionaryReviewLog_userId_termId_reviewedAt_idx" ON "DictionaryReviewLog"("userId", "termId", "reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeedPoll_postId_key" ON "FeedPoll"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedPollOption_pollId_position_key" ON "FeedPollOption"("pollId", "position");

-- CreateIndex
CREATE INDEX "FeedPollVote_optionId_idx" ON "FeedPollVote"("optionId");

-- CreateIndex
CREATE INDEX "OutboxJob_status_runAt_idx" ON "OutboxJob"("status", "runAt");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verificationToken_key" ON "Certificate"("verificationToken");

-- CreateIndex
CREATE INDEX "Certificate_userId_courseLevel_idx" ON "Certificate"("userId", "courseLevel");

-- CreateIndex
CREATE INDEX "UserDictionaryTerm_userId_dueAt_idx" ON "UserDictionaryTerm"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "UserDictionaryTerm_userId_setName_idx" ON "UserDictionaryTerm"("userId", "setName");

-- AddForeignKey
ALTER TABLE "UserStudyPlan" ADD CONSTRAINT "UserStudyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingClubBooking" ADD CONSTRAINT "SpeakingClubBooking_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "SpeakingClub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingClubBooking" ADD CONSTRAINT "SpeakingClubBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationCampaign" ADD CONSTRAINT "NotificationCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "NotificationCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "NotificationCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "EmailDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageAsset" ADD CONSTRAINT "StorageAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryMaterial" ADD CONSTRAINT "LibraryMaterial_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryMaterial" ADD CONSTRAINT "LibraryMaterial_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "StorageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibrarySave" ADD CONSTRAINT "LibrarySave_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "LibraryMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibrarySave" ADD CONSTRAINT "LibrarySave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAnswer" ADD CONSTRAINT "TrainingAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DictionaryReviewLog" ADD CONSTRAINT "DictionaryReviewLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DictionaryReviewLog" ADD CONSTRAINT "DictionaryReviewLog_userId_termId_fkey" FOREIGN KEY ("userId", "termId") REFERENCES "UserDictionaryTerm"("userId", "termId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonBookmark" ADD CONSTRAINT "LessonBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonBookmark" ADD CONSTRAINT "LessonBookmark_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonReaction" ADD CONSTRAINT "LessonReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonReaction" ADD CONSTRAINT "LessonReaction_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPoll" ADD CONSTRAINT "FeedPoll_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPollOption" ADD CONSTRAINT "FeedPollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "FeedPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPollVote" ADD CONSTRAINT "FeedPollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "FeedPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPollVote" ADD CONSTRAINT "FeedPollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "FeedPollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPollVote" ADD CONSTRAINT "FeedPollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
