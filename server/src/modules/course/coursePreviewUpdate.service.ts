import { type Prisma, prisma } from '@/lib/prisma';

export type CoursePreviewUpdate = {
  courseId: string;
  lessonIds: readonly [string, string];
  videoUrl: string;
  durationSec: number;
};

function validatePreviews(previews: readonly CoursePreviewUpdate[]) {
  if (new Set(previews.map((preview) => preview.courseId)).size !== previews.length) {
    throw new Error('Duplicate course in preview manifest');
  }
  for (const preview of previews) {
    if (!Number.isInteger(preview.durationSec) || preview.durationSec <= 0) {
      throw new Error(`Invalid preview duration: ${preview.courseId}`);
    }
    const videoUrl = new URL(preview.videoUrl);
    if (!['http:', 'https:'].includes(videoUrl.protocol)) {
      throw new Error(`Invalid preview URL: ${preview.courseId}`);
    }
  }
}

async function syncPreview(
  transaction: Prisma.TransactionClient,
  preview: CoursePreviewUpdate,
  shouldApply: boolean,
) {
  const lessons = await transaction.lesson.findMany({
    where: { id: { in: [...preview.lessonIds] } },
    select: {
      id: true,
      isPreview: true,
      videoUrl: true,
      durationSec: true,
      section: { select: { courseId: true } },
    },
  });
  if (
    lessons.length !== 2 ||
    lessons.some((lesson) => !lesson.isPreview || lesson.section.courseId !== preview.courseId)
  ) {
    throw new Error(`Expected two matching preview lessons: ${preview.courseId}`);
  }
  const changedLessons = lessons.filter(
    (lesson) => lesson.videoUrl !== preview.videoUrl || lesson.durationSec !== preview.durationSec,
  );
  if (shouldApply && changedLessons.length > 0) {
    const result = await transaction.lesson.updateMany({
      where: {
        id: { in: changedLessons.map((lesson) => lesson.id) },
        isPreview: true,
        section: { courseId: preview.courseId },
      },
      data: { videoUrl: preview.videoUrl, durationSec: preview.durationSec },
    });
    if (result.count !== changedLessons.length)
      throw new Error('Preview lessons changed concurrently');
    const total = await transaction.lesson.aggregate({
      where: { section: { courseId: preview.courseId } },
      _sum: { durationSec: true },
    });
    await transaction.course.update({
      where: { id: preview.courseId },
      data: { totalDurationSec: total._sum.durationSec ?? 0 },
    });
  }
  return { courseId: preview.courseId, changedLessons: changedLessons.length };
}

export async function updateCoursePreviews(
  previews: readonly CoursePreviewUpdate[],
  shouldApply = false,
) {
  validatePreviews(previews);
  return prisma.$transaction(
    async (transaction) => {
      const changes = [];
      for (const preview of previews) {
        changes.push(await syncPreview(transaction, preview, shouldApply));
      }
      return { applied: shouldApply, changes };
    },
    { timeout: 30_000 },
  );
}
