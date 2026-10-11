// Select + mapper Course (Prisma) -> DTO của Studio. Thuần, không gọi DB.
import type { Prisma } from '@/generated/prisma/client';
import { getCourseMissing, storedVideoUrls } from '@/lib/courseChecklist';
import { type CourseRevisionPayload, snapshotFromRevision } from '@/lib/courseRevisionPayload';
import { toAbsoluteUrl } from '@/lib/url';
import type {
  CourseModerationDto,
  StudioCourseDetailDto,
  StudioCourseSummaryDto,
  StudioLessonDto,
  StudioRevisionDto,
  StudioSectionDto,
} from '@/types/teacherAdminDto';

import { thumbnailToDto } from './studioUrl';

export const summarySelect = {
  id: true,
  title: true,
  thumbnailUrl: true,
  status: true,
  priceCents: true,
  originalPriceCents: true,
  lessonCount: true,
  totalDurationSec: true,
  enrollmentCount: true,
  ratingAvg: true,
  ratingCount: true,
  publishedAt: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  revision: { select: { status: true } },
} satisfies Prisma.CourseSelect;

export type SummaryRow = Prisma.CourseGetPayload<{ select: typeof summarySelect }>;

export const detailSelect = {
  ...summarySelect,
  subtitle: true,
  description: true,
  benefits: true,
  projectDescription: true,
  categoryId: true,
  tags: {
    select: { tag: { select: { id: true, name: true, isHot: true } } },
    orderBy: { tag: { name: 'asc' } },
  },
  sections: {
    orderBy: { order: 'asc' },
    select: {
      id: true,
      title: true,
      order: true,
      lessons: { orderBy: { order: 'asc' } },
    },
  },
  revision: true,
  moderations: {
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      action: true,
      target: true,
      reason: true,
      createdAt: true,
      actor: { select: { id: true, fullName: true, role: true } },
    },
  },
} satisfies Prisma.CourseSelect;

export type DetailRow = Prisma.CourseGetPayload<{ select: typeof detailSelect }>;
type LessonRow = DetailRow['sections'][number]['lessons'][number];

export function toLessonDto(lesson: LessonRow): StudioLessonDto {
  return {
    id: lesson.id,
    title: lesson.title,
    order: lesson.order,
    durationSec: lesson.durationSec,
    videoUrl: toAbsoluteUrl(lesson.videoUrl),
    isPreview: lesson.isPreview,
    content: lesson.content ?? '',
  };
}

export function toSectionDto(section: DetailRow['sections'][number]): StudioSectionDto {
  return {
    id: section.id,
    title: section.title,
    order: section.order,
    lessons: section.lessons.map(toLessonDto),
  };
}

export function toSummaryDto(
  row: SummaryRow,
  rejectionReason: string | null,
): StudioCourseSummaryDto {
  return {
    id: row.id,
    title: row.title,
    thumbnailUrl: thumbnailToDto(row.thumbnailUrl),
    status: row.status,
    category: row.category,
    priceCents: row.priceCents,
    originalPriceCents: row.originalPriceCents,
    lessonCount: row.lessonCount,
    totalDurationSec: row.totalDurationSec,
    enrollmentCount: row.enrollmentCount,
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
    revisionStatus: row.status === 'PUBLISHED' ? (row.revision?.status ?? null) : null,
    rejectionReason: row.status === 'REJECTED' ? rejectionReason : null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** `payload` do chính service ghi (đã validate lúc PUT, hoặc sao từ khóa đang xuất bản) nên chỉ cần ép kiểu. */
export function readRevisionPayload(value: Prisma.JsonValue): CourseRevisionPayload {
  return value as unknown as CourseRevisionPayload;
}

function latestRejection(
  moderations: DetailRow['moderations'],
  target: 'COURSE' | 'REVISION',
): string | null {
  const row = moderations.find((m) => m.action === 'REJECTED' && m.target === target);
  return row?.reason ?? null;
}

function toRevisionDto(row: DetailRow): StudioRevisionDto | null {
  const revision = row.revision;
  if (!revision) return null;
  const payload = readRevisionPayload(revision.payload);
  return {
    id: revision.id,
    status: revision.status,
    payload,
    createdAt: revision.createdAt.toISOString(),
    updatedAt: revision.updatedAt.toISOString(),
    submittedAt: revision.submittedAt?.toISOString() ?? null,
    missing: getCourseMissing(
      snapshotFromRevision(
        { description: row.description, thumbnailUrl: row.thumbnailUrl },
        payload,
        storedVideoUrls(row.sections),
      ),
    ),
    rejectionReason:
      revision.status === 'REJECTED' ? latestRejection(row.moderations, 'REVISION') : null,
  };
}

function toModerationDto(row: DetailRow['moderations'][number]): CourseModerationDto {
  return {
    id: row.id,
    action: row.action,
    target: row.target,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
    actor: row.actor,
  };
}

/** Checklist BR-20 của nội dung HIỆN TẠI của khóa. */
export function missingOfLiveCourse(row: DetailRow): ReturnType<typeof getCourseMissing> {
  return getCourseMissing({
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    categoryId: row.categoryId,
    priceCents: row.priceCents,
    originalPriceCents: row.originalPriceCents,
    sections: row.sections.map((section) => ({
      lessons: section.lessons.map((lesson) => ({
        id: lesson.id,
        videoUrl: lesson.videoUrl,
        durationSec: lesson.durationSec,
        isPreview: lesson.isPreview,
      })),
    })),
  });
}

export function toDetailDto(row: DetailRow): StudioCourseDetailDto {
  return {
    ...toSummaryDto(row, latestRejection(row.moderations, 'COURSE')),
    subtitle: row.subtitle,
    description: row.description,
    benefits: row.benefits,
    projectDescription: row.projectDescription,
    tags: row.tags.map((entry) => entry.tag),
    sections: row.sections.map(toSectionDto),
    revision: toRevisionDto(row),
    moderation: row.moderations.map(toModerationDto),
    missing: missingOfLiveCourse(row),
  };
}
