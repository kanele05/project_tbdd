// Luồng duyệt của giảng viên (BR-19/20): gửi duyệt, rút lại, ẩn, khôi phục. Mỗi hành động ghi 1 dòng CourseModeration.
import type { ModerationAction, ModerationTarget, Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { assertCourseOwner } from '@/lib/courseOwnership';
import { prisma } from '@/lib/prisma';
import { invalidateHomeCache } from '@/modules/home/home.service';
import type { StudioCourseDetailDto } from '@/types/teacherAdminDto';

import { detailSelect, missingOfLiveCourse } from './studio.mapper';
import { assertStatus, loadCourseDetail } from './studioShared';

export function recordModeration(
  tx: Pick<Prisma.TransactionClient, 'courseModeration'>,
  entry: {
    courseId: string;
    actorId: string;
    action: ModerationAction;
    target: ModerationTarget;
    reason?: string | null;
  },
): Promise<unknown> {
  return tx.courseModeration.create({
    data: {
      courseId: entry.courseId,
      actorId: entry.actorId,
      action: entry.action,
      target: entry.target,
      reason: entry.reason ?? null,
    },
    select: { id: true },
  });
}

/** BR-20: kiểm tra checklist trên nội dung hiện tại rồi chuyển DRAFT/REJECTED -> PENDING_REVIEW. */
export async function submitCourse(
  userId: string,
  courseId: string,
): Promise<StudioCourseDetailDto> {
  const owned = await assertCourseOwner(userId, courseId);
  assertStatus(owned.status, ['DRAFT', 'REJECTED'], 'submit');
  const row = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    select: detailSelect,
  });
  const missing = missingOfLiveCourse(row);
  if (missing.length > 0) {
    throw ApiError.of('COURSE_INCOMPLETE', 'The course does not meet the submission requirements', {
      missing,
    });
  }
  await prisma.$transaction(async (tx) => {
    // Chỉ chuyển nếu trạng thái chưa đổi (tránh 2 request gửi duyệt song song ghi 2 dòng lịch sử).
    const moved = await tx.course.updateMany({
      where: { id: courseId, status: { in: ['DRAFT', 'REJECTED'] } },
      data: { status: 'PENDING_REVIEW', submittedAt: new Date() },
    });
    if (moved.count === 0) throw ApiError.of('INVALID_COURSE_STATE', 'Course state has changed');
    await recordModeration(tx, {
      courseId,
      actorId: userId,
      action: 'SUBMITTED',
      target: 'COURSE',
    });
  });
  return loadCourseDetail(courseId);
}

async function transition(
  userId: string,
  courseId: string,
  rule: {
    from: 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
    to: 'DRAFT' | 'ARCHIVED' | 'PUBLISHED';
    action: ModerationAction;
    label: string;
  },
): Promise<StudioCourseDetailDto> {
  const owned = await assertCourseOwner(userId, courseId);
  assertStatus(owned.status, [rule.from], rule.label);
  await prisma.$transaction(async (tx) => {
    const moved = await tx.course.updateMany({
      where: { id: courseId, status: rule.from },
      data: { status: rule.to },
    });
    if (moved.count === 0) throw ApiError.of('INVALID_COURSE_STATE', 'Course state has changed');
    await recordModeration(tx, {
      courseId,
      actorId: userId,
      action: rule.action,
      target: 'COURSE',
    });
  });
  return loadCourseDetail(courseId);
}

/** PENDING_REVIEW -> DRAFT. */
export function withdrawCourse(userId: string, courseId: string): Promise<StudioCourseDetailDto> {
  return transition(userId, courseId, {
    from: 'PENDING_REVIEW',
    to: 'DRAFT',
    action: 'WITHDRAWN',
    label: 'withdraw',
  });
}

/** PUBLISHED -> ARCHIVED (học viên đã mua vẫn học được). */
export async function archiveCourse(
  userId: string,
  courseId: string,
): Promise<StudioCourseDetailDto> {
  const result = await transition(userId, courseId, {
    from: 'PUBLISHED',
    to: 'ARCHIVED',
    action: 'ARCHIVED',
    label: 'archive',
  });
  invalidateHomeCache();
  return result;
}

/** ARCHIVED -> PUBLISHED. */
export async function restoreCourse(
  userId: string,
  courseId: string,
): Promise<StudioCourseDetailDto> {
  const result = await transition(userId, courseId, {
    from: 'ARCHIVED',
    to: 'PUBLISHED',
    action: 'RESTORED',
    label: 'restore',
  });
  invalidateHomeCache();
  return result;
}
