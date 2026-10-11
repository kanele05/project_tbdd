import type { Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { prisma } from '@/lib/prisma';

/** `prisma` hoặc `tx` của `prisma.$transaction(async (tx) => ...)`. */
type EnrollmentDb = Pick<Prisma.TransactionClient, 'enrollment' | 'course'>;

export type EnrollmentInfo = {
  id: string;
  progressPercent: number;
  lastLessonId: string | null;
};

const enrollmentInfoSelect = {
  id: true,
  progressPercent: true,
  lastLessonId: true,
} satisfies Prisma.EnrollmentSelect;

/**
 * Chốt chặn quyền "✓E" (BR-01, BR-08, BR-09, NFR-06): người dùng phải đã ghi danh khóa học.
 * Không ghi danh -> 403 `NOT_ENROLLED`. Trả về bản ghi ghi danh để service dùng tiếp (đỡ 1 query).
 * Dùng chung cho mọi module có endpoint "✓E" (lesson, review, question, project).
 */
export async function assertEnrolled(
  userId: string,
  courseId: string,
  db: EnrollmentDb = prisma,
): Promise<EnrollmentInfo> {
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: enrollmentInfoSelect,
  });
  if (!enrollment) {
    throw ApiError.of('NOT_ENROLLED', 'Enroll in this course to continue');
  }
  return enrollment;
}

/**
 * Như `assertEnrolled` nhưng phân biệt khóa không tồn tại: 404 `COURSE_NOT_FOUND` thay vì 403.
 * Một query duy nhất (course + enrollment của user) cho đường thành công.
 */
export async function assertEnrolledInCourse(
  userId: string,
  courseId: string,
  db: EnrollmentDb = prisma,
): Promise<EnrollmentInfo> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      enrollments: { where: { userId }, select: enrollmentInfoSelect, take: 1 },
    },
  });
  if (!course) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');
  const enrollment = course.enrollments[0];
  if (!enrollment) throw ApiError.of('NOT_ENROLLED', 'Enroll in this course to continue');
  return enrollment;
}

/** 404 `COURSE_NOT_FOUND` nếu khóa không tồn tại hoặc chưa publish. */
export async function assertCoursePublished(
  courseId: string,
  db: Pick<Prisma.TransactionClient, 'course'> = prisma,
): Promise<void> {
  const course = await db.course.findFirst({
    where: { id: courseId, status: 'PUBLISHED' },
    select: { id: true },
  });
  if (!course) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');
}
