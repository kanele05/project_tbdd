import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { toAbsoluteUrl } from '@/lib/url';
import type { MyCourseItemDto } from '@/types/dto';

import type { MyCoursesStatus } from './enrollment.schema';

const myCourseSelect = {
  progressPercent: true,
  lastLessonId: true,
  lastAccessedAt: true,
  course: { select: { id: true, title: true, thumbnailUrl: true, totalDurationSec: true } },
} satisfies Prisma.EnrollmentSelect;

type MyCourseRow = Prisma.EnrollmentGetPayload<{ select: typeof myCourseSelect }>;

/** BR-05: ongoing = % < 100, completed = % = 100, all = tất cả. */
export function progressFilter(status: MyCoursesStatus): Prisma.EnrollmentWhereInput {
  if (status === 'ongoing') return { progressPercent: { lt: 100 } };
  if (status === 'completed') return { progressPercent: { gte: 100 } };
  return {};
}

type CourseLesson = { id: string; title: string };

/** Giáo trình + tiến độ đã gom sẵn cho cả trang: tránh N+1 khi dựng từng item. */
export type MyCourseProgress = {
  /** courseId -> các bài theo thứ tự giáo trình (section.order, lesson.order). */
  lessonsByCourse: Map<string, CourseLesson[]>;
  /** lessonId của các bài user đã hoàn thành. */
  completedLessonIds: Set<string>;
};

export function toMyCourseItem(row: MyCourseRow, progress: MyCourseProgress): MyCourseItemDto {
  const lessons = progress.lessonsByCourse.get(row.course.id) ?? [];
  const lastIndex =
    row.lastLessonId === null ? -1 : lessons.findIndex((lesson) => lesson.id === row.lastLessonId);
  const lastLesson = lastIndex >= 0 ? lessons[lastIndex] : undefined;
  return {
    course: {
      id: row.course.id,
      title: row.course.title,
      thumbnailUrl: toAbsoluteUrl(row.course.thumbnailUrl),
    },
    totalDurationSec: row.course.totalDurationSec,
    progressPercent: row.progressPercent,
    lastLessonId: row.lastLessonId,
    lastAccessedAt: row.lastAccessedAt.toISOString(),
    lessonCount: lessons.length,
    completedLessonCount: lessons.filter((lesson) => progress.completedLessonIds.has(lesson.id))
      .length,
    lastLesson: lastLesson
      ? { id: lastLesson.id, title: lastLesson.title, number: lastIndex + 1 }
      : null,
  };
}

/** 2 truy vấn cho cả trang: toàn bộ bài của các khóa + các bài user đã hoàn thành. */
async function loadProgress(userId: string, courseIds: string[]): Promise<MyCourseProgress> {
  const lessonsByCourse = new Map<string, CourseLesson[]>();
  if (courseIds.length === 0) return { lessonsByCourse, completedLessonIds: new Set() };

  const [lessons, completed] = await Promise.all([
    prisma.lesson.findMany({
      where: { section: { courseId: { in: courseIds } } },
      orderBy: [{ section: { order: 'asc' } }, { order: 'asc' }],
      select: { id: true, title: true, section: { select: { courseId: true } } },
    }),
    prisma.lessonProgress.findMany({
      where: { userId, isCompleted: true, lesson: { section: { courseId: { in: courseIds } } } },
      select: { lessonId: true },
    }),
  ]);
  for (const lesson of lessons) {
    const list = lessonsByCourse.get(lesson.section.courseId) ?? [];
    list.push({ id: lesson.id, title: lesson.title });
    lessonsByCourse.set(lesson.section.courseId, list);
  }
  return { lessonsByCourse, completedLessonIds: new Set(completed.map((c) => c.lessonId)) };
}

/** `GET /me/courses?status=`: khóa đã ghi danh, học gần nhất trước (BR-05). Không phân trang. */
export async function listMyCourses(
  userId: string,
  status: MyCoursesStatus = 'all',
): Promise<MyCourseItemDto[]> {
  const rows = await prisma.enrollment.findMany({
    where: { userId, ...progressFilter(status) },
    orderBy: [{ lastAccessedAt: 'desc' }, { id: 'asc' }],
    select: myCourseSelect,
  });
  const progress = await loadProgress(
    userId,
    rows.map((row) => row.course.id),
  );
  return rows.map((row) => toMyCourseItem(row, progress));
}
