/** Dữ liệu dùng chung cho các integration test của /admin/* (không phải file test). */
import type { CourseStatus } from '@/generated/prisma/client';
import type { CourseRevisionPayload } from '@/lib/courseRevisionPayload';
import { prisma } from '@/lib/prisma';

import { createCategory, createCourse, createTeacher } from '../helpers/factories';

export const LONG_DESCRIPTION =
  'A thorough description of this course for the review tests. '.repeat(3);

/** Link YouTube hợp lệ thứ `n` (id 11 ký tự). */
export function youtubeUrl(n: number): string {
  return `https://www.youtube.com/watch?v=dQw4w9WgX${String(n).padStart(2, '0')}`;
}

/**
 * Khóa đạt checklist BR-20: `sections` chương x `lessonsPerSection` bài (YouTube, 600 giây, 2 bài đầu xem thử),
 * mô tả >= 100 ký tự, có ảnh bìa. Trả cả giảng viên và danh mục.
 */
export async function seedSubmittableCourse(
  options: {
    status?: CourseStatus;
    sections?: number;
    lessonsPerSection?: number;
    submittedAt?: Date | null;
    publishedAt?: Date | null;
    title?: string;
    teacher?: Awaited<ReturnType<typeof createTeacher>>;
  } = {},
) {
  const { status = 'PENDING_REVIEW', sections = 2, lessonsPerSection = 2 } = options;
  const teacher = options.teacher ?? (await createTeacher());
  const category = await createCategory();
  const base = await createCourse({
    status,
    teacherId: teacher.profile.id,
    categoryId: category.id,
    ...(options.title ? { title: options.title } : {}),
  });
  const course = await prisma.course.update({
    where: { id: base.id },
    data: {
      description: LONG_DESCRIPTION,
      submittedAt:
        options.submittedAt === undefined
          ? status === 'PENDING_REVIEW'
            ? new Date()
            : null
          : options.submittedAt,
      ...(options.publishedAt !== undefined ? { publishedAt: options.publishedAt } : {}),
    },
  });

  let number = 0;
  const createdSections = [];
  for (let s = 1; s <= sections; s += 1) {
    const section = await prisma.section.create({
      data: { courseId: course.id, title: `Section ${s}`, order: s },
    });
    const lessons = [];
    for (let l = 1; l <= lessonsPerSection; l += 1) {
      number += 1;
      lessons.push(
        await prisma.lesson.create({
          data: {
            sectionId: section.id,
            title: `Lesson ${number}`,
            order: l,
            durationSec: 600,
            videoUrl: youtubeUrl(number),
            isPreview: number <= 2,
            content: `Notes ${number}`,
          },
        }),
      );
    }
    createdSections.push({ ...section, lessons });
  }
  const updated = await prisma.course.update({
    where: { id: course.id },
    data: { lessonCount: number, totalDurationSec: number * 600 },
  });
  return { course: updated, teacher, category, sections: createdSections };
}

/** Payload "không đổi gì" của một khóa có sẵn - test sửa từng phần rồi `saveRevision`. */
export async function payloadOf(courseId: string): Promise<CourseRevisionPayload> {
  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    include: {
      tags: true,
      sections: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } },
    },
  });
  return {
    title: course.title,
    priceCents: course.priceCents,
    originalPriceCents: course.originalPriceCents,
    categoryId: course.categoryId,
    tagIds: course.tags.map((row) => row.tagId),
    sections: course.sections.map((section) => ({
      id: section.id,
      title: section.title,
      lessons: section.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        videoUrl: lesson.videoUrl,
        durationSec: lesson.durationSec,
        isPreview: lesson.isPreview,
        content: lesson.content ?? '',
      })),
    })),
  };
}

export function saveRevision(
  courseId: string,
  payload: CourseRevisionPayload,
  status: 'OPEN' | 'PENDING_REVIEW' | 'REJECTED' = 'PENDING_REVIEW',
) {
  return prisma.courseRevision.create({
    data: {
      courseId,
      payload,
      status,
      submittedAt: status === 'PENDING_REVIEW' ? new Date() : null,
    },
  });
}
