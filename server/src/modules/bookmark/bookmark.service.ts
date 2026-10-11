import { assertCoursePublished } from '@/lib/enrollmentGuard';
import { courseSummarySelect, toCourseSummary } from '@/lib/mappers';
import { buildPaginationMeta, getPagination, type PaginationMeta } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import type { CourseSummaryDto } from '@/types/dto';

/** Lưu khóa học (idempotent): lưu lần 2 không lỗi, không tạo bản ghi trùng. 404 nếu khóa không tồn tại. */
export async function addBookmark(userId: string, courseId: string): Promise<void> {
  await assertCoursePublished(courseId);
  // INSERT ... ON CONFLICT DO NOTHING: an toàn khi 2 request chạy song song.
  await prisma.bookmark.createMany({ data: [{ userId, courseId }], skipDuplicates: true });
}

/** Bỏ lưu (idempotent): chưa lưu hoặc khóa không tồn tại vẫn thành công. */
export async function removeBookmark(userId: string, courseId: string): Promise<void> {
  await prisma.bookmark.deleteMany({ where: { userId, courseId } });
}

/** `GET /me/bookmarks`: khóa đã lưu (mới lưu trước), `isBookmarked` luôn `true`. */
export async function listBookmarks(
  userId: string,
  query: { page?: number; limit?: number },
): Promise<{ items: CourseSummaryDto[]; meta: PaginationMeta }> {
  const pagination = getPagination(query);
  const where = { userId, course: { status: 'PUBLISHED' } } as const;
  const [rows, total] = await Promise.all([
    prisma.bookmark.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { courseId: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
      select: { course: { select: courseSummarySelect } },
    }),
    prisma.bookmark.count({ where }),
  ]);
  const bookmarkedIds = new Set(rows.map((row) => row.course.id));
  return {
    items: rows.map((row) => toCourseSummary(row.course, { bookmarkedIds })),
    meta: buildPaginationMeta(total, pagination),
  };
}
