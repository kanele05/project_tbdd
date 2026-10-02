import { assertCoursePublished } from '@/lib/enrollmentGuard';
import { prisma } from '@/lib/prisma';
import type { LikeStateDto, ShareDto } from '@/types/dto';

/**
 * Thích khóa học (idempotent): chỉ tăng `likeCount` khi thực sự tạo bản ghi mới, nên gọi lặp lại
 * (hoặc 2 request song song) không làm lệch bộ đếm. Cùng transaction với bộ đếm denormalize (PLAN §8.3).
 */
export function likeCourse(userId: string, courseId: string): Promise<LikeStateDto> {
  return prisma.$transaction(async (tx) => {
    await assertCoursePublished(courseId, tx);
    const { count } = await tx.courseLike.createMany({
      data: [{ userId, courseId }],
      skipDuplicates: true,
    });
    const course =
      count > 0
        ? await tx.course.update({
            where: { id: courseId },
            data: { likeCount: { increment: 1 } },
            select: { likeCount: true },
          })
        : await tx.course.findUniqueOrThrow({
            where: { id: courseId },
            select: { likeCount: true },
          });
    return { likeCount: course.likeCount, isLiked: true };
  });
}

/** Bỏ thích (idempotent): chỉ giảm `likeCount` khi thực sự xóa được bản ghi. */
export function unlikeCourse(userId: string, courseId: string): Promise<LikeStateDto> {
  return prisma.$transaction(async (tx) => {
    await assertCoursePublished(courseId, tx);
    const { count } = await tx.courseLike.deleteMany({ where: { userId, courseId } });
    const course =
      count > 0
        ? await tx.course.update({
            where: { id: courseId },
            data: { likeCount: { decrement: 1 } },
            select: { likeCount: true },
          })
        : await tx.course.findUniqueOrThrow({
            where: { id: courseId },
            select: { likeCount: true },
          });
    return { likeCount: course.likeCount, isLiked: false };
  });
}

/** Chia sẻ khóa học: mỗi lần gọi (sau khi share sheet thành công) tăng `shareCount` 1. */
export async function shareCourse(courseId: string): Promise<ShareDto> {
  await assertCoursePublished(courseId);
  const course = await prisma.course.update({
    where: { id: courseId },
    data: { shareCount: { increment: 1 } },
    select: { shareCount: true },
  });
  return { shareCount: course.shareCount };
}
