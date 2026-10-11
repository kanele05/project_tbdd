import type { Prisma, Role } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { prisma } from '@/lib/prisma';

/**
 * Ai được xem khóa học theo trạng thái (BR-19, BR-22, BR-23):
 *  - khách / người lạ: chỉ khóa `PUBLISHED`;
 *  - học viên đã ghi danh: xem được mọi trạng thái (khóa bị ẩn `ARCHIVED` vẫn học tiếp được);
 *  - giảng viên chủ khóa: xem được mọi trạng thái (kể cả DRAFT / PENDING_REVIEW);
 *  - ADMIN: xem được tất cả.
 * Khóa không xem được -> 404 `COURSE_NOT_FOUND` (không lộ sự tồn tại).
 */
export type CourseViewer = { id: string; role?: Role };

/** Điều kiện `where` (đã gồm `id`) để tìm 1 khóa mà `viewer` được phép xem. */
export function visibleCourseWhere(
  courseId: string,
  viewer?: CourseViewer,
): Prisma.CourseWhereInput {
  if (!viewer) return { id: courseId, status: 'PUBLISHED' };
  if (viewer.role === 'ADMIN') return { id: courseId };
  return {
    id: courseId,
    OR: [
      { status: 'PUBLISHED' },
      { enrollments: { some: { userId: viewer.id } } },
      { teacher: { userId: viewer.id } },
    ],
  };
}

/** 404 `COURSE_NOT_FOUND` nếu khóa không tồn tại hoặc `viewer` không được xem. */
export async function assertCourseVisible(
  courseId: string,
  viewer?: CourseViewer,
  db: Pick<Prisma.TransactionClient, 'course'> = prisma,
): Promise<void> {
  const course = await db.course.findFirst({
    where: visibleCourseWhere(courseId, viewer),
    select: { id: true },
  });
  if (!course) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');
}
