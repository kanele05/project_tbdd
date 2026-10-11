/**
 * Dữ liệu dùng chung cho các test Studio (TA-02). Không phải file test (không khớp `*.test.ts`).
 */
import type { CourseStatus } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

import { createCategory, createTeacher } from '../helpers/factories';

export const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
export const YT_SHORT = 'https://youtu.be/dQw4w9WgXcQ';
export const COVER_PATH = '/uploads/courses/cover-test.png';
export const LONG_DESCRIPTION = 'A thorough description of the course. '.repeat(4);

export async function setupTeacher() {
  const { user, profile } = await createTeacher();
  const category = await createCategory();
  return { user, profile, category };
}

/**
 * Khóa đạt checklist BR-20: mô tả dài, ảnh bìa, 2 chương, 4 bài YouTube (2 bài đầu xem thử), giá 59 USD.
 */
export async function createReadyCourse(
  teacherProfileId: string,
  categoryId: string,
  options: { status?: CourseStatus; title?: string; tagIds?: string[] } = {},
) {
  const status = options.status ?? 'DRAFT';
  const course = await prisma.course.create({
    data: {
      title: options.title ?? 'A complete course title',
      subtitle: 'Subtitle',
      description: LONG_DESCRIPTION,
      thumbnailUrl: COVER_PATH,
      priceCents: 5900,
      benefits: ['Learn a lot'],
      status,
      publishedAt: status === 'PUBLISHED' || status === 'ARCHIVED' ? new Date() : null,
      submittedAt: status === 'PENDING_REVIEW' ? new Date() : null,
      categoryId,
      teacherId: teacherProfileId,
      lessonCount: 4,
      totalDurationSec: 400,
      ...(options.tagIds?.length
        ? { tags: { create: options.tagIds.map((tagId) => ({ tagId })) } }
        : {}),
    },
  });
  const sections = [];
  const lessons = [];
  let n = 0;
  for (let s = 1; s <= 2; s += 1) {
    const section = await prisma.section.create({
      data: { courseId: course.id, title: `Section ${s}`, order: s },
    });
    sections.push(section);
    for (let l = 1; l <= 2; l += 1) {
      n += 1;
      lessons.push(
        await prisma.lesson.create({
          data: {
            sectionId: section.id,
            title: `Lesson ${n}`,
            order: l,
            durationSec: 100,
            videoUrl: YT,
            isPreview: n <= 2,
            content: `Notes ${n}`,
          },
        }),
      );
    }
  }
  return { course, sections, lessons };
}
