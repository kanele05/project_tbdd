import { type Prisma, prisma } from '@/lib/prisma';

export type PreviewLessonUpdate = {
  lessonId: string;
  videoUrl: string;
  durationSec: number;
};

export type CoursePreviewUpdate = {
  courseId: string;
  /** Hai bài xem thử của khóa; mỗi bài có đoạn video riêng. */
  lessons: readonly [PreviewLessonUpdate, PreviewLessonUpdate];
};

const ALLOWED_PREVIEW_ORIGIN = 'https://www.youtube.com';
const ALLOWED_PREVIEW_PATH = '/watch';

function assertAllowedPreviewUrl(lesson: PreviewLessonUpdate) {
  let videoUrl: URL;
  try {
    videoUrl = new URL(lesson.videoUrl);
  } catch {
    throw new Error(`Invalid preview URL: ${lesson.lessonId}`);
  }
  if (videoUrl.origin !== ALLOWED_PREVIEW_ORIGIN || videoUrl.pathname !== ALLOWED_PREVIEW_PATH) {
    throw new Error(`Invalid preview URL: ${lesson.lessonId}`);
  }
}

function validatePreviews(previews: readonly CoursePreviewUpdate[]) {
  if (new Set(previews.map((preview) => preview.courseId)).size !== previews.length) {
    throw new Error('Duplicate course in preview manifest');
  }
  const lessonIds = previews.flatMap((preview) => preview.lessons.map((lesson) => lesson.lessonId));
  if (new Set(lessonIds).size !== lessonIds.length) {
    throw new Error('Duplicate lesson in preview manifest');
  }
  for (const preview of previews) {
    for (const lesson of preview.lessons) {
      if (!Number.isInteger(lesson.durationSec) || lesson.durationSec <= 0) {
        throw new Error(`Invalid preview duration: ${lesson.lessonId}`);
      }
      assertAllowedPreviewUrl(lesson);
    }
  }
}

async function syncPreview(
  transaction: Prisma.TransactionClient,
  preview: CoursePreviewUpdate,
  shouldApply: boolean,
) {
  const lessons = await transaction.lesson.findMany({
    where: { id: { in: preview.lessons.map((lesson) => lesson.lessonId) } },
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
  const changes = preview.lessons.filter((target) => {
    const current = lessons.find((lesson) => lesson.id === target.lessonId);
    return current?.videoUrl !== target.videoUrl || current.durationSec !== target.durationSec;
  });
  if (shouldApply && changes.length > 0) {
    for (const target of changes) {
      const result = await transaction.lesson.updateMany({
        where: { id: target.lessonId, isPreview: true, section: { courseId: preview.courseId } },
        data: { videoUrl: target.videoUrl, durationSec: target.durationSec },
      });
      if (result.count !== 1) throw new Error('Preview lessons changed concurrently');
    }
    const total = await transaction.lesson.aggregate({
      where: { section: { courseId: preview.courseId } },
      _sum: { durationSec: true },
    });
    await transaction.course.update({
      where: { id: preview.courseId },
      data: { totalDurationSec: total._sum.durationSec ?? 0 },
    });
  }
  return { courseId: preview.courseId, changedLessons: changes.length };
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
