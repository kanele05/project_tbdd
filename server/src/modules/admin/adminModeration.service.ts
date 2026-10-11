/**
 * Duyệt / từ chối / ẩn / khôi phục khóa học (BR-19, BR-21, BR-27). Mỗi hành động chạy trong 1 transaction:
 * chuyển trạng thái có điều kiện (chặn hai admin bấm cùng lúc), ghi `CourseModeration`, tạo thông báo cho
 * giảng viên. Email gửi nền SAU khi commit - lỗi email chỉ được log, không làm hỏng thao tác.
 */
import type { Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { getCourseMissing, storedVideoUrls } from '@/lib/courseChecklist';
import { notifyFollowersOfNewCourse } from '@/lib/courseNotify';
import { snapshotFromRevision } from '@/lib/courseRevisionPayload';
import { logger } from '@/lib/logger';
import { queueMail } from '@/lib/mailer';
import { courseDecisionMail } from '@/lib/mailTemplates';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';
import { invalidateHomeCache } from '@/modules/home/home.service';
import type { AdminCourseDetailDto, ModerationTarget } from '@/types/teacherAdminDto';

import { getAdminCourseDetail, parseRevisionPayload } from './adminCourseDetail.service';
import { applyRevision } from './adminRevisionApply.service';

const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 } as const;

const decisionSelect = {
  id: true,
  title: true,
  status: true,
  publishedAt: true,
  description: true,
  thumbnailUrl: true,
  categoryId: true,
  priceCents: true,
  originalPriceCents: true,
  sections: {
    orderBy: { order: 'asc' },
    select: {
      lessons: {
        orderBy: { order: 'asc' },
        select: { id: true, videoUrl: true, durationSec: true, isPreview: true },
      },
    },
  },
  revision: { select: { id: true, status: true, payload: true } },
  teacher: { select: { userId: true, user: { select: { fullName: true, email: true } } } },
} satisfies Prisma.CourseSelect;

type DecisionCourse = Prisma.CourseGetPayload<{ select: typeof decisionSelect }>;

async function loadForDecision(courseId: string): Promise<DecisionCourse> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: decisionSelect,
  });
  if (!course) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');
  return course;
}

const invalidState = (message: string): ApiError => ApiError.of('INVALID_COURSE_STATE', message);

/** Thứ cần duyệt/từ chối: khóa mới đang chờ, hoặc bản sửa đổi đang chờ của khóa đã xuất bản. */
function pendingTarget(course: DecisionCourse): ModerationTarget {
  if (course.status === 'PENDING_REVIEW') return 'COURSE';
  if (course.status === 'PUBLISHED' && course.revision?.status === 'PENDING_REVIEW') {
    return 'REVISION';
  }
  throw invalidState('This course has nothing waiting for review');
}

function sendDecisionMail(
  course: DecisionCourse,
  target: ModerationTarget,
  decision: 'APPROVED' | 'REJECTED',
  reason?: string,
): void {
  try {
    queueMail({
      to: course.teacher.user.email,
      ...courseDecisionMail('both', {
        fullName: course.teacher.user.fullName,
        courseTitle: course.title,
        target: target === 'COURSE' ? 'course' : 'revision',
        decision,
        ...(reason ? { reason } : {}),
      }),
    });
  } catch (err) {
    logger.warn({ err, courseId: course.id }, 'Could not queue the course decision email');
  }
}

/** Checklist BR-20 chạy lại lúc duyệt (nội dung có thể đã đổi sau khi gửi) - thiếu -> 422 `COURSE_INCOMPLETE`. */
function assertComplete(course: DecisionCourse, target: ModerationTarget): void {
  const missing =
    target === 'COURSE'
      ? getCourseMissing({
          title: course.title,
          description: course.description,
          thumbnailUrl: course.thumbnailUrl,
          categoryId: course.categoryId,
          priceCents: course.priceCents,
          originalPriceCents: course.originalPriceCents,
          sections: course.sections,
        })
      : getCourseMissing(
          snapshotFromRevision(
            { description: course.description, thumbnailUrl: course.thumbnailUrl },
            parseRevisionPayload(course.revision?.payload),
            storedVideoUrls(course.sections),
          ),
        );
  if (missing.length > 0) {
    throw ApiError.of('COURSE_INCOMPLETE', 'The content no longer meets the requirements', {
      missing,
    });
  }
}

/** `POST /admin/courses/:id/approve` (BR-21/27, FR-50/54). */
export async function approveCourse(
  courseId: string,
  actorId: string,
): Promise<AdminCourseDetailDto> {
  const course = await loadForDecision(courseId);
  const target = pendingTarget(course);
  assertComplete(course, target);
  // Thông báo / email nhắc tên khóa SAU khi duyệt (bản sửa đổi có thể đổi tiêu đề).
  const approved =
    target === 'REVISION'
      ? { ...course, title: parseRevisionPayload(course.revision?.payload).title }
      : course;

  await prisma.$transaction(async (tx) => {
    if (target === 'COURSE') {
      const isFirstPublish = course.publishedAt === null;
      const moved = await tx.course.updateMany({
        where: { id: courseId, status: 'PENDING_REVIEW' },
        data: { status: 'PUBLISHED', ...(isFirstPublish ? { publishedAt: new Date() } : {}) },
      });
      if (moved.count === 0) throw invalidState('This course is no longer waiting for review');
      if (isFirstPublish) await notifyFollowersOfNewCourse(courseId, tx);
    } else {
      const revision = course.revision;
      if (!revision) throw invalidState('This course has no revision to approve');
      const removed = await tx.courseRevision.deleteMany({
        where: { id: revision.id, status: 'PENDING_REVIEW' },
      });
      if (removed.count === 0) throw invalidState('This revision is no longer waiting for review');
      await applyRevision(tx, courseId, parseRevisionPayload(revision.payload));
    }
    await tx.courseModeration.create({
      data: { courseId, actorId, action: 'APPROVED', target },
      select: { id: true },
    });
    await notify(tx, {
      userId: course.teacher.userId,
      type: 'COURSE_APPROVED',
      title: target === 'COURSE' ? 'Your course was approved' : 'Your course changes were approved',
      body:
        target === 'COURSE'
          ? `"${approved.title}" has been approved and is now published.`
          : `The changes you submitted for "${approved.title}" are now live.`,
      data: { courseId },
    });
  }, TX_OPTIONS);

  invalidateHomeCache();
  sendDecisionMail(approved, target, 'APPROVED');
  return getAdminCourseDetail(courseId);
}

/** `POST /admin/courses/:id/reject` (BR-19/21/27). Khóa đang chờ -> REJECTED; bản sửa đổi đang chờ -> REJECTED. */
export async function rejectCourse(
  courseId: string,
  actorId: string,
  reason: string,
): Promise<AdminCourseDetailDto> {
  const course = await loadForDecision(courseId);
  const target = pendingTarget(course);
  const cleanReason = reason.trim();

  await prisma.$transaction(async (tx) => {
    const moved =
      target === 'COURSE'
        ? await tx.course.updateMany({
            where: { id: courseId, status: 'PENDING_REVIEW' },
            data: { status: 'REJECTED' },
          })
        : await tx.courseRevision.updateMany({
            where: { courseId, status: 'PENDING_REVIEW' },
            data: { status: 'REJECTED' },
          });
    if (moved.count === 0) throw invalidState('This item is no longer waiting for review');
    await tx.courseModeration.create({
      data: { courseId, actorId, action: 'REJECTED', target, reason: cleanReason },
      select: { id: true },
    });
    await notify(tx, {
      userId: course.teacher.userId,
      type: 'COURSE_REJECTED',
      title:
        target === 'COURSE'
          ? 'Your course was not approved'
          : 'Your course changes were not approved',
      body: `"${course.title}": ${cleanReason}`,
      data: { courseId },
    });
  }, TX_OPTIONS);

  sendDecisionMail(course, target, 'REJECTED', cleanReason);
  return getAdminCourseDetail(courseId);
}

/** `POST /admin/courses/:id/archive|restore` (BR-19/22): PUBLISHED <-> ARCHIVED, lý do (tùy chọn) vào lịch sử. */
async function setVisibility(
  courseId: string,
  actorId: string,
  from: 'PUBLISHED' | 'ARCHIVED',
  to: 'PUBLISHED' | 'ARCHIVED',
  reason: string | undefined,
): Promise<AdminCourseDetailDto> {
  const exists = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!exists) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');

  await prisma.$transaction(async (tx) => {
    const moved = await tx.course.updateMany({
      where: { id: courseId, status: from },
      data: { status: to },
    });
    if (moved.count === 0) {
      throw invalidState(
        to === 'ARCHIVED'
          ? 'Only a published course can be archived'
          : 'Only an archived course can be restored',
      );
    }
    await tx.courseModeration.create({
      data: {
        courseId,
        actorId,
        action: to === 'ARCHIVED' ? 'ARCHIVED' : 'RESTORED',
        target: 'COURSE',
        ...(reason ? { reason: reason.trim() } : {}),
      },
      select: { id: true },
    });
  }, TX_OPTIONS);

  invalidateHomeCache();
  return getAdminCourseDetail(courseId);
}

export function archiveCourse(courseId: string, actorId: string, reason?: string) {
  return setVisibility(courseId, actorId, 'PUBLISHED', 'ARCHIVED', reason);
}

export function restoreCourse(courseId: string, actorId: string, reason?: string) {
  return setVisibility(courseId, actorId, 'ARCHIVED', 'PUBLISHED', reason);
}
