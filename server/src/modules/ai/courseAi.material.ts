/**
 * Đọc nội dung khóa học đang chờ duyệt từ DB cho AI kiểm duyệt (FR-51): bản sửa đổi nếu có và đang `PENDING_REVIEW`
 * (trường nhỏ của khóa + payload bản sửa đổi), ngược lại chính khóa (mọi trạng thái - hợp đồng §4).
 * Chỉ service được dùng Prisma; hàm này nằm trong lớp service của module AI.
 */
import { ApiError } from '@/lib/ApiError';
import { courseRevisionPayloadSchema } from '@/lib/courseRevisionPayload';
import { prisma } from '@/lib/prisma';
import { normalizeYouTubeUrl } from '@/lib/youtube';

import { REVIEW_NOTE_CHARS } from './courseAi.prompts';
import type { ReviewLessonMaterial, ReviewMaterial, ReviewSectionMaterial } from './courseAi.types';

type LessonRow = {
  title: string;
  durationSec: number;
  isPreview: boolean;
  videoUrl: string;
  content: string | null;
};

function toLesson(row: LessonRow): ReviewLessonMaterial {
  const notes = (row.content ?? '').trim();
  return {
    title: row.title.trim(),
    durationSec: row.durationSec,
    isPreview: row.isPreview,
    hasValidVideo: normalizeYouTubeUrl(row.videoUrl) !== null,
    notes: notes.length > REVIEW_NOTE_CHARS ? `${notes.slice(0, REVIEW_NOTE_CHARS)}...` : notes,
  };
}

function toSections(
  sections: readonly { title: string; lessons: readonly LessonRow[] }[],
): ReviewSectionMaterial[] {
  return sections.map((section) => ({
    title: section.title.trim(),
    lessons: section.lessons.map(toLesson),
  }));
}

export async function loadReviewMaterial(courseId: string): Promise<ReviewMaterial> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      title: true,
      subtitle: true,
      description: true,
      benefits: true,
      projectDescription: true,
      priceCents: true,
      originalPriceCents: true,
      category: { select: { name: true } },
      tags: { select: { tag: { select: { name: true } } } },
      sections: {
        orderBy: { order: 'asc' },
        select: {
          title: true,
          lessons: {
            orderBy: { order: 'asc' },
            select: {
              title: true,
              durationSec: true,
              isPreview: true,
              videoUrl: true,
              content: true,
            },
          },
        },
      },
      revision: { select: { status: true, payload: true } },
    },
  });
  if (!course) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');

  const common = {
    subtitle: (course.subtitle ?? '').trim(),
    description: course.description.trim(),
    benefits: course.benefits.map((b) => b.trim()),
    projectDescription: (course.projectDescription ?? '').trim(),
  };

  const payload =
    course.revision?.status === 'PENDING_REVIEW'
      ? courseRevisionPayloadSchema.safeParse(course.revision.payload)
      : undefined;
  if (payload?.success) {
    const [category, tags] = await Promise.all([
      prisma.category.findUnique({
        where: { id: payload.data.categoryId },
        select: { name: true },
      }),
      prisma.tag.findMany({
        where: { id: { in: payload.data.tagIds } },
        orderBy: { name: 'asc' },
        select: { name: true },
      }),
    ]);
    return {
      target: 'REVISION',
      ...common,
      title: payload.data.title.trim(),
      category: category?.name ?? '',
      tags: tags.map((t) => t.name),
      priceCents: payload.data.priceCents,
      originalPriceCents: payload.data.originalPriceCents,
      sections: toSections(payload.data.sections),
    };
  }

  return {
    target: 'COURSE',
    ...common,
    title: course.title.trim(),
    category: course.category.name,
    tags: course.tags.map((t) => t.tag.name).sort(),
    priceCents: course.priceCents,
    originalPriceCents: course.originalPriceCents,
    sections: toSections(course.sections),
  };
}
