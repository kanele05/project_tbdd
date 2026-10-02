import { ApiError } from '@/lib/ApiError';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';
import { toAbsoluteUrl } from '@/lib/url';
import type { CurriculumSectionDto, LessonDetailDto, LessonProgressResponseDto } from '@/types/dto';

import {
  ANONYMOUS_VIEWER,
  buildCurriculum,
  clampPosition,
  computeProgressPercent,
  type CurriculumViewer,
} from './lesson.logic';
import type { SaveProgressBody } from './lesson.schema';

function lessonNotFound(): ApiError {
  return ApiError.of('LESSON_NOT_FOUND', 'Lesson not found');
}

function notEnrolled(): ApiError {
  return ApiError.of('NOT_ENROLLED', 'Enroll in this course to watch this lesson');
}

async function loadViewer(userId: string, courseId: string): Promise<CurriculumViewer> {
  const [enrollment, completed] = await Promise.all([
    prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { lastLessonId: true },
    }),
    prisma.lessonProgress.findMany({
      where: { userId, isCompleted: true, lesson: { section: { courseId } } },
      select: { lessonId: true },
    }),
  ]);
  return {
    isEnrolled: enrollment !== null,
    lastLessonId: enrollment?.lastLessonId ?? null,
    completedLessonIds: new Set(completed.map((row) => row.lessonId)),
  };
}

/**
 * `GET /courses/:id/curriculum` (BR-02): chương -> bài kèm `number` liên tục và `status`.
 * Khách (không token) vẫn xem được: bài preview = UNLOCKED, còn lại LOCKED.
 */
export async function getCurriculum(
  courseId: string,
  userId?: string,
): Promise<CurriculumSectionDto[]> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, isPublished: true },
    select: {
      sections: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          order: true,
          lessons: {
            orderBy: { order: 'asc' },
            select: { id: true, title: true, durationSec: true, isPreview: true },
          },
        },
      },
    },
  });
  if (!course) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');

  const viewer = userId ? await loadViewer(userId, courseId) : ANONYMOUS_VIEWER;
  return buildCurriculum(course.sections, viewer);
}

/**
 * Bài kế tiếp theo thứ tự khóa (cùng chương `order` lớn hơn, hoặc bài đầu của chương sau).
 * Người chưa ghi danh chỉ được trỏ tới bài kế tiếp nếu nó cũng là preview.
 */
async function findNextLessonId(
  lesson: { sectionId: string; order: number; sectionOrder: number; courseId: string },
  isEnrolled: boolean,
): Promise<string | null> {
  const next = await prisma.lesson.findFirst({
    where: {
      OR: [
        { sectionId: lesson.sectionId, order: { gt: lesson.order } },
        { section: { courseId: lesson.courseId, order: { gt: lesson.sectionOrder } } },
      ],
    },
    orderBy: [{ section: { order: 'asc' } }, { order: 'asc' }],
    select: { id: true, isPreview: true },
  });
  if (!next) return null;
  return isEnrolled || next.isPreview ? next.id : null;
}

/**
 * `GET /lessons/:id` (BR-01): đã ghi danh HOẶC bài preview mới được xem; ngược lại 403 `NOT_ENROLLED`
 * và KHÔNG lộ `videoUrl`. Đã ghi danh -> ghi nhận bài đang học (`lastLessonId`, `lastAccessedAt`).
 */
export async function getLesson(userId: string, lessonId: string): Promise<LessonDetailDto> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      order: true,
      durationSec: true,
      videoUrl: true,
      isPreview: true,
      sectionId: true,
      section: { select: { order: true, courseId: true } },
    },
  });
  if (!lesson) throw lessonNotFound();

  const courseId = lesson.section.courseId;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  });
  if (!enrollment && !lesson.isPreview) throw notEnrolled();

  const [progress, nextLessonId] = await Promise.all([
    prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { positionSec: true, isCompleted: true },
    }),
    findNextLessonId(
      {
        sectionId: lesson.sectionId,
        order: lesson.order,
        sectionOrder: lesson.section.order,
        courseId,
      },
      enrollment !== null,
    ),
  ]);

  if (enrollment) {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { lastLessonId: lesson.id, lastAccessedAt: new Date() },
      select: { id: true },
    });
  }

  return {
    id: lesson.id,
    courseId,
    title: lesson.title,
    durationSec: lesson.durationSec,
    videoUrl: toAbsoluteUrl(lesson.videoUrl),
    positionSec: progress?.positionSec ?? 0,
    isCompleted: progress?.isCompleted ?? false,
    nextLessonId,
  };
}

type LockedEnrollment = { id: string; progressPercent: number };

/** Khóa hàng ghi danh (`FOR UPDATE`) để các lần lưu tiến độ song song của cùng một người không đếm lệch %. */
async function lockEnrollment(
  tx: Pick<typeof prisma, '$queryRaw'>,
  userId: string,
  courseId: string,
): Promise<LockedEnrollment> {
  const rows = await tx.$queryRaw<LockedEnrollment[]>`
    SELECT "id", "progressPercent" FROM "Enrollment"
    WHERE "userId" = ${userId} AND "courseId" = ${courseId}
    FOR UPDATE`;
  const enrollment = rows[0];
  if (!enrollment) throw notEnrolled();
  return enrollment;
}

/**
 * `PUT /lessons/:id/progress` (✓E):
 * - BR-03: `positionSec` được làm tròn + kẹp trong [0, durationSec]; bài đã hoàn thành thì không bị bỏ
 *   hoàn thành (`isCompleted` chỉ có thể false -> true).
 * - BR-04: khi một bài VỪA hoàn thành thì tính lại `progressPercent = round(done / total * 100)`;
 *   đạt 100 % -> `completedAt` + thông báo `COURSE_COMPLETED` (một lần).
 * Mọi thay đổi trong 1 transaction. Gọi lặp lại cùng nội dung là idempotent.
 */
export async function saveProgress(
  userId: string,
  lessonId: string,
  body: SaveProgressBody,
): Promise<LessonProgressResponseDto> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      durationSec: true,
      section: { select: { courseId: true, course: { select: { title: true } } } },
    },
  });
  if (!lesson) throw lessonNotFound();
  const { courseId, course } = lesson.section;
  const positionSec = clampPosition(body.positionSec, lesson.durationSec);

  return prisma.$transaction(async (tx) => {
    const enrollment = await lockEnrollment(tx, userId, courseId);
    const existing = await tx.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { isCompleted: true },
    });
    const wasCompleted = existing?.isCompleted === true;
    const isCompleted = wasCompleted || body.isCompleted === true;

    await tx.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, positionSec, isCompleted },
      update: { positionSec, isCompleted },
      select: { lessonId: true },
    });

    let courseProgressPercent = enrollment.progressPercent;
    const enrollmentData: { lastAccessedAt: Date; progressPercent?: number; completedAt?: Date } = {
      lastAccessedAt: new Date(),
    };
    if (isCompleted && !wasCompleted) {
      const [total, done] = await Promise.all([
        tx.lesson.count({ where: { section: { courseId } } }),
        tx.lessonProgress.count({
          where: { userId, isCompleted: true, lesson: { section: { courseId } } },
        }),
      ]);
      courseProgressPercent = computeProgressPercent(done, total);
      enrollmentData.progressPercent = courseProgressPercent;
      if (courseProgressPercent === 100 && enrollment.progressPercent < 100) {
        enrollmentData.completedAt = new Date();
        await notify(tx, {
          userId,
          type: 'COURSE_COMPLETED',
          title: 'Course completed',
          body: `Congratulations! You completed "${course.title}".`,
          data: { courseId },
        });
      }
    }
    await tx.enrollment.update({
      where: { id: enrollment.id },
      data: enrollmentData,
      select: { id: true },
    });

    return { lessonProgress: { positionSec, isCompleted }, courseProgressPercent };
  });
}
