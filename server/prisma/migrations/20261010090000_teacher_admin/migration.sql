-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('OPEN', 'PENDING_REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('SUBMITTED', 'WITHDRAWN', 'APPROVED', 'REJECTED', 'ARCHIVED', 'RESTORED');

-- CreateEnum
CREATE TYPE "ModerationTarget" AS ENUM ('COURSE', 'REVISION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AiContentKind" ADD VALUE 'COURSE_DRAFT';
ALTER TYPE "AiContentKind" ADD VALUE 'COURSE_REVIEW';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'COURSE_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'COURSE_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_COURSE';
ALTER TYPE "NotificationType" ADD VALUE 'PROJECT_GRADED';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_REPLY';

-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- Chuyển dữ liệu (PLAN §2.4.5) TRƯỚC khi bỏ cột cũ: isPublished = true -> PUBLISHED (publishedAt = createdAt),
-- isPublished = false -> ARCHIVED (khóa cũ bị ẩn, học viên đã mua vẫn học được).
UPDATE "Course" SET "status" = 'PUBLISHED', "publishedAt" = "createdAt" WHERE "isPublished" = true;
UPDATE "Course" SET "status" = 'ARCHIVED' WHERE "isPublished" = false;

ALTER TABLE "Course" DROP COLUMN "isPublished";

-- AlterTable
ALTER TABLE "ProjectSubmission" ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "grade" INTEGER,
ADD COLUMN     "gradedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "teacherRepliedAt" TIMESTAMP(3),
ADD COLUMN     "teacherReply" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "disabledReason" TEXT;

-- CreateTable
CREATE TABLE "CourseRevision" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "CourseRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseModeration" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "ModerationAction" NOT NULL,
    "target" "ModerationTarget" NOT NULL DEFAULT 'COURSE',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseModeration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseRevision_courseId_key" ON "CourseRevision"("courseId");

-- CreateIndex
CREATE INDEX "CourseModeration_courseId_createdAt_idx" ON "CourseModeration"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "CourseModeration_actorId_idx" ON "CourseModeration"("actorId");

-- CreateIndex
CREATE INDEX "Course_status_idx" ON "Course"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "CourseRevision" ADD CONSTRAINT "CourseRevision_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseModeration" ADD CONSTRAINT "CourseModeration_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseModeration" ADD CONSTRAINT "CourseModeration_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

