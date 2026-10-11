/** `GET /admin/stats` - số liệu dashboard (FR-53). */
import { prisma } from '@/lib/prisma';
import { toAbsoluteUrl } from '@/lib/url';
import type { CourseStatus, Role } from '@/types/dto';
import type { AdminStatsDto } from '@/types/teacherAdminDto';

import { countPending } from './adminQueue.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const ROLES: readonly Role[] = ['STUDENT', 'TEACHER', 'ADMIN'];
const COURSE_STATUSES: readonly CourseStatus[] = [
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
];

function zeroFilled<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
}

async function loadTopCourses(): Promise<AdminStatsDto['topCourses']> {
  const courses = await prisma.course.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ enrollmentCount: 'desc' }, { id: 'asc' }],
    take: 5,
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      enrollmentCount: true,
      teacher: { select: { id: true, user: { select: { fullName: true } } } },
    },
  });
  const revenue = await prisma.orderItem.groupBy({
    by: ['courseId'],
    where: { courseId: { in: courses.map((c) => c.id) }, order: { status: 'PAID' } },
    _sum: { priceCents: true },
  });
  const revenueByCourse = new Map(revenue.map((row) => [row.courseId, row._sum.priceCents ?? 0]));
  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    thumbnailUrl: course.thumbnailUrl === '' ? '' : toAbsoluteUrl(course.thumbnailUrl),
    teacher: { id: course.teacher.id, fullName: course.teacher.user.fullName },
    enrollmentCount: course.enrollmentCount,
    revenueCents: revenueByCourse.get(course.id) ?? 0,
  }));
}

export async function getAdminStats(now: Date = new Date()): Promise<AdminStatsDto> {
  const since7d = new Date(now.getTime() - 7 * DAY_MS);
  const since30d = new Date(now.getTime() - 30 * DAY_MS);

  const [
    roleGroups,
    disabledCount,
    newLast7d,
    newLast30d,
    statusGroups,
    pending,
    paid,
    topCourses,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.user.count({ where: { disabledAt: { not: null } } }),
    prisma.user.count({ where: { createdAt: { gte: since7d } } }),
    prisma.user.count({ where: { createdAt: { gte: since30d } } }),
    prisma.course.groupBy({ by: ['status'], _count: { _all: true } }),
    countPending(),
    prisma.order.aggregate({
      where: { status: 'PAID' },
      _count: { _all: true },
      _sum: { totalCents: true },
    }),
    loadTopCourses(),
  ]);

  const byRole = zeroFilled(ROLES);
  for (const group of roleGroups) byRole[group.role] = group._count._all;
  const byStatus = zeroFilled(COURSE_STATUSES);
  for (const group of statusGroups) byStatus[group.status] = group._count._all;

  return {
    users: {
      total: ROLES.reduce((sum, role) => sum + byRole[role], 0),
      byRole,
      disabledCount,
      newLast7d,
      newLast30d,
    },
    courses: { total: COURSE_STATUSES.reduce((sum, s) => sum + byStatus[s], 0), byStatus },
    pending: { ...pending, total: pending.courses + pending.revisions },
    orders: { paidCount: paid._count._all, revenueCents: paid._sum.totalCents ?? 0 },
    topCourses,
  };
}
