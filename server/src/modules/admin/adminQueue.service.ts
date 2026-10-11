/** `GET /admin/courses`: hàng chờ duyệt (khóa mới + bản sửa đổi) và danh sách mọi khóa theo trạng thái (FR-50). */
import type { Prisma } from '@/generated/prisma/client';
import { courseRevisionPayloadSchema } from '@/lib/courseRevisionPayload';
import { buildPaginationMeta, getPagination, type PaginationMeta } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import { toAbsoluteUrl, toAbsoluteUrlOrNull } from '@/lib/url';
import type { CourseStatus } from '@/types/dto';
import type {
  AdminCourseQueueItemDto,
  AdminQueueCountsDto,
  RevisionStatus,
} from '@/types/teacherAdminDto';

import type { ListAdminCoursesQuery } from './admin.schema';

const courseSelect = {
  id: true,
  title: true,
  thumbnailUrl: true,
  status: true,
  priceCents: true,
  lessonCount: true,
  submittedAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  teacher: {
    select: { id: true, userId: true, user: { select: { fullName: true, avatarUrl: true } } },
  },
} satisfies Prisma.CourseSelect;

type QueueCourse = Prisma.CourseGetPayload<{ select: typeof courseSelect }>;

export type AdminQueueResult = {
  items: AdminCourseQueueItemDto[];
  meta: PaginationMeta & { pending: AdminQueueCountsDto };
};

function toQueueBase(course: QueueCourse) {
  return {
    id: course.id,
    thumbnailUrl: course.thumbnailUrl === '' ? '' : toAbsoluteUrl(course.thumbnailUrl),
    status: course.status,
    teacher: {
      id: course.teacher.id,
      userId: course.teacher.userId,
      fullName: course.teacher.user.fullName,
      avatarUrl: toAbsoluteUrlOrNull(course.teacher.user.avatarUrl),
    },
    category: course.category,
  };
}

function toCourseItem(course: QueueCourse): AdminCourseQueueItemDto {
  return {
    ...toQueueBase(course),
    type: 'COURSE',
    title: course.title,
    revisionStatus: null,
    priceCents: course.priceCents,
    lessonCount: course.lessonCount,
    submittedAt: course.submittedAt?.toISOString() ?? null,
    updatedAt: course.updatedAt.toISOString(),
  };
}

function toRevisionItem(revision: {
  payload: unknown;
  status: RevisionStatus;
  submittedAt: Date | null;
  updatedAt: Date;
  course: QueueCourse;
}): AdminCourseQueueItemDto {
  const parsed = courseRevisionPayloadSchema.safeParse(revision.payload);
  const { course } = revision;
  return {
    ...toQueueBase(course),
    type: 'REVISION',
    title: parsed.success ? parsed.data.title : course.title,
    revisionStatus: revision.status,
    priceCents: parsed.success ? parsed.data.priceCents : course.priceCents,
    lessonCount: parsed.success
      ? parsed.data.sections.reduce((sum, section) => sum + section.lessons.length, 0)
      : course.lessonCount,
    submittedAt: revision.submittedAt?.toISOString() ?? null,
    updatedAt: revision.updatedAt.toISOString(),
  };
}

/** Đếm số mục đang chờ duyệt (badge của tab Admin). */
export async function countPending(): Promise<AdminQueueCountsDto> {
  const [courses, revisions] = await Promise.all([
    prisma.course.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.courseRevision.count({ where: { status: 'PENDING_REVIEW' } }),
  ]);
  return { courses, revisions };
}

export async function listAdminCourses(query: ListAdminCoursesQuery): Promise<AdminQueueResult> {
  const pagination = getPagination(query);
  // Hàng chờ thật xếp FIFO (gửi trước duyệt trước); các lọc khác: mới cập nhật trước.
  const isFifo = query.status === 'PENDING_REVIEW';

  if (query.type === 'revision') {
    const where: Prisma.CourseRevisionWhereInput = query.status
      ? { status: query.status as RevisionStatus }
      : {};
    const [total, rows, pending] = await Promise.all([
      prisma.courseRevision.count({ where }),
      prisma.courseRevision.findMany({
        where,
        orderBy: isFifo
          ? [{ submittedAt: 'asc' }, { id: 'asc' }]
          : [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: pagination.skip,
        take: pagination.take,
        select: {
          payload: true,
          status: true,
          submittedAt: true,
          updatedAt: true,
          course: { select: courseSelect },
        },
      }),
      countPending(),
    ]);
    return {
      items: rows.map(toRevisionItem),
      meta: { ...buildPaginationMeta(total, pagination), pending },
    };
  }

  const where: Prisma.CourseWhereInput = query.status
    ? { status: query.status as CourseStatus }
    : {};
  const [total, rows, pending] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      orderBy: isFifo
        ? [{ submittedAt: 'asc' }, { id: 'asc' }]
        : [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      select: courseSelect,
    }),
    countPending(),
  ]);
  return {
    items: rows.map(toCourseItem),
    meta: { ...buildPaginationMeta(total, pagination), pending },
  };
}
