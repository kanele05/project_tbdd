import { cache } from '@/lib/cache';
import { assertCoursePublished, assertEnrolledInCourse } from '@/lib/enrollmentGuard';
import { reviewDtoSelect, toReviewDto } from '@/lib/mappers';
import { buildPaginationMeta, getPagination, type PaginationMeta } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import type { ReviewDto, ReviewSummaryDto } from '@/types/dto';

import type { ListReviewsQuery, UpsertReviewBody } from './review.schema';
import { averageRating, buildReviewSummary } from './review.utils';

/** Tiền tố khóa cache Home (cùng giá trị `HOME_CACHE_PREFIX` của module home): popular / top teachers có chứa điểm đánh giá. */
const HOME_CACHE_PREFIX = 'home:';

function invalidateRatingCaches(): void {
  cache.invalidatePrefix(HOME_CACHE_PREFIX);
}

/**
 * `GET /courses/:id/reviews`: review mới nhất trước, lọc theo số sao; `meta.summary` tính trên toàn bộ
 * review của khóa (để các chip lọc sao luôn hiện đúng số lượng).
 */
export async function listReviews(
  courseId: string,
  query: Pick<ListReviewsQuery, 'page' | 'limit' | 'rating'>,
): Promise<{ items: ReviewDto[]; meta: PaginationMeta & { summary: ReviewSummaryDto } }> {
  await assertCoursePublished(courseId);
  const pagination = getPagination(query);
  const where = { courseId, ...(query.rating ? { rating: query.rating } : {}) };

  const [groups, rows] = await Promise.all([
    prisma.review.groupBy({ by: ['rating'], where: { courseId }, _count: { _all: true } }),
    prisma.review.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      select: reviewDtoSelect,
    }),
  ]);
  const summary = buildReviewSummary(
    groups.map((group) => ({ rating: group.rating, count: group._count._all })),
  );
  // Tổng sau khi lọc suy ra từ phân phối, khỏi thêm 1 query COUNT.
  const total =
    query.rating === undefined
      ? summary.count
      : summary.distribution[query.rating as 1 | 2 | 3 | 4 | 5];

  return {
    items: rows.map(toReviewDto),
    meta: { ...buildPaginationMeta(total, pagination), summary },
  };
}

/** `GET /courses/:id/reviews/me`: review của tôi hoặc `null` (khóa không tồn tại -> 404). */
export async function getMyReview(userId: string, courseId: string): Promise<ReviewDto | null> {
  const review = await prisma.review.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: reviewDtoSelect,
  });
  if (review) return toReviewDto(review);
  await assertCoursePublished(courseId);
  return null;
}

/**
 * `PUT /courses/:id/reviews/me` (BR-08): tạo hoặc sửa review của tôi (đã ghi danh), đồng thời cập nhật
 * `ratingAvg`/`ratingCount` của khóa TRONG CÙNG transaction. Khóa hàng Course (`FOR UPDATE`) để hai review
 * đồng thời của cùng một khóa không ghi đè số liệu của nhau.
 */
export async function upsertMyReview(
  userId: string,
  courseId: string,
  body: UpsertReviewBody,
): Promise<ReviewDto> {
  const review = await prisma.$transaction(async (tx) => {
    await assertEnrolledInCourse(userId, courseId, tx);
    await tx.$queryRaw`SELECT "id" FROM "Course" WHERE "id" = ${courseId} FOR UPDATE`;

    const saved = await tx.review.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, rating: body.rating, content: body.content },
      update: { rating: body.rating, content: body.content },
      select: reviewDtoSelect,
    });
    const totals = await tx.review.aggregate({
      where: { courseId },
      _sum: { rating: true },
      _count: { _all: true },
    });
    const ratingCount = totals._count._all;
    await tx.course.update({
      where: { id: courseId },
      data: { ratingCount, ratingAvg: averageRating(totals._sum.rating ?? 0, ratingCount) },
    });
    return saved;
  });
  invalidateRatingCaches();
  return toReviewDto(review);
}
