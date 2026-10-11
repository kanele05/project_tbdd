// Chương trình học (FR-40): CRUD chương/bài + đổi thứ tự. Chỉ cho khóa DRAFT/REJECTED (BR-19/21).
// `Section(courseId, order)` và `Lesson(sectionId, order)` là unique -> luôn dời `order` an toàn trong 1 transaction.
import type { Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { COURSE_LIMITS } from '@/lib/courseChecklist';
import { assertCourseOwner, assertLessonOwner, assertSectionOwner } from '@/lib/courseOwnership';
import { prisma } from '@/lib/prisma';
import { normalizeYouTubeUrl } from '@/lib/youtube';
import type { StudioLessonDto, StudioSectionDto } from '@/types/teacherAdminDto';

import { toLessonDto, toSectionDto } from './studio.mapper';
import type {
  CreateLessonInput,
  ReorderInput,
  SectionInput,
  UpdateLessonInput,
} from './studio.schema';
import { assertCurriculumEditable, recomputeCourseCounts } from './studioShared';

type Tx = Prisma.TransactionClient;

function limitError(field: string, message: string): ApiError {
  return ApiError.badRequest(message, [{ source: 'body', field, message }]);
}

function requireVideoUrl(url: string): string {
  const normalized = normalizeYouTubeUrl(url);
  if (normalized === null) throw limitError('videoUrl', 'Must be a valid YouTube link');
  return normalized;
}

/** Đánh lại 1..n theo thứ tự hiện tại. Chỉ dùng sau khi XÓA (order chỉ giảm nên không đụng unique). */
async function renumberSections(tx: Tx, courseId: string): Promise<void> {
  const rows = await tx.section.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    select: { id: true, order: true },
  });
  for (const [index, row] of rows.entries()) {
    if (row.order !== index + 1) {
      await tx.section.update({ where: { id: row.id }, data: { order: index + 1 } });
    }
  }
}

async function renumberLessons(tx: Tx, sectionId: string): Promise<void> {
  const rows = await tx.lesson.findMany({
    where: { sectionId },
    orderBy: { order: 'asc' },
    select: { id: true, order: true },
  });
  for (const [index, row] of rows.entries()) {
    if (row.order !== index + 1) {
      await tx.lesson.update({ where: { id: row.id }, data: { order: index + 1 } });
    }
  }
}

export function createSection(
  userId: string,
  courseId: string,
  input: SectionInput,
): Promise<StudioSectionDto> {
  return prisma.$transaction(async (tx) => {
    const course = await assertCourseOwner(userId, courseId, tx);
    assertCurriculumEditable(course.status);
    const agg = await tx.section.aggregate({
      where: { courseId },
      _count: { _all: true },
      _max: { order: true },
    });
    if (agg._count._all >= COURSE_LIMITS.maxSections) {
      throw limitError('title', `At most ${COURSE_LIMITS.maxSections} sections per course`);
    }
    const section = await tx.section.create({
      data: { courseId, title: input.title, order: (agg._max.order ?? 0) + 1 },
    });
    await tx.course.update({ where: { id: courseId }, data: {}, select: { id: true } });
    return toSectionDto({ ...section, lessons: [] });
  });
}

export function updateSection(
  userId: string,
  sectionId: string,
  input: SectionInput,
): Promise<StudioSectionDto> {
  return prisma.$transaction(async (tx) => {
    const owned = await assertSectionOwner(userId, sectionId, tx);
    assertCurriculumEditable(owned.course.status);
    const section = await tx.section.update({
      where: { id: sectionId },
      data: { title: input.title },
      include: { lessons: { orderBy: { order: 'asc' } } },
    });
    await tx.course.update({ where: { id: owned.course.id }, data: {}, select: { id: true } });
    return toSectionDto(section);
  });
}

export function deleteSection(userId: string, sectionId: string): Promise<void> {
  return prisma.$transaction(async (tx) => {
    const owned = await assertSectionOwner(userId, sectionId, tx);
    assertCurriculumEditable(owned.course.status);
    await tx.section.delete({ where: { id: sectionId } });
    await renumberSections(tx, owned.course.id);
    await recomputeCourseCounts(tx, owned.course.id);
  });
}

export function createLesson(
  userId: string,
  sectionId: string,
  input: CreateLessonInput,
): Promise<StudioLessonDto> {
  const videoUrl = requireVideoUrl(input.videoUrl);
  return prisma.$transaction(async (tx) => {
    const owned = await assertSectionOwner(userId, sectionId, tx);
    assertCurriculumEditable(owned.course.status);
    const total = await tx.lesson.count({ where: { section: { courseId: owned.course.id } } });
    if (total >= COURSE_LIMITS.maxLessons) {
      throw limitError('title', `At most ${COURSE_LIMITS.maxLessons} lessons per course`);
    }
    const last = await tx.lesson.aggregate({ where: { sectionId }, _max: { order: true } });
    const lesson = await tx.lesson.create({
      data: {
        sectionId,
        title: input.title,
        videoUrl,
        durationSec: input.durationSec,
        isPreview: input.isPreview,
        content: input.content ?? '',
        order: (last._max.order ?? 0) + 1,
      },
    });
    await recomputeCourseCounts(tx, owned.course.id);
    return toLessonDto(lesson);
  });
}

export function updateLesson(
  userId: string,
  lessonId: string,
  input: UpdateLessonInput,
): Promise<StudioLessonDto> {
  const videoUrl = input.videoUrl === undefined ? undefined : requireVideoUrl(input.videoUrl);
  return prisma.$transaction(async (tx) => {
    const owned = await assertLessonOwner(userId, lessonId, tx);
    assertCurriculumEditable(owned.course.status);
    const data: Prisma.LessonUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (videoUrl !== undefined) data.videoUrl = videoUrl;
    if (input.durationSec !== undefined) data.durationSec = input.durationSec;
    if (input.isPreview !== undefined) data.isPreview = input.isPreview;
    if (input.content !== undefined) data.content = input.content;
    const lesson = await tx.lesson.update({ where: { id: lessonId }, data });
    await recomputeCourseCounts(tx, owned.course.id);
    return toLessonDto(lesson);
  });
}

export function deleteLesson(userId: string, lessonId: string): Promise<void> {
  return prisma.$transaction(async (tx) => {
    const owned = await assertLessonOwner(userId, lessonId, tx);
    assertCurriculumEditable(owned.course.status);
    await tx.lesson.delete({ where: { id: lessonId } });
    await renumberLessons(tx, owned.sectionId);
    await recomputeCourseCounts(tx, owned.course.id);
  });
}

function assertSameIds(actual: readonly string[], requested: readonly string[]): void {
  const known = new Set(actual);
  const sameSet = requested.length === actual.length && requested.every((id) => known.has(id));
  if (!sameSet) {
    throw limitError('ids', 'ids must be exactly the current set of ids, in the new order');
  }
}

/** Gán thứ tự mới: bước 1 chuyển sang số âm (không đụng unique), bước 2 đặt 1..n. */
async function applyOrder(
  tx: Tx,
  model: 'section' | 'lesson',
  ids: readonly string[],
): Promise<void> {
  const setOrder = (id: string, order: number) =>
    model === 'section'
      ? tx.section.update({ where: { id }, data: { order }, select: { id: true } })
      : tx.lesson.update({ where: { id }, data: { order }, select: { id: true } });
  for (const [index, id] of ids.entries()) await setOrder(id, -(index + 1));
  for (const [index, id] of ids.entries()) await setOrder(id, index + 1);
}

export function reorderCurriculum(
  userId: string,
  courseId: string,
  input: ReorderInput,
): Promise<StudioSectionDto[]> {
  return prisma.$transaction(
    async (tx) => {
      const course = await assertCourseOwner(userId, courseId, tx);
      assertCurriculumEditable(course.status);
      if (input.target === 'sections') {
        const sections = await tx.section.findMany({ where: { courseId }, select: { id: true } });
        assertSameIds(
          sections.map((s) => s.id),
          input.ids,
        );
        await applyOrder(tx, 'section', input.ids);
      } else {
        const section = await tx.section.findFirst({
          where: { id: input.sectionId, courseId },
          select: { lessons: { select: { id: true } } },
        });
        if (!section) throw limitError('sectionId', 'Section does not belong to this course');
        assertSameIds(
          section.lessons.map((l) => l.id),
          input.ids,
        );
        await applyOrder(tx, 'lesson', input.ids);
      }
      await tx.course.update({ where: { id: courseId }, data: {}, select: { id: true } });
      const sections = await tx.section.findMany({
        where: { courseId },
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' } } },
      });
      return sections.map(toSectionDto);
    },
    { timeout: 20_000 },
  );
}
