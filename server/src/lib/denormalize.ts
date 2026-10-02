import { prisma } from '@/lib/prisma';

/**
 * Tính lại MỌI trường denormalize từ dữ liệu gốc (PLAN §8.3): ratingAvg, ratingCount, enrollmentCount,
 * lessonCount, totalDurationSec, likeCount (khóa + câu hỏi), answerCount.
 */
export async function recomputeDenormalized(): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Course" SET
      "lessonCount" = (
        SELECT COUNT(*) FROM "Lesson" l JOIN "Section" s ON s."id" = l."sectionId"
        WHERE s."courseId" = "Course"."id"),
      "totalDurationSec" = (
        SELECT COALESCE(SUM(l."durationSec"), 0) FROM "Lesson" l JOIN "Section" s ON s."id" = l."sectionId"
        WHERE s."courseId" = "Course"."id"),
      "ratingCount" = (SELECT COUNT(*) FROM "Review" r WHERE r."courseId" = "Course"."id"),
      "ratingAvg" = COALESCE(
        (SELECT ROUND(AVG(r."rating")::numeric, 1)::float8 FROM "Review" r WHERE r."courseId" = "Course"."id"), 0),
      "enrollmentCount" = (SELECT COUNT(*) FROM "Enrollment" e WHERE e."courseId" = "Course"."id"),
      "likeCount" = (SELECT COUNT(*) FROM "CourseLike" cl WHERE cl."courseId" = "Course"."id")`;
  await prisma.$executeRaw`
    UPDATE "Question" SET
      "answerCount" = (SELECT COUNT(*) FROM "Answer" a WHERE a."questionId" = "Question"."id"),
      "likeCount" = (SELECT COUNT(*) FROM "QuestionLike" ql WHERE ql."questionId" = "Question"."id")`;
}
