import type { CourseStatus, Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { prisma } from '@/lib/prisma';

type OwnershipDb = Pick<
  Prisma.TransactionClient,
  'course' | 'teacherProfile' | 'lesson' | 'section'
>;

export type OwnedCourse = {
  id: string;
  title: string;
  status: CourseStatus;
  /** `TeacherProfile.id` của chủ khóa. */
  teacherId: string;
  publishedAt: Date | null;
  submittedAt: Date | null;
};

const ownedCourseSelect = {
  id: true,
  title: true,
  status: true,
  teacherId: true,
  publishedAt: true,
  submittedAt: true,
} satisfies Prisma.CourseSelect;

/**
 * Guard cho mọi route `/teacher/courses/:id/*` (BR-23): khóa phải tồn tại VÀ thuộc về giảng viên
 * `userId` (`User.id`). Khóa của người khác cũng trả 404 `COURSE_NOT_FOUND` (không lộ sự tồn tại).
 * Trả các trường cơ bản để service dùng tiếp (đỡ 1 query); cần thêm trường thì tự query lại.
 */
export async function assertCourseOwner(
  userId: string,
  courseId: string,
  db: OwnershipDb = prisma,
): Promise<OwnedCourse> {
  const course = await db.course.findFirst({
    where: { id: courseId, teacher: { userId } },
    select: ownedCourseSelect,
  });
  if (!course) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');
  return course;
}

/** Như `assertCourseOwner` nhưng cho route theo id chương (`/teacher/sections/:id`). */
export async function assertSectionOwner(
  userId: string,
  sectionId: string,
  db: OwnershipDb = prisma,
): Promise<{ sectionId: string; course: OwnedCourse }> {
  const section = await db.section.findFirst({
    where: { id: sectionId, course: { teacher: { userId } } },
    select: { id: true, course: { select: ownedCourseSelect } },
  });
  if (!section) throw ApiError.of('NOT_FOUND', 'Section not found');
  return { sectionId: section.id, course: section.course };
}

/** Như `assertCourseOwner` nhưng cho route theo id bài học (`/teacher/lessons/:id`). */
export async function assertLessonOwner(
  userId: string,
  lessonId: string,
  db: OwnershipDb = prisma,
): Promise<{ lessonId: string; sectionId: string; course: OwnedCourse }> {
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, section: { course: { teacher: { userId } } } },
    select: {
      id: true,
      sectionId: true,
      section: { select: { course: { select: ownedCourseSelect } } },
    },
  });
  if (!lesson) throw ApiError.of('LESSON_NOT_FOUND', 'Lesson not found');
  return { lessonId: lesson.id, sectionId: lesson.sectionId, course: lesson.section.course };
}

/** `TeacherProfile.id` của user (giảng viên); chưa có hồ sơ -> 403 `FORBIDDEN`. */
export async function getTeacherProfileId(
  userId: string,
  db: Pick<Prisma.TransactionClient, 'teacherProfile'> = prisma,
): Promise<string> {
  const profile = await db.teacherProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) throw ApiError.of('FORBIDDEN', 'Teacher profile not found');
  return profile.id;
}

/** User có phải giảng viên (chủ) của khóa không - dùng cho Q&A / đánh giá / chấm project (BR-24…26). */
export async function isCourseTeacher(
  userId: string,
  courseId: string,
  db: Pick<Prisma.TransactionClient, 'course'> = prisma,
): Promise<boolean> {
  const course = await db.course.findFirst({
    where: { id: courseId, teacher: { userId } },
    select: { id: true },
  });
  return course !== null;
}

/**
 * Cho route theo tài nguyên của khóa (câu trả lời, đánh giá, bài nộp): không phải giảng viên của khóa ->
 * 403 `NOT_COURSE_TEACHER` (khóa/tài nguyên đã được xác nhận tồn tại trước đó bởi service gọi).
 */
export async function assertCourseTeacher(
  userId: string,
  courseId: string,
  db: Pick<Prisma.TransactionClient, 'course'> = prisma,
): Promise<void> {
  if (!(await isCourseTeacher(userId, courseId, db))) {
    throw ApiError.of('NOT_COURSE_TEACHER', 'Only the course instructor can do this');
  }
}
