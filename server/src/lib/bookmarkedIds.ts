import { prisma } from '@/lib/prisma';

/**
 * Trả về tập id (trong `courseIds`) mà `userId` đã lưu - truyền vào `toCourseSummary(course, { bookmarkedIds })`.
 * Khách (`userId` undefined) hoặc danh sách rỗng -> tập rỗng, không truy vấn DB.
 * Dùng 1 query cho cả danh sách (tránh N+1).
 */
export async function getBookmarkedIds(
  userId: string | undefined,
  courseIds: readonly string[],
): Promise<Set<string>> {
  if (!userId || courseIds.length === 0) return new Set();
  const rows = await prisma.bookmark.findMany({
    where: { userId, courseId: { in: [...courseIds] } },
    select: { courseId: true },
  });
  return new Set(rows.map((row) => row.courseId));
}
