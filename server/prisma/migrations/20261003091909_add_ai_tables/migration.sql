-- CreateEnum
CREATE TYPE "AiContentKind" AS ENUM ('COURSE_SUMMARY', 'LESSON_SUMMARY', 'RECOMMENDATIONS', 'QUIZ');

-- CreateEnum
CREATE TYPE "AiChatRole" AS ENUM ('USER', 'ASSISTANT');

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "content" TEXT;

-- CreateTable
CREATE TABLE "AiContent" (
    "id" TEXT NOT NULL,
    "kind" "AiContentKind" NOT NULL,
    "refId" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'en',
    "content" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AiContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "role" "AiChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiContent_kind_refId_lang_key" ON "AiContent"("kind", "refId", "lang");

-- CreateIndex
CREATE INDEX "AiChatMessage_userId_courseId_createdAt_idx" ON "AiChatMessage"("userId", "courseId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiChatMessage" ADD CONSTRAINT "AiChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiChatMessage" ADD CONSTRAINT "AiChatMessage_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
