// Bản sửa đổi của khóa đã xuất bản (BR-21): tạo / lưu / gửi duyệt / hủy. Duyệt & áp dụng là việc của admin
// (`applyRevision` trong modules/admin/adminRevisionApply.service.ts, gọi khi admin duyệt).
import { Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { getCourseMissing, storedVideoUrls } from '@/lib/courseChecklist';
import { assertCourseOwner } from '@/lib/courseOwnership';
import { type CourseRevisionPayload, snapshotFromRevision } from '@/lib/courseRevisionPayload';
import { prisma } from '@/lib/prisma';
import { normalizeYouTubeUrl } from '@/lib/youtube';
import type { StudioCourseDetailDto } from '@/types/teacherAdminDto';

import { readRevisionPayload } from './studio.mapper';
import type { CourseRevisionBody } from './studio.schema';
import { assertCategoryAndTags, assertStatus, loadCourseDetail } from './studioShared';
import { recordModeration } from './studioWorkflow.service';

function revisionNotFound(): ApiError {
  return ApiError.of('REVISION_NOT_FOUND', 'This course has no open revision');
}

function invalidPayload(field: string, message: string): ApiError {
  return ApiError.badRequest(message, [{ source: 'body', field, message }]);
}

/** Bản chụp các trường lớn của khóa đang xuất bản (nguồn của bản sửa đổi mới). */
async function snapshotPublishedCourse(courseId: string): Promise<CourseRevisionPayload> {
  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    select: {
      title: true,
      priceCents: true,
      originalPriceCents: true,
      categoryId: true,
      tags: { select: { tagId: true } },
      sections: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          lessons: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              videoUrl: true,
              durationSec: true,
              isPreview: true,
              content: true,
            },
          },
        },
      },
    },
  });
  return {
    title: course.title,
    priceCents: course.priceCents,
    originalPriceCents: course.originalPriceCents,
    categoryId: course.categoryId,
    tagIds: course.tags.map((t) => t.tagId),
    sections: course.sections.map((section) => ({
      id: section.id,
      title: section.title,
      lessons: section.lessons.map((lesson) => ({
        ...lesson,
        content: lesson.content ?? '',
      })),
    })),
  };
}

export async function createRevision(
  userId: string,
  courseId: string,
): Promise<StudioCourseDetailDto> {
  const owned = await assertCourseOwner(userId, courseId);
  assertStatus(owned.status, ['PUBLISHED'], 'create a revision for');
  if (await prisma.courseRevision.findUnique({ where: { courseId }, select: { id: true } })) {
    throw ApiError.of('REVISION_EXISTS', 'This course already has an open revision');
  }
  const payload = await snapshotPublishedCourse(courseId);
  try {
    await prisma.courseRevision.create({
      data: { courseId, payload: payload as unknown as Prisma.InputJsonValue, status: 'OPEN' },
      select: { id: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw ApiError.of('REVISION_EXISTS', 'This course already has an open revision');
    }
    throw err;
  }
  return loadCourseDetail(courseId);
}

/** Mọi id chương/bài trong payload phải thuộc khóa này (và không trùng) - 400 nếu không. */
async function assertPayloadIds(courseId: string, body: CourseRevisionBody): Promise<void> {
  const sections = await prisma.section.findMany({
    where: { courseId },
    select: { id: true, lessons: { select: { id: true, videoUrl: true } } },
  });
  const sectionIds = new Set(sections.map((s) => s.id));
  const lessonIds = new Set(sections.flatMap((s) => s.lessons.map((l) => l.id)));
  const storedVideos = storedVideoUrls(sections);
  const seenSections = new Set<string>();
  const seenLessons = new Set<string>();
  for (const [si, section] of body.sections.entries()) {
    if (section.id !== undefined) {
      if (!sectionIds.has(section.id) || seenSections.has(section.id)) {
        throw invalidPayload(`sections.${si}.id`, 'Unknown or duplicated section id');
      }
      seenSections.add(section.id);
    }
    for (const [li, lesson] of section.lessons.entries()) {
      const isKeptStoredVideo =
        lesson.id !== undefined && storedVideos.get(lesson.id) === lesson.videoUrl;
      if (!isKeptStoredVideo && normalizeYouTubeUrl(lesson.videoUrl) === null) {
        throw invalidPayload(
          `sections.${si}.lessons.${li}.videoUrl`,
          'Must be a valid YouTube link',
        );
      }
      if (lesson.id === undefined) continue;
      if (!lessonIds.has(lesson.id) || seenLessons.has(lesson.id)) {
        throw invalidPayload(`sections.${si}.lessons.${li}.id`, 'Unknown or duplicated lesson id');
      }
      seenLessons.add(lesson.id);
    }
  }
}

function normalizeBody(body: CourseRevisionBody): CourseRevisionPayload {
  return {
    ...body,
    tagIds: [...new Set(body.tagIds)],
    sections: body.sections.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) => ({
        ...lesson,
        videoUrl: normalizeYouTubeUrl(lesson.videoUrl) ?? lesson.videoUrl,
      })),
    })),
  };
}

async function loadOpenRevision(courseId: string) {
  const revision = await prisma.courseRevision.findUnique({ where: { courseId } });
  if (!revision) throw revisionNotFound();
  return revision;
}

export async function saveRevision(
  userId: string,
  courseId: string,
  body: CourseRevisionBody,
): Promise<StudioCourseDetailDto> {
  const owned = await assertCourseOwner(userId, courseId);
  const revision = await loadOpenRevision(courseId);
  assertStatus(owned.status, ['PUBLISHED'], 'edit a revision of');
  if (revision.status === 'PENDING_REVIEW') {
    throw ApiError.of(
      'INVALID_COURSE_STATE',
      'Withdraw the revision from review before editing it',
    );
  }
  await assertCategoryAndTags(prisma, body.categoryId, body.tagIds);
  await assertPayloadIds(courseId, body);
  await prisma.courseRevision.update({
    where: { courseId },
    data: { payload: normalizeBody(body) as unknown as Prisma.InputJsonValue },
    select: { id: true },
  });
  return loadCourseDetail(courseId);
}

export async function submitRevision(
  userId: string,
  courseId: string,
): Promise<StudioCourseDetailDto> {
  const owned = await assertCourseOwner(userId, courseId);
  const revision = await loadOpenRevision(courseId);
  assertStatus(owned.status, ['PUBLISHED'], 'submit a revision of');
  if (revision.status === 'PENDING_REVIEW') {
    throw ApiError.of('INVALID_COURSE_STATE', 'This revision is already waiting for review');
  }
  const minor = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    select: {
      description: true,
      thumbnailUrl: true,
      sections: { select: { lessons: { select: { id: true, videoUrl: true } } } },
    },
  });
  const missing = getCourseMissing(
    snapshotFromRevision(
      minor,
      readRevisionPayload(revision.payload),
      storedVideoUrls(minor.sections),
    ),
  );
  if (missing.length > 0) {
    throw ApiError.of(
      'COURSE_INCOMPLETE',
      'The revision does not meet the submission requirements',
      {
        missing,
      },
    );
  }
  await prisma.$transaction(async (tx) => {
    const moved = await tx.courseRevision.updateMany({
      where: { courseId, status: { in: ['OPEN', 'REJECTED'] } },
      data: { status: 'PENDING_REVIEW', submittedAt: new Date() },
    });
    if (moved.count === 0) throw ApiError.of('INVALID_COURSE_STATE', 'Revision state has changed');
    await recordModeration(tx, {
      courseId,
      actorId: userId,
      action: 'SUBMITTED',
      target: 'REVISION',
    });
  });
  return loadCourseDetail(courseId);
}

/** Xóa bản sửa đổi ở mọi trạng thái; đang chờ duyệt thì ghi `WITHDRAWN`/`REVISION`. */
export async function deleteRevision(userId: string, courseId: string): Promise<void> {
  await assertCourseOwner(userId, courseId);
  const revision = await loadOpenRevision(courseId);
  await prisma.$transaction(async (tx) => {
    if (revision.status === 'PENDING_REVIEW') {
      await recordModeration(tx, {
        courseId,
        actorId: userId,
        action: 'WITHDRAWN',
        target: 'REVISION',
      });
    }
    await tx.courseRevision.deleteMany({ where: { courseId } });
  });
}
