/**
 * `GET /admin/courses/:id` và phần trả về của approve / reject / archive / restore: nội dung đầy đủ của khóa
 * (cùng hình dạng `StudioCourseDetailDto` mà giảng viên thấy) + giảng viên + bản sửa đổi + diff.
 */
import type { Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { getCourseMissing, storedVideoUrls } from '@/lib/courseChecklist';
import {
  type CourseRevisionPayload,
  courseRevisionPayloadSchema,
  snapshotFromRevision,
} from '@/lib/courseRevisionPayload';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { toAbsoluteUrl, toAbsoluteUrlOrNull } from '@/lib/url';
import type {
  AdminCourseDetailDto,
  AdminRevisionDiffDto,
  CourseModerationDto,
  StudioRevisionDto,
  StudioSectionDto,
} from '@/types/teacherAdminDto';

import {
  computeRevisionDiff,
  findRemovedLessonIds,
  type LiveCourse,
  type LiveSection,
} from './adminRevisionDiff';

type Db = Pick<Prisma.TransactionClient, 'course' | 'category' | 'tag' | 'lessonProgress'>;

const detailInclude = {
  category: { select: { id: true, name: true } },
  teacher: {
    select: {
      id: true,
      userId: true,
      user: { select: { fullName: true, email: true, avatarUrl: true, disabledAt: true } },
    },
  },
  tags: { select: { tag: { select: { id: true, name: true, isHot: true } } } },
  sections: {
    orderBy: { order: 'asc' },
    include: { lessons: { orderBy: { order: 'asc' } } },
  },
  revision: true,
  moderations: {
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: { actor: { select: { id: true, fullName: true, role: true } } },
  },
} satisfies Prisma.CourseInclude;

type CourseRow = Prisma.CourseGetPayload<{ include: typeof detailInclude }>;

/** Ảnh/bìa có thể là chuỗi rỗng (nháp chưa có ảnh): giữ nguyên `""` thay vì thành URL gốc. */
const absoluteOrEmpty = (value: string): string => (value === '' ? '' : toAbsoluteUrl(value));

/** Parse payload đã lưu; hỏng (không nên xảy ra vì studio đã validate) -> 422 thay vì 500. */
export function parseRevisionPayload(raw: unknown): CourseRevisionPayload {
  const parsed = courseRevisionPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error(
      { issues: parsed.error.issues.length },
      'Stored course revision payload is invalid',
    );
    throw ApiError.of('INVALID_COURSE_STATE', 'The stored revision is corrupted');
  }
  return parsed.data;
}

function toSections(course: CourseRow): StudioSectionDto[] {
  return course.sections.map((section) => ({
    id: section.id,
    title: section.title,
    order: section.order,
    lessons: section.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      order: lesson.order,
      durationSec: lesson.durationSec,
      videoUrl: toAbsoluteUrl(lesson.videoUrl),
      isPreview: lesson.isPreview,
      content: lesson.content ?? '',
    })),
  }));
}

function toLiveCourse(course: CourseRow): LiveCourse {
  const sections: LiveSection[] = course.sections.map((section) => ({
    id: section.id,
    title: section.title,
    lessons: section.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      videoUrl: lesson.videoUrl,
      durationSec: lesson.durationSec,
      isPreview: lesson.isPreview,
      content: lesson.content,
    })),
  }));
  return {
    title: course.title,
    priceCents: course.priceCents,
    originalPriceCents: course.originalPriceCents,
    category: course.category,
    tags: course.tags.map((row) => row.tag),
    sections,
  };
}

function toModeration(row: CourseRow['moderations'][number]): CourseModerationDto {
  return {
    id: row.id,
    action: row.action,
    target: row.target,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
    actor: { id: row.actor.id, fullName: row.actor.fullName, role: row.actor.role },
  };
}

async function buildDiff(
  db: Db,
  live: LiveCourse,
  payload: CourseRevisionPayload,
): Promise<AdminRevisionDiffDto> {
  const removedIds = findRemovedLessonIds(live.sections, payload);
  const [category, tags, progress] = await Promise.all([
    db.category.findUnique({
      where: { id: payload.categoryId },
      select: { id: true, name: true },
    }),
    db.tag.findMany({
      where: { id: { in: payload.tagIds } },
      select: { id: true, name: true, isHot: true },
    }),
    removedIds.length === 0
      ? Promise.resolve([])
      : db.lessonProgress.groupBy({
          by: ['lessonId'],
          where: { lessonId: { in: removedIds } },
          _count: { _all: true },
        }),
  ]);
  return computeRevisionDiff({
    live,
    payload,
    afterCategory: category ?? { id: payload.categoryId, name: payload.categoryId },
    afterTags: tags,
    progressCounts: new Map(progress.map((row) => [row.lessonId, row._count._all])),
  });
}

function latestReason(
  moderations: CourseRow['moderations'],
  target: 'COURSE' | 'REVISION',
): string | null {
  return (
    moderations.find((row) => row.action === 'REJECTED' && row.target === target)?.reason ?? null
  );
}

function toRevisionDto(course: CourseRow, payload: CourseRevisionPayload): StudioRevisionDto {
  const revision = course.revision;
  if (!revision) throw ApiError.of('REVISION_NOT_FOUND', 'Revision not found');
  return {
    id: revision.id,
    status: revision.status,
    payload,
    createdAt: revision.createdAt.toISOString(),
    updatedAt: revision.updatedAt.toISOString(),
    submittedAt: revision.submittedAt?.toISOString() ?? null,
    missing: getCourseMissing(
      snapshotFromRevision(
        { description: course.description, thumbnailUrl: course.thumbnailUrl },
        payload,
        storedVideoUrls(course.sections),
      ),
    ),
    rejectionReason:
      revision.status === 'REJECTED' ? latestReason(course.moderations, 'REVISION') : null,
  };
}

/** Dựng DTO chi tiết từ một dòng khóa đã tải đủ quan hệ. */
async function toAdminCourseDetail(db: Db, course: CourseRow): Promise<AdminCourseDetailDto> {
  const payload = course.revision ? parseRevisionPayload(course.revision.payload) : null;
  const live = toLiveCourse(course);
  const revision = payload ? toRevisionDto(course, payload) : null;
  const diff = payload ? await buildDiff(db, live, payload) : null;
  const user = course.teacher.user;

  let reviewTarget: AdminCourseDetailDto['reviewTarget'] = null;
  if (course.status === 'PENDING_REVIEW') reviewTarget = 'COURSE';
  else if (course.status === 'PUBLISHED' && course.revision?.status === 'PENDING_REVIEW') {
    reviewTarget = 'REVISION';
  }

  return {
    id: course.id,
    title: course.title,
    thumbnailUrl: absoluteOrEmpty(course.thumbnailUrl),
    status: course.status,
    category: course.category,
    priceCents: course.priceCents,
    originalPriceCents: course.originalPriceCents,
    lessonCount: course.lessonCount,
    totalDurationSec: course.totalDurationSec,
    enrollmentCount: course.enrollmentCount,
    ratingAvg: course.ratingAvg,
    ratingCount: course.ratingCount,
    revisionStatus: course.revision?.status ?? null,
    rejectionReason:
      course.status === 'REJECTED' ? latestReason(course.moderations, 'COURSE') : null,
    publishedAt: course.publishedAt?.toISOString() ?? null,
    submittedAt: course.submittedAt?.toISOString() ?? null,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
    subtitle: course.subtitle,
    description: course.description,
    benefits: course.benefits,
    projectDescription: course.projectDescription,
    tags: course.tags.map((row) => row.tag),
    sections: toSections(course),
    revision,
    moderation: course.moderations.map(toModeration),
    missing: getCourseMissing({
      title: course.title,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      categoryId: course.category.id,
      priceCents: course.priceCents,
      originalPriceCents: course.originalPriceCents,
      sections: course.sections.map((section) => ({
        lessons: section.lessons.map((lesson) => ({
          id: lesson.id,
          videoUrl: lesson.videoUrl,
          durationSec: lesson.durationSec,
          isPreview: lesson.isPreview,
        })),
      })),
    }),
    teacher: {
      id: course.teacher.id,
      userId: course.teacher.userId,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: toAbsoluteUrlOrNull(user.avatarUrl),
      isDisabled: user.disabledAt !== null,
    },
    reviewTarget,
    diff,
  };
}

/** Chi tiết khóa cho admin; không tồn tại -> 404 `COURSE_NOT_FOUND`. `db` truyền `tx` để đọc sau khi ghi. */
export async function getAdminCourseDetail(
  courseId: string,
  db: Db = prisma,
): Promise<AdminCourseDetailDto> {
  const course = await db.course.findUnique({ where: { id: courseId }, include: detailInclude });
  if (!course) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');
  return toAdminCourseDetail(db, course);
}
