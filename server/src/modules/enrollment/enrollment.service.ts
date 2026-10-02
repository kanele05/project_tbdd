import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { toAbsoluteUrl } from '@/lib/url';
import type { MyCourseItemDto } from '@/types/dto';

import type { MyCoursesStatus } from './enrollment.schema';

const myCourseSelect = {
  progressPercent: true,
  lastLessonId: true,
  lastAccessedAt: true,
  course: { select: { id: true, title: true, thumbnailUrl: true, totalDurationSec: true } },
} satisfies Prisma.EnrollmentSelect;

type MyCourseRow = Prisma.EnrollmentGetPayload<{ select: typeof myCourseSelect }>;

/** BR-05: ongoing = % < 100, completed = % = 100, all = tất cả. */
export function progressFilter(status: MyCoursesStatus): Prisma.EnrollmentWhereInput {
  if (status === 'ongoing') return { progressPercent: { lt: 100 } };
  if (status === 'completed') return { progressPercent: { gte: 100 } };
  return {};
}

export function toMyCourseItem(row: MyCourseRow): MyCourseItemDto {
  return {
    course: {
      id: row.course.id,
      title: row.course.title,
      thumbnailUrl: toAbsoluteUrl(row.course.thumbnailUrl),
    },
    totalDurationSec: row.course.totalDurationSec,
    progressPercent: row.progressPercent,
    lastLessonId: row.lastLessonId,
    lastAccessedAt: row.lastAccessedAt.toISOString(),
  };
}

/** `GET /me/courses?status=`: khóa đã ghi danh, học gần nhất trước (BR-05). Không phân trang. */
export async function listMyCourses(
  userId: string,
  status: MyCoursesStatus = 'all',
): Promise<MyCourseItemDto[]> {
  const rows = await prisma.enrollment.findMany({
    where: { userId, ...progressFilter(status) },
    orderBy: [{ lastAccessedAt: 'desc' }, { id: 'asc' }],
    select: myCourseSelect,
  });
  return rows.map(toMyCourseItem);
}
