// Khóa học của giảng viên: danh sách, tạo nháp, chi tiết, sửa thông tin, xóa nháp (FR-39, BR-19/21/22).
// Chỉ service được dùng Prisma. Chương/bài: studioCurriculum.service; luồng duyệt: studioWorkflow.service.
import type { CourseStatus, Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { assertCourseOwner } from '@/lib/courseOwnership';
import { buildPaginationMeta, getPagination } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import type {
  StudioCourseDetailDto,
  StudioCourseSummaryDto,
  StudioListSummaryDto,
} from '@/types/teacherAdminDto';

import { summarySelect, toSummaryDto } from './studio.mapper';
import type { CreateCourseInput, ListCoursesQuery, UpdateCourseInput } from './studio.schema';
import { assertCategoryAndTags, assertStatus, loadCourseDetail } from './studioShared';
import { thumbnailToDto, toStoredThumbnail } from './studioUrl';
import { ensureTeacherProfile } from './teacherProfile.service';

const ALL_STATUSES: readonly CourseStatus[] = [
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
];
/** Trường "lớn": khóa PUBLISHED phải sửa qua bản sửa đổi (BR-21). Trường còn lại là "nhỏ", áp dụng ngay. */
const MAJOR_FIELDS = ['title', 'categoryId', 'tagIds', 'priceCents', 'originalPriceCents'] as const;

function emptyToNull(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === '' ? null : value;
}

async function getListSummary(userId: string): Promise<StudioListSummaryDto> {
  const where: Prisma.CourseWhereInput = { teacher: { userId } };
  const [groups, revenue] = await Promise.all([
    prisma.course.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
      _sum: { enrollmentCount: true },
    }),
    prisma.orderItem.aggregate({
      where: { course: where, order: { status: 'PAID' } },
      _sum: { priceCents: true },
    }),
  ]);
  const byStatus = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as Record<
    CourseStatus,
    number
  >;
  let courseCount = 0;
  let totalEnrollments = 0;
  for (const group of groups) {
    byStatus[group.status] = group._count._all;
    courseCount += group._count._all;
    totalEnrollments += group._sum.enrollmentCount ?? 0;
  }
  return {
    courseCount,
    totalEnrollments,
    totalRevenueCents: revenue._sum.priceCents ?? 0,
    byStatus,
  };
}

/** Lý do từ chối mới nhất (target COURSE) của các khóa REJECTED trong trang hiện tại. */
async function rejectionReasons(rejectedIds: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (rejectedIds.length === 0) return map;
  const rows = await prisma.courseModeration.findMany({
    where: { courseId: { in: rejectedIds }, action: 'REJECTED', target: 'COURSE' },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { courseId: true, reason: true },
  });
  for (const row of rows) if (!map.has(row.courseId)) map.set(row.courseId, row.reason);
  return map;
}

export async function listMyCourses(
  userId: string,
  query: ListCoursesQuery,
): Promise<{ items: StudioCourseSummaryDto[]; meta: object }> {
  const pagination = getPagination(query);
  const where: Prisma.CourseWhereInput = {
    teacher: { userId },
    ...(query.status ? { status: query.status } : {}),
  };
  const [rows, total, summary] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      select: summarySelect,
    }),
    prisma.course.count({ where }),
    getListSummary(userId),
  ]);
  const reasons = await rejectionReasons(
    rows.filter((row) => row.status === 'REJECTED').map((row) => row.id),
  );
  return {
    items: rows.map((row) => toSummaryDto(row, reasons.get(row.id) ?? null)),
    meta: { ...buildPaginationMeta(total, pagination), summary },
  };
}

/**
 * Ảnh bìa khi sửa khóa: trả `undefined` nếu không đổi (gửi lại đúng ảnh đang lưu, kể cả ảnh ngoài của khóa
 * seed), `''` để gỡ ảnh, hoặc đường dẫn lưu DB của ảnh vừa upload; url khác -> 400.
 */
async function resolveThumbnailChange(courseId: string, url: string): Promise<string | undefined> {
  const { thumbnailUrl: current } = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    select: { thumbnailUrl: true },
  });
  if (url === current || url === thumbnailToDto(current)) return undefined;
  if (url === '') return '';
  const stored = toStoredThumbnail(url);
  if (stored === null) {
    throw ApiError.badRequest('Invalid request data', [
      {
        source: 'body',
        field: 'thumbnailUrl',
        message: 'Must be the url returned by POST /teacher/uploads/image',
      },
    ]);
  }
  return stored;
}

export async function createDraftCourse(
  userId: string,
  input: CreateCourseInput,
): Promise<StudioCourseDetailDto> {
  const profile = await ensureTeacherProfile(userId);
  await assertCategoryAndTags(prisma, input.categoryId, input.tagIds);
  const created = await prisma.course.create({
    data: {
      title: input.title,
      subtitle: emptyToNull(input.subtitle),
      description: input.description ?? '',
      thumbnailUrl: input.thumbnailUrl ? (toStoredThumbnail(input.thumbnailUrl) ?? '') : '',
      priceCents: input.priceCents ?? 0,
      originalPriceCents: input.originalPriceCents ?? null,
      benefits: input.benefits ?? [],
      projectDescription: emptyToNull(input.projectDescription),
      status: 'DRAFT',
      categoryId: input.categoryId,
      teacherId: profile.id,
      ...(input.tagIds?.length
        ? { tags: { create: input.tagIds.map((tagId) => ({ tagId })) } }
        : {}),
    },
    select: { id: true },
  });
  return loadCourseDetail(created.id);
}

export async function getMyCourse(
  userId: string,
  courseId: string,
): Promise<StudioCourseDetailDto> {
  await assertCourseOwner(userId, courseId);
  return loadCourseDetail(courseId);
}

type CurrentInfo = {
  title: string;
  categoryId: string;
  priceCents: number;
  originalPriceCents: number | null;
  tagIds: string[];
};

/** Trường lớn mà request thật sự đổi giá trị (gửi lại đúng giá trị cũ không tính). */
function changedMajorFields(input: UpdateCourseInput, current: CurrentInfo): string[] {
  return MAJOR_FIELDS.filter((field) => {
    if (field === 'tagIds') {
      const next = input.tagIds;
      if (next === undefined) return false;
      const nextSet = new Set(next);
      return nextSet.size !== current.tagIds.length || current.tagIds.some((t) => !nextSet.has(t));
    }
    const next = input[field];
    return next !== undefined && next !== current[field];
  });
}

async function assertNoMajorChange(courseId: string, input: UpdateCourseInput): Promise<void> {
  const current = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    select: {
      title: true,
      categoryId: true,
      priceCents: true,
      originalPriceCents: true,
      tags: { select: { tagId: true } },
    },
  });
  const changed = changedMajorFields(input, {
    ...current,
    tagIds: current.tags.map((t) => t.tagId),
  });
  if (changed.length > 0) {
    throw ApiError.of(
      'REVISION_REQUIRED',
      'These fields of a published course can only be changed through a revision',
      { fields: changed },
    );
  }
}

export async function updateMyCourse(
  userId: string,
  courseId: string,
  input: UpdateCourseInput,
): Promise<StudioCourseDetailDto> {
  const owned = await assertCourseOwner(userId, courseId);
  assertStatus(owned.status, ['DRAFT', 'REJECTED', 'PUBLISHED'], 'edit');
  const isPublished = owned.status === 'PUBLISHED';
  if (isPublished) await assertNoMajorChange(courseId, input);
  else await assertCategoryAndTags(prisma, input.categoryId, input.tagIds);

  const data: Prisma.CourseUpdateInput = {};
  if (input.subtitle !== undefined) data.subtitle = emptyToNull(input.subtitle);
  if (input.description !== undefined) data.description = input.description;
  if (input.benefits !== undefined) data.benefits = input.benefits;
  if (input.projectDescription !== undefined) {
    data.projectDescription = emptyToNull(input.projectDescription);
  }
  if (input.thumbnailUrl !== undefined) {
    const stored = await resolveThumbnailChange(courseId, input.thumbnailUrl);
    if (stored !== undefined) data.thumbnailUrl = stored;
  }
  if (!isPublished) {
    if (input.title !== undefined) data.title = input.title;
    if (input.priceCents !== undefined) data.priceCents = input.priceCents;
    if (input.originalPriceCents !== undefined) data.originalPriceCents = input.originalPriceCents;
    if (input.categoryId !== undefined) data.category = { connect: { id: input.categoryId } };
  }

  await prisma.$transaction(async (tx) => {
    await tx.course.update({ where: { id: courseId }, data, select: { id: true } });
    if (!isPublished && input.tagIds !== undefined) {
      await tx.courseTag.deleteMany({ where: { courseId } });
      await tx.courseTag.createMany({ data: input.tagIds.map((tagId) => ({ courseId, tagId })) });
    }
  });
  return loadCourseDetail(courseId);
}

/** BR-22: chỉ xóa khóa chưa từng xuất bản và chưa có ghi danh. */
export async function deleteMyCourse(userId: string, courseId: string): Promise<void> {
  const owned = await assertCourseOwner(userId, courseId);
  if (owned.status === 'PENDING_REVIEW') {
    throw ApiError.of('INVALID_COURSE_STATE', 'Withdraw the course from review before deleting it');
  }
  const enrollments = await prisma.enrollment.count({ where: { courseId } });
  if (enrollments > 0) {
    throw ApiError.of(
      'COURSE_HAS_ENROLLMENTS',
      'A course with enrolled students cannot be deleted, archive it instead',
    );
  }
  if (owned.publishedAt !== null || owned.status === 'PUBLISHED' || owned.status === 'ARCHIVED') {
    throw ApiError.of('INVALID_COURSE_STATE', 'A course that was published can only be archived');
  }
  await prisma.course.delete({ where: { id: courseId } });
}
