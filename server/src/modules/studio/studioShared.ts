// Phần dùng chung của các service Studio: guard trạng thái, tải chi tiết khóa, đếm lại bài/thời lượng.
import type { CourseStatus, Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { prisma } from '@/lib/prisma';
import type { StudioCourseDetailDto } from '@/types/teacherAdminDto';

import { detailSelect, toDetailDto } from './studio.mapper';

type Db = Prisma.TransactionClient;

/** Sửa chương/bài trực tiếp chỉ khi DRAFT/REJECTED (PUBLISHED phải đi qua bản sửa đổi - BR-21). */
export function assertCurriculumEditable(status: CourseStatus): void {
  if (status === 'DRAFT' || status === 'REJECTED') return;
  if (status === 'PUBLISHED') {
    throw ApiError.of(
      'REVISION_REQUIRED',
      'Curriculum of a published course can only be changed through a revision',
    );
  }
  throw ApiError.of('INVALID_COURSE_STATE', `Cannot edit a course that is ${status}`);
}

export function assertStatus(
  status: CourseStatus,
  allowed: readonly CourseStatus[],
  action: string,
): void {
  if (!allowed.includes(status)) {
    throw ApiError.of('INVALID_COURSE_STATE', `Cannot ${action} a course that is ${status}`);
  }
}

export async function loadCourseDetail(
  courseId: string,
  db: Pick<Db, 'course'> = prisma,
): Promise<StudioCourseDetailDto> {
  const row = await db.course.findUnique({ where: { id: courseId }, select: detailSelect });
  if (!row) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');
  return toDetailDto(row);
}

/** Tính lại `lessonCount`, `totalDurationSec` (đồng thời cập nhật `updatedAt`). */
export async function recomputeCourseCounts(
  tx: Pick<Db, 'lesson' | 'course'>,
  courseId: string,
): Promise<{ lessonCount: number; totalDurationSec: number }> {
  const agg = await tx.lesson.aggregate({
    where: { section: { courseId } },
    _count: { _all: true },
    _sum: { durationSec: true },
  });
  const counts = { lessonCount: agg._count._all, totalDurationSec: agg._sum.durationSec ?? 0 };
  await tx.course.update({ where: { id: courseId }, data: counts, select: { id: true } });
  return counts;
}

/** Category và tag phải tồn tại -> 404 `NOT_FOUND`. */
export async function assertCategoryAndTags(
  db: Pick<Db, 'category' | 'tag'>,
  categoryId: string | undefined,
  tagIds: readonly string[] | undefined,
): Promise<void> {
  if (categoryId !== undefined) {
    const category = await db.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) throw ApiError.of('NOT_FOUND', 'Category not found');
  }
  if (tagIds && tagIds.length > 0) {
    const count = await db.tag.count({ where: { id: { in: [...tagIds] } } });
    if (count !== new Set(tagIds).size) throw ApiError.of('NOT_FOUND', 'Tag not found');
  }
}
