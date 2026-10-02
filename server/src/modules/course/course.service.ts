import type { Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { getBookmarkedIds } from '@/lib/bookmarkedIds';
import { courseSummarySelect, toCourseSummary } from '@/lib/mappers';
import { buildPaginationMeta, getPagination, type PaginationMeta } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import { toAbsoluteUrlOrNull } from '@/lib/url';
import type { CourseDetailDto, CourseSummaryDto } from '@/types/dto';

import type { CourseSort, ListCoursesQuery } from './course.schema';

/** Số khóa tối đa trả về cho "Similar courses" (PLAN §9.2). */
export const SIMILAR_COURSES_LIMIT = 3;
/** Giới hạn số từ khóa tìm kiếm (mỗi từ phải khớp ở ít nhất 1 trường). */
const MAX_SEARCH_TERMS = 5;
/** Số khóa ứng viên tối đa khi xếp hạng "Recommended" (BR-12). */
const RECOMMEND_POOL_SIZE = 500;

// ---------------------------------------------------------------- Bộ lọc / sắp xếp

/** Tách chuỗi tìm kiếm thành các từ (bỏ khoảng trắng thừa), tối đa `MAX_SEARCH_TERMS`. */
export function splitSearchTerms(q: string | undefined): string[] {
  if (!q) return [];
  return q.split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_TERMS);
}

/** Prisma `contains` không escape ký tự đại diện của LIKE: người dùng gõ `%` hoặc `_` phải được hiểu là ký tự thường. */
export function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** BR-13: một từ khớp title, subtitle, tên tag hoặc tên giảng viên (không phân biệt hoa thường). */
function termFilter(term: string): Prisma.CourseWhereInput {
  const contains = { contains: escapeLikePattern(term), mode: 'insensitive' } as const;
  return {
    OR: [
      { title: contains },
      { subtitle: contains },
      { tags: { some: { tag: { name: contains } } } },
      { teacher: { user: { fullName: contains } } },
    ],
  };
}

export type CourseFilters = Pick<
  ListCoursesQuery,
  'q' | 'categoryId' | 'teacherId' | 'isFree' | 'minPrice' | 'maxPrice' | 'minRating' | 'section'
>;

/** Điều kiện lọc của `GET /courses`: luôn chỉ khóa đã publish (BR-13). */
export function buildCourseWhere(filters: CourseFilters): Prisma.CourseWhereInput {
  const and: Prisma.CourseWhereInput[] = splitSearchTerms(filters.q).map(termFilter);

  if (filters.categoryId && filters.categoryId.length > 0) {
    and.push({ categoryId: { in: filters.categoryId } });
  }
  if (filters.teacherId) and.push({ teacherId: filters.teacherId });
  if (filters.isFree === true) and.push({ priceCents: 0 });
  if (filters.isFree === false) and.push({ priceCents: { gt: 0 } });
  if (filters.minPrice !== undefined) and.push({ priceCents: { gte: filters.minPrice } });
  if (filters.maxPrice !== undefined) and.push({ priceCents: { lte: filters.maxPrice } });
  if (filters.minRating !== undefined) and.push({ ratingAvg: { gte: filters.minRating } });
  if (filters.section === 'inspires') and.push({ isFeatured: true });

  return { isPublished: true, AND: and };
}

const ORDER_BY: Record<CourseSort, Prisma.CourseOrderByWithRelationInput[]> = {
  popular: [{ enrollmentCount: 'desc' }, { ratingAvg: 'desc' }, { id: 'asc' }],
  rating: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }, { id: 'asc' }],
  newest: [{ createdAt: 'desc' }, { id: 'asc' }],
  price_asc: [{ priceCents: 'asc' }, { id: 'asc' }],
  price_desc: [{ priceCents: 'desc' }, { id: 'asc' }],
};

/** Luôn có `id` ở cuối để phân trang ổn định khi nhiều khóa bằng điểm. */
export function buildCourseOrderBy(sort: CourseSort = 'popular') {
  return ORDER_BY[sort];
}

// ---------------------------------------------------------------- Truy vấn dùng chung (Home cũng dùng)

/** Lấy `CourseSummary` theo danh sách id, GIỮ NGUYÊN thứ tự `ids`; bỏ qua khóa chưa publish. */
export async function findCourseSummariesByIds(
  ids: readonly string[],
  userId?: string,
): Promise<CourseSummaryDto[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.course.findMany({
    where: { id: { in: [...ids] }, isPublished: true },
    select: courseSummarySelect,
  });
  const bookmarkedIds = await getBookmarkedIds(
    userId,
    rows.map((row) => row.id),
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [toCourseSummary(row, { bookmarkedIds })] : [];
  });
}

/**
 * BR-12: id các khóa gợi ý, đã xếp thứ tự. Khóa thuộc danh mục người dùng đã ghi danh/lưu đứng trước
 * (theo `ratingAvg`), sau đó bổ sung khóa rating cao nhất; luôn loại khóa đã ghi danh.
 * Khách (không có `userId`) = khóa rating cao nhất.
 */
export async function getRecommendedCourseIds(
  userId: string | undefined,
  where: Prisma.CourseWhereInput = { isPublished: true },
): Promise<string[]> {
  const enrolledIds: string[] = [];
  const interestCategoryIds = new Set<string>();

  if (userId) {
    const [enrollments, bookmarks] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId },
        select: { courseId: true, course: { select: { categoryId: true } } },
      }),
      prisma.bookmark.findMany({
        where: { userId },
        select: { course: { select: { categoryId: true } } },
      }),
    ]);
    for (const enrollment of enrollments) {
      enrolledIds.push(enrollment.courseId);
      interestCategoryIds.add(enrollment.course.categoryId);
    }
    for (const bookmark of bookmarks) interestCategoryIds.add(bookmark.course.categoryId);
  }

  const candidates = await prisma.course.findMany({
    where: { AND: [where, { id: { notIn: enrolledIds } }] },
    orderBy: ORDER_BY.rating,
    take: RECOMMEND_POOL_SIZE,
    select: { id: true, categoryId: true },
  });
  const preferred = candidates.filter((course) => interestCategoryIds.has(course.categoryId));
  const others = candidates.filter((course) => !interestCategoryIds.has(course.categoryId));
  return [...preferred, ...others].map((course) => course.id);
}

// ---------------------------------------------------------------- GET /courses

export type CourseListResult = { courses: CourseSummaryDto[]; meta: PaginationMeta };

export async function listCourses(
  query: ListCoursesQuery,
  userId?: string,
): Promise<CourseListResult> {
  const where = buildCourseWhere(query);
  const pagination = getPagination(query);

  // `section=recommended` không kèm `sort` -> thứ tự gợi ý của BR-12 (sort tường minh luôn thắng).
  if (query.section === 'recommended' && !query.sort) {
    const rankedIds = await getRecommendedCourseIds(userId, where);
    const pageIds = rankedIds.slice(pagination.skip, pagination.skip + pagination.take);
    return {
      courses: await findCourseSummariesByIds(pageIds, userId),
      meta: buildPaginationMeta(rankedIds.length, pagination),
    };
  }

  const [total, rows] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      orderBy: buildCourseOrderBy(query.sort),
      skip: pagination.skip,
      take: pagination.take,
      select: courseSummarySelect,
    }),
  ]);
  const bookmarkedIds = await getBookmarkedIds(
    userId,
    rows.map((row) => row.id),
  );
  return {
    courses: rows.map((row) => toCourseSummary(row, { bookmarkedIds })),
    meta: buildPaginationMeta(total, pagination),
  };
}

// ---------------------------------------------------------------- GET /courses/:id

const courseDetailSelect = {
  ...courseSummarySelect,
  subtitle: true,
  description: true,
  bannerUrl: true,
  benefits: true,
  likeCount: true,
  shareCount: true,
  category: { select: { id: true, name: true } },
  // Ghi đè `teacher` của summary: detail cần thêm jobTitle + avatar.
  teacher: {
    select: { id: true, jobTitle: true, user: { select: { fullName: true, avatarUrl: true } } },
  },
} satisfies Prisma.CourseSelect;

type UserCourseState = {
  enrollment: CourseDetailDto['enrollment'];
  isLiked: boolean;
  isFollowed: boolean;
  isInCart: boolean;
  isBookmarked: boolean;
};

const GUEST_STATE: UserCourseState = {
  enrollment: null,
  isLiked: false,
  isFollowed: false,
  isInCart: false,
  isBookmarked: false,
};

/** Trạng thái riêng của người dùng với khóa (5 truy vấn khóa chính chạy song song). */
async function loadUserCourseState(
  userId: string | undefined,
  courseId: string,
  teacherId: string,
): Promise<UserCourseState> {
  if (!userId) return GUEST_STATE;
  const [enrollment, like, follow, cartItem, bookmark] = await Promise.all([
    prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { progressPercent: true, lastLessonId: true },
    }),
    prisma.courseLike.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { userId: true },
    }),
    prisma.follow.findUnique({
      where: { userId_teacherId: { userId, teacherId } },
      select: { userId: true },
    }),
    prisma.cartItem.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { userId: true },
    }),
    prisma.bookmark.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { userId: true },
    }),
  ]);
  return {
    enrollment,
    isLiked: like !== null,
    isFollowed: follow !== null,
    isInCart: cartItem !== null,
    isBookmarked: bookmark !== null,
  };
}

/** Bài xem thử đầu tiên (theo thứ tự chương, bài) để phát preview ở trang chi tiết. */
async function findPreviewLessonId(courseId: string): Promise<string | null> {
  const lesson = await prisma.lesson.findFirst({
    where: { isPreview: true, section: { courseId } },
    orderBy: [{ section: { order: 'asc' } }, { order: 'asc' }],
    select: { id: true },
  });
  return lesson?.id ?? null;
}

export async function getCourseDetail(courseId: string, userId?: string): Promise<CourseDetailDto> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, isPublished: true },
    select: courseDetailSelect,
  });
  if (!course) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');

  const [state, previewLessonId] = await Promise.all([
    loadUserCourseState(userId, course.id, course.teacher.id),
    findPreviewLessonId(course.id),
  ]);
  const summary = toCourseSummary(course, {
    bookmarkedIds: state.isBookmarked ? [course.id] : [],
  });

  return {
    ...summary,
    subtitle: course.subtitle,
    description: course.description,
    bannerUrl: toAbsoluteUrlOrNull(course.bannerUrl),
    benefits: course.benefits,
    likeCount: course.likeCount,
    shareCount: course.shareCount,
    isLiked: state.isLiked,
    category: course.category,
    teacher: {
      id: course.teacher.id,
      fullName: course.teacher.user.fullName,
      avatarUrl: toAbsoluteUrlOrNull(course.teacher.user.avatarUrl),
      jobTitle: course.teacher.jobTitle,
      isFollowed: state.isFollowed,
    },
    enrollment: state.enrollment,
    isInCart: state.isInCart,
    previewLessonId,
  };
}

// ---------------------------------------------------------------- GET /courses/:id/similar

/** Tối đa 3 khóa cùng danh mục (trừ chính nó), rating cao trước. */
export async function getSimilarCourses(
  courseId: string,
  userId?: string,
): Promise<CourseSummaryDto[]> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, isPublished: true },
    select: { categoryId: true },
  });
  if (!course) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');

  const rows = await prisma.course.findMany({
    where: { isPublished: true, categoryId: course.categoryId, id: { not: courseId } },
    orderBy: [{ ratingAvg: 'desc' }, { enrollmentCount: 'desc' }, { id: 'asc' }],
    take: SIMILAR_COURSES_LIMIT,
    select: courseSummarySelect,
  });
  const bookmarkedIds = await getBookmarkedIds(
    userId,
    rows.map((row) => row.id),
  );
  return rows.map((row) => toCourseSummary(row, { bookmarkedIds }));
}
