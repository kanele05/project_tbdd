import type { Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { getBookmarkedIds } from '@/lib/bookmarkedIds';
import {
  courseSummarySelect,
  reviewDtoSelect,
  roundRating,
  teacherSummarySelect,
  toCourseSummary,
  toReviewDto,
  toTeacherSummary,
} from '@/lib/mappers';
import { buildPaginationMeta, getPagination, type PaginationMeta } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import { toAbsoluteUrlOrNull } from '@/lib/url';
import type {
  CourseSummaryDto,
  FollowStateDto,
  ReviewDto,
  TeacherCoursesGroupDto,
  TeacherDetailDto,
  TeacherSummaryDto,
} from '@/types/dto';

import { formatLocalTime } from './localTime';
import type { ListTeachersQuery } from './teacher.schema';

/** Rating TB của nhóm khóa từ ngưỡng này trở lên được gắn nhãn "Top-rated". */
export const TOP_RATED_THRESHOLD = 4.5;
/** Số khóa tối đa trả về trong `GET /teachers/:id/courses`. */
const MAX_TEACHER_COURSES = 100;

function teacherNotFound(): ApiError {
  return ApiError.of('TEACHER_NOT_FOUND', 'Teacher not found');
}

// ---------------------------------------------------------------- Xếp hạng (BR-11)

/** ratingAvg giảm dần, rồi ratingCount giảm dần, rồi tên (ổn định giữa các lần gọi). */
export function compareTeachers(a: TeacherSummaryDto, b: TeacherSummaryDto): number {
  return (
    b.ratingAvg - a.ratingAvg ||
    b.ratingCount - a.ratingCount ||
    a.fullName.localeCompare(b.fullName) ||
    a.id.localeCompare(b.id)
  );
}

/**
 * Giảng viên có >= 1 khóa đã publish, xếp theo rating TB các khóa (BR-11). Số giảng viên nhỏ
 * nên xếp trong bộ nhớ; `TeacherSummary.ratingAvg` là giá trị tính (không lưu ở DB).
 */
async function rankTeachers(): Promise<TeacherSummaryDto[]> {
  const rows = await prisma.teacherProfile.findMany({
    where: { courses: { some: { isPublished: true } } },
    select: teacherSummarySelect,
  });
  return rows.map(toTeacherSummary).sort(compareTeachers);
}

/** `limit` giảng viên đứng đầu - dùng cho `GET /home` (topTeachers). */
export async function getTopTeachers(limit: number): Promise<TeacherSummaryDto[]> {
  return (await rankTeachers()).slice(0, limit);
}

export async function listTeachers(
  query: ListTeachersQuery,
): Promise<{ teachers: TeacherSummaryDto[]; meta: PaginationMeta }> {
  const pagination = getPagination(query);
  const ranked = await rankTeachers();
  return {
    teachers: ranked.slice(pagination.skip, pagination.skip + pagination.take),
    meta: buildPaginationMeta(ranked.length, pagination),
  };
}

// ---------------------------------------------------------------- GET /teachers/:id

const teacherDetailSelect = {
  ...teacherSummarySelect,
  jobTitle: true,
  bio: true,
  location: true,
  timezone: true,
  user: { select: { fullName: true, avatarUrl: true, coverUrl: true } },
} satisfies Prisma.TeacherProfileSelect;

/** Số học viên khác nhau đã ghi danh vào các khóa đã publish của giảng viên. */
async function countDistinctStudents(teacherId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT e."userId") AS count
    FROM "Enrollment" e
    JOIN "Course" c ON c."id" = e."courseId"
    WHERE c."teacherId" = ${teacherId} AND c."isPublished" = true`;
  return Number(rows[0]?.count ?? 0);
}

export async function getTeacherDetail(
  teacherId: string,
  userId?: string,
  now: Date = new Date(),
): Promise<TeacherDetailDto> {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: teacherDetailSelect,
  });
  if (!teacher) throw teacherNotFound();

  const [courseCount, studentCount, followerCount, follow] = await Promise.all([
    prisma.course.count({ where: { teacherId, isPublished: true } }),
    countDistinctStudents(teacherId),
    prisma.follow.count({ where: { teacherId } }),
    userId
      ? prisma.follow.findUnique({
          where: { userId_teacherId: { userId, teacherId } },
          select: { userId: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    ...toTeacherSummary(teacher),
    jobTitle: teacher.jobTitle,
    bio: teacher.bio,
    coverUrl: toAbsoluteUrlOrNull(teacher.user.coverUrl),
    location: teacher.location,
    timezone: teacher.timezone,
    localTime: formatLocalTime(teacher.timezone, now),
    isFollowed: follow !== null,
    stats: { courseCount, studentCount, followerCount },
  };
}

// ---------------------------------------------------------------- GET /teachers/:id/courses

type GroupInput = {
  category: { id: string; name: string };
  course: CourseSummaryDto;
};

/** Rating TB của nhóm (chỉ tính khóa đã có đánh giá), làm tròn 1 chữ số như UI hiển thị. */
export function isTopRatedGroup(ratings: readonly { ratingAvg: number; ratingCount: number }[]) {
  const rated = ratings.filter((course) => course.ratingCount > 0);
  if (rated.length === 0) return false;
  const average = rated.reduce((sum, course) => sum + course.ratingAvg, 0) / rated.length;
  return roundRating(average) >= TOP_RATED_THRESHOLD;
}

/** Gom khóa theo danh mục, GIỮ thứ tự xuất hiện đầu tiên của danh mục trong `items`. */
export function groupCoursesByCategory(items: readonly GroupInput[]): TeacherCoursesGroupDto[] {
  const groups = new Map<string, TeacherCoursesGroupDto>();
  for (const { category, course } of items) {
    const group = groups.get(category.id) ?? {
      category: { id: category.id, name: category.name },
      isTopRated: false,
      courses: [],
    };
    group.courses.push(course);
    groups.set(category.id, group);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    isTopRated: isTopRatedGroup(group.courses),
  }));
}

export async function getTeacherCourses(
  teacherId: string,
  userId?: string,
): Promise<TeacherCoursesGroupDto[]> {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: { id: true },
  });
  if (!teacher) throw teacherNotFound();

  const rows = await prisma.course.findMany({
    where: { teacherId, isPublished: true },
    orderBy: [{ category: { order: 'asc' } }, { enrollmentCount: 'desc' }, { id: 'asc' }],
    take: MAX_TEACHER_COURSES,
    select: { ...courseSummarySelect, category: { select: { id: true, name: true } } },
  });
  const bookmarkedIds = await getBookmarkedIds(
    userId,
    rows.map((row) => row.id),
  );
  return groupCoursesByCategory(
    rows.map((row) => ({
      category: row.category,
      course: toCourseSummary(row, { bookmarkedIds }),
    })),
  );
}

// ---------------------------------------------------------------- GET /teachers/:id/reviews

/** Review của mọi khóa đã publish của giảng viên, mới nhất trước, kèm `course {id, title}`. */
export async function listTeacherReviews(
  teacherId: string,
  query: { page?: number; limit?: number },
): Promise<{ reviews: ReviewDto[]; meta: PaginationMeta }> {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: { id: true },
  });
  if (!teacher) throw teacherNotFound();

  const pagination = getPagination(query);
  const where: Prisma.ReviewWhereInput = { course: { teacherId, isPublished: true } };
  const [total, rows] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
      select: { ...reviewDtoSelect, course: { select: { id: true, title: true } } },
    }),
  ]);
  return { reviews: rows.map(toReviewDto), meta: buildPaginationMeta(total, pagination) };
}

// ---------------------------------------------------------------- PUT / DELETE /teachers/:id/follow

async function getFollowerCount(teacherId: string): Promise<number> {
  return prisma.follow.count({ where: { teacherId } });
}

/** BR-14: mỗi cặp (user, teacher) một lần; PUT lặp lại vẫn thành công (idempotent). */
export async function followTeacher(userId: string, teacherId: string): Promise<FollowStateDto> {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: { id: true, userId: true },
  });
  if (!teacher) throw teacherNotFound();
  if (teacher.userId === userId) {
    throw ApiError.of('CANNOT_FOLLOW_SELF', 'You cannot follow yourself');
  }
  await prisma.follow.upsert({
    where: { userId_teacherId: { userId, teacherId } },
    create: { userId, teacherId },
    update: {},
  });
  return { followerCount: await getFollowerCount(teacherId), isFollowed: true };
}

/** Bỏ follow; không follow sẵn thì không có gì để xóa (idempotent). */
export async function unfollowTeacher(userId: string, teacherId: string): Promise<FollowStateDto> {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: { id: true },
  });
  if (!teacher) throw teacherNotFound();
  await prisma.follow.deleteMany({ where: { userId, teacherId } });
  return { followerCount: await getFollowerCount(teacherId), isFollowed: false };
}
