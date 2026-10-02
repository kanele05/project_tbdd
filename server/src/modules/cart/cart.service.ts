import { ApiError } from '@/lib/ApiError';
import { getBookmarkedIds } from '@/lib/bookmarkedIds';
import { courseSummarySelect, toCourseSummary } from '@/lib/mappers';
import { Prisma, prisma } from '@/lib/prisma';
import type { CartDto } from '@/types/dto';

/** Giỏ hàng của người dùng, mới thêm trước; `totalCents` = Σ giá HIỆN TẠI của các khóa (BR-07). */
export async function getCart(userId: string): Promise<CartDto> {
  const rows = await prisma.cartItem.findMany({
    where: { userId, course: { isPublished: true } },
    orderBy: [{ addedAt: 'desc' }, { courseId: 'asc' }],
    select: { addedAt: true, course: { select: courseSummarySelect } },
  });
  const bookmarkedIds = await getBookmarkedIds(
    userId,
    rows.map((row) => row.course.id),
  );
  const items = rows.map((row) => ({
    course: toCourseSummary(row.course, { bookmarkedIds }),
    addedAt: row.addedAt.toISOString(),
  }));
  return { items, totalCents: items.reduce((sum, item) => sum + item.course.priceCents, 0) };
}

/**
 * BR-06: 404 khóa không tồn tại · 409 `ALREADY_ENROLLED` · 422 `FREE_COURSE` (ghi danh trực tiếp)
 * · 409 `ALREADY_IN_CART`.
 */
export async function addToCart(
  userId: string,
  courseId: string,
): Promise<{ courseId: string; addedAt: string }> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, isPublished: true },
    select: { id: true, priceCents: true },
  });
  if (!course) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');

  const [enrollment, inCart] = await Promise.all([
    prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true },
    }),
    prisma.cartItem.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { userId: true },
    }),
  ]);
  if (enrollment) throw ApiError.of('ALREADY_ENROLLED', 'You are already enrolled in this course');
  if (course.priceCents === 0) {
    throw ApiError.of(
      'FREE_COURSE',
      'This course is free - enroll directly instead of using the cart',
    );
  }
  if (inCart) throw ApiError.of('ALREADY_IN_CART', 'This course is already in your cart');

  try {
    const item = await prisma.cartItem.create({
      data: { userId, courseId },
      select: { courseId: true, addedAt: true },
    });
    return { courseId: item.courseId, addedAt: item.addedAt.toISOString() };
  } catch (err) {
    // Hai request thêm cùng khóa chạy song song: khóa chính ghép (userId, courseId) chặn lần hai.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw ApiError.of('ALREADY_IN_CART', 'This course is already in your cart');
    }
    throw err;
  }
}

/** Xóa khỏi giỏ; khóa không có trong giỏ thì không có gì để xóa (idempotent, vẫn 204). */
export async function removeFromCart(userId: string, courseId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { userId, courseId } });
}
