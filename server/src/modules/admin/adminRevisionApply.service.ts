/**
 * Áp dụng bản sửa đổi vào khóa đang xuất bản (BR-21) - chạy BÊN TRONG transaction của admin duyệt.
 *  - chương/bài có `id` còn trong khóa -> cập nhật (kể cả đổi chương/thứ tự), giữ tiến độ học viên;
 *  - không có `id` (hoặc `id` không còn) -> tạo mới;
 *  - có trong khóa mà payload không nhắc -> xóa (mất `LessonProgress` của bài đó);
 *  - `order` unique theo (courseId, order) / (sectionId, order): dời toàn bộ `order` hiện có lên +ORDER_SHIFT
 *    rồi gán thứ tự cuối cùng 1..n, nên không bao giờ đụng nhau giữa chừng.
 * Sau đó tính lại `lessonCount`, `totalDurationSec`, `progressPercent` của từng ghi danh, dọn cache AI.
 */
import type { Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import type { CourseRevisionPayload } from '@/lib/courseRevisionPayload';
import { normalizeYouTubeUrl } from '@/lib/youtube';
import { computeProgressPercent } from '@/modules/lesson/lesson.logic';

type ApplyDb = Prisma.TransactionClient;

const ORDER_SHIFT = 100_000;

export type ApplyRevisionResult = {
  lessonCount: number;
  totalDurationSec: number;
  removedLessonIds: string[];
};

async function replaceTags(db: ApplyDb, courseId: string, tagIds: readonly string[]) {
  const existing = await db.tag.findMany({
    where: { id: { in: [...tagIds] } },
    select: { id: true },
  });
  await db.courseTag.deleteMany({ where: { courseId } });
  if (existing.length > 0) {
    await db.courseTag.createMany({
      data: existing.map((tag) => ({ courseId, tagId: tag.id })),
    });
  }
}

/** Tính lại % tiến độ mọi ghi danh theo danh sách bài mới (BR-04); chỉ ghi dòng thay đổi. */
async function recomputeEnrollmentProgress(
  db: ApplyDb,
  courseId: string,
  lessonCount: number,
): Promise<void> {
  const [enrollments, done] = await Promise.all([
    db.enrollment.findMany({
      where: { courseId },
      select: { id: true, userId: true, progressPercent: true, completedAt: true },
    }),
    db.lessonProgress.groupBy({
      by: ['userId'],
      where: { isCompleted: true, lesson: { section: { courseId } } },
      _count: { _all: true },
    }),
  ]);
  const doneByUser = new Map(done.map((row) => [row.userId, row._count._all]));
  for (const enrollment of enrollments) {
    const percent = computeProgressPercent(doneByUser.get(enrollment.userId) ?? 0, lessonCount);
    const needsCompletedAt = percent === 100 && enrollment.completedAt === null;
    if (percent === enrollment.progressPercent && !needsCompletedAt) continue;
    await db.enrollment.update({
      where: { id: enrollment.id },
      data: { progressPercent: percent, ...(needsCompletedAt ? { completedAt: new Date() } : {}) },
      select: { id: true },
    });
  }
}

async function applyCurriculum(
  db: ApplyDb,
  courseId: string,
  payload: CourseRevisionPayload,
): Promise<{ removedLessonIds: string[] }> {
  const liveSections = await db.section.findMany({
    where: { courseId },
    select: { id: true, lessons: { select: { id: true } } },
  });
  const liveSectionIds = new Set(liveSections.map((s) => s.id));
  const liveLessonIds = new Set(liveSections.flatMap((s) => s.lessons.map((l) => l.id)));
  const keptLessonIds = new Set(
    payload.sections.flatMap((s) =>
      s.lessons.flatMap((l) => (l.id && liveLessonIds.has(l.id) ? [l.id] : [])),
    ),
  );
  const keptSectionIds = new Set(
    payload.sections.flatMap((s) => (s.id && liveSectionIds.has(s.id) ? [s.id] : [])),
  );
  const removedLessonIds = [...liveLessonIds].filter((id) => !keptLessonIds.has(id));

  if (removedLessonIds.length > 0) {
    await db.lesson.deleteMany({ where: { id: { in: removedLessonIds } } });
  }
  // Dời thứ tự hiện có ra xa để gán lại 1..n không vướng unique.
  await db.section.updateMany({ where: { courseId }, data: { order: { increment: ORDER_SHIFT } } });
  await db.lesson.updateMany({
    where: { section: { courseId } },
    data: { order: { increment: ORDER_SHIFT } },
  });

  for (const [sectionIndex, section] of payload.sections.entries()) {
    const order = sectionIndex + 1;
    const sectionId =
      section.id && keptSectionIds.has(section.id)
        ? (
            await db.section.update({
              where: { id: section.id },
              data: { title: section.title, order },
              select: { id: true },
            })
          ).id
        : (
            await db.section.create({
              data: { courseId, title: section.title, order },
              select: { id: true },
            })
          ).id;

    for (const [lessonIndex, lesson] of section.lessons.entries()) {
      const data = {
        title: lesson.title,
        videoUrl: normalizeYouTubeUrl(lesson.videoUrl) ?? lesson.videoUrl,
        durationSec: lesson.durationSec,
        isPreview: lesson.isPreview,
        content: lesson.content,
        sectionId,
        order: lessonIndex + 1,
      };
      if (lesson.id && keptLessonIds.has(lesson.id)) {
        await db.lesson.update({ where: { id: lesson.id }, data, select: { id: true } });
      } else {
        await db.lesson.create({ data, select: { id: true } });
      }
    }
  }

  const removedSectionIds = [...liveSectionIds].filter((id) => !keptSectionIds.has(id));
  if (removedSectionIds.length > 0) {
    await db.section.deleteMany({ where: { id: { in: removedSectionIds } } });
  }
  return { removedLessonIds };
}

/**
 * Ghi toàn bộ bản sửa đổi lên khóa. KHÔNG xóa dòng `CourseRevision` và không ghi lịch sử duyệt (việc của
 * `approveCourse`). Danh mục không còn tồn tại -> 422 `COURSE_INCOMPLETE` (`NO_CATEGORY`).
 */
export async function applyRevision(
  db: ApplyDb,
  courseId: string,
  payload: CourseRevisionPayload,
): Promise<ApplyRevisionResult> {
  const category = await db.category.findUnique({
    where: { id: payload.categoryId },
    select: { id: true },
  });
  if (!category) {
    throw ApiError.of('COURSE_INCOMPLETE', 'The category of this revision no longer exists', {
      missing: [{ code: 'NO_CATEGORY' }],
    });
  }

  const { removedLessonIds } = await applyCurriculum(db, courseId, payload);
  const lessons = payload.sections.flatMap((section) => section.lessons);
  const lessonCount = lessons.length;
  const totalDurationSec = lessons.reduce((sum, lesson) => sum + lesson.durationSec, 0);

  await db.course.update({
    where: { id: courseId },
    data: {
      title: payload.title,
      priceCents: payload.priceCents,
      originalPriceCents: payload.originalPriceCents,
      categoryId: payload.categoryId,
      lessonCount,
      totalDurationSec,
    },
    select: { id: true },
  });
  await replaceTags(db, courseId, payload.tagIds);
  await recomputeEnrollmentProgress(db, courseId, lessonCount);

  // Tóm tắt khóa dựa trên nội dung cũ; tóm tắt/quiz của bài đã xóa không còn dùng được.
  await db.aiContent.deleteMany({
    where: {
      OR: [
        { kind: 'COURSE_SUMMARY', refId: courseId },
        ...(removedLessonIds.length > 0
          ? [
              {
                kind: { in: ['LESSON_SUMMARY', 'QUIZ'] as ('LESSON_SUMMARY' | 'QUIZ')[] },
                refId: { in: removedLessonIds },
              },
            ]
          : []),
      ],
    },
  });

  return { lessonCount, totalDurationSec, removedLessonIds };
}
