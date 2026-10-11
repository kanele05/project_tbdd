import { Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { assertCourseOwner, assertCourseTeacher } from '@/lib/courseOwnership';
import { reviewDtoSelect, toReviewDto } from '@/lib/mappers';
import { notificationMessage } from '@/lib/notificationMessage';
import { notify } from '@/lib/notify';
import { buildPaginationMeta, getPagination, type PaginationMeta } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import { submissionSelect, toSubmissionDto } from '@/modules/project/project.service';
import { answerSelect, toAnswerDto } from '@/modules/question/question.mapper';
import { buildReviewSummary } from '@/modules/review/review.utils';
import type { AnswerDto, ReviewDto } from '@/types/dto';
import type {
  GradeSubmissionRequest,
  TeacherCourseStatsDto,
  TeacherSubmissionDto,
  TeacherSubmissionsSummaryDto,
} from '@/types/teacherAdminDto';

import type { SubmissionsQuery } from './teaching.schema';

const DAY_MS = 24 * 60 * 60 * 1000;
const STATS_DAYS = 30;

function notFound(message: string): ApiError {
  return ApiError.of('NOT_FOUND', message);
}

/** N ngày UTC (cũ -> mới), kết thúc ở hôm nay: các khóa `YYYY-MM-DD` + mốc bắt đầu 00:00 UTC. */
function lastDaysUtc(days: number, now = new Date()): { start: Date; keys: string[] } {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startMs = today - (days - 1) * DAY_MS;
  const keys = Array.from({ length: days }, (_, i) =>
    new Date(startMs + i * DAY_MS).toISOString().slice(0, 10),
  );
  return { start: new Date(startMs), keys };
}

/** `GET /teacher/courses/:id/stats`: ghi danh, doanh thu (đơn PAID), tiến độ, đánh giá, bài nộp. */
export async function getCourseStats(
  userId: string,
  courseId: string,
): Promise<TeacherCourseStatsDto> {
  await assertCourseOwner(userId, courseId);
  const { start, keys } = lastDaysUtc(STATS_DAYS);

  const [enrollments, completedCount, revenue, ratingGroups, perDay, submissionCount, gradedCount] =
    await Promise.all([
      prisma.enrollment.aggregate({
        where: { courseId },
        _count: { _all: true },
        _avg: { progressPercent: true },
      }),
      prisma.enrollment.count({ where: { courseId, completedAt: { not: null } } }),
      prisma.orderItem.aggregate({
        where: { courseId, order: { status: 'PAID' } },
        _sum: { priceCents: true },
      }),
      prisma.review.groupBy({ by: ['rating'], where: { courseId }, _count: { _all: true } }),
      prisma.$queryRaw<{ day: string; count: number }[]>(Prisma.sql`
        SELECT to_char("enrolledAt", 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
        FROM "Enrollment"
        WHERE "courseId" = ${courseId} AND "enrolledAt" >= ${start}
        GROUP BY 1
      `),
      prisma.projectSubmission.count({ where: { courseId } }),
      prisma.projectSubmission.count({ where: { courseId, grade: { not: null } } }),
    ]);

  const rating = buildReviewSummary(
    ratingGroups.map((group) => ({ rating: group.rating, count: group._count._all })),
  );
  const countByDay = new Map(perDay.map((row) => [row.day, Number(row.count)]));

  return {
    courseId,
    enrollmentCount: enrollments._count._all,
    revenueCents: revenue._sum.priceCents ?? 0,
    avgProgressPercent: Math.round(enrollments._avg.progressPercent ?? 0),
    completedCount,
    ratingAvg: rating.avg,
    ratingCount: rating.count,
    ratingDistribution: rating.distribution,
    newEnrollments30d: keys.map((date) => ({ date, count: countByDay.get(date) ?? 0 })),
    submissionCount,
    gradedCount,
  };
}

const teacherSubmissionSelect = {
  ...submissionSelect,
  courseId: true,
} satisfies Prisma.ProjectSubmissionSelect;

type TeacherSubmissionRow = Prisma.ProjectSubmissionGetPayload<{
  select: typeof teacherSubmissionSelect;
}>;

function toTeacherSubmissionDto(row: TeacherSubmissionRow): TeacherSubmissionDto {
  return { ...toSubmissionDto(row), courseId: row.courseId };
}

/** `GET /teacher/courses/:id/submissions`: mới nhất trước; `meta.summary` bỏ qua bộ lọc `status`. */
export async function listSubmissions(
  userId: string,
  courseId: string,
  query: SubmissionsQuery,
): Promise<{
  items: TeacherSubmissionDto[];
  meta: PaginationMeta & { summary: TeacherSubmissionsSummaryDto };
}> {
  await assertCourseOwner(userId, courseId);
  const pagination = getPagination(query);
  const where: Prisma.ProjectSubmissionWhereInput = {
    courseId,
    ...(query.status === 'graded' ? { grade: { not: null } } : {}),
    ...(query.status === 'ungraded' ? { grade: null } : {}),
  };

  const [rows, total, gradedCount, allCount] = await Promise.all([
    prisma.projectSubmission.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
      select: teacherSubmissionSelect,
    }),
    prisma.projectSubmission.count({ where }),
    prisma.projectSubmission.count({ where: { courseId, grade: { not: null } } }),
    prisma.projectSubmission.count({ where: { courseId } }),
  ]);

  return {
    items: rows.map(toTeacherSubmissionDto),
    meta: {
      ...buildPaginationMeta(total, pagination),
      summary: { gradedCount, ungradedCount: allCount - gradedCount },
    },
  };
}

/**
 * `PUT /teacher/submissions/:id/grade` (BR-26): chấm / chấm lại (ghi đè, cập nhật `gradedAt`) và thông báo
 * `PROJECT_GRADED` cho người nộp - cùng 1 transaction.
 */
export async function gradeSubmission(
  userId: string,
  submissionId: string,
  input: GradeSubmissionRequest,
): Promise<TeacherSubmissionDto> {
  const target = await prisma.projectSubmission.findUnique({
    where: { id: submissionId },
    select: {
      courseId: true,
      userId: true,
      title: true,
      course: { select: { title: true } },
    },
  });
  if (!target) throw notFound('Submission not found');
  await assertCourseTeacher(userId, target.courseId);

  return prisma.$transaction(async (tx) => {
    const row = await tx.projectSubmission.update({
      where: { id: submissionId },
      data: { grade: input.grade, feedback: input.feedback, gradedAt: new Date() },
      select: teacherSubmissionSelect,
    });
    await notify(tx, {
      userId: target.userId,
      message: notificationMessage('PROJECT_GRADED', {
        projectTitle: target.title,
        courseTitle: target.course.title,
        grade: input.grade,
      }),
      refs: { courseId: target.courseId, submissionId },
    });
    return toTeacherSubmissionDto(row);
  });
}

async function findReviewForTeacher(userId: string, reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      userId: true,
      courseId: true,
      teacherReply: true,
      course: { select: { title: true } },
    },
  });
  if (!review) throw notFound('Review not found');
  await assertCourseTeacher(userId, review.courseId);
  return review;
}

/**
 * `PUT /teacher/reviews/:id/reply` (BR-25): đặt / sửa phản hồi; chỉ lần phản hồi ĐẦU mới gửi `REVIEW_REPLY`
 * cho người đánh giá.
 */
export async function replyToReview(
  userId: string,
  reviewId: string,
  reply: string,
): Promise<ReviewDto> {
  const review = await findReviewForTeacher(userId, reviewId);
  return prisma.$transaction(async (tx) => {
    const saved = await tx.review.update({
      where: { id: reviewId },
      data: { teacherReply: reply, teacherRepliedAt: new Date() },
      select: reviewDtoSelect,
    });
    if (review.teacherReply === null && review.userId !== userId) {
      await notify(tx, {
        userId: review.userId,
        message: notificationMessage('REVIEW_REPLY', { courseTitle: review.course.title }),
        refs: { courseId: review.courseId, reviewId },
      });
    }
    return toReviewDto(saved);
  });
}

/** `DELETE /teacher/reviews/:id/reply`: xóa phản hồi (idempotent), trả `teacherReply: null`. */
export async function deleteReviewReply(userId: string, reviewId: string): Promise<ReviewDto> {
  await findReviewForTeacher(userId, reviewId);
  const saved = await prisma.review.update({
    where: { id: reviewId },
    data: { teacherReply: null, teacherRepliedAt: null },
    select: reviewDtoSelect,
  });
  return toReviewDto(saved);
}

/**
 * `PUT|DELETE /teacher/answers/:id/pin` (BR-24): ghim / bỏ ghim. Tối đa 1 câu trả lời ghim / câu hỏi: ghim
 * câu mới thì bỏ ghim câu cũ; khóa hàng Question (`FOR UPDATE`) để hai lần ghim đồng thời không để lại 2 ghim.
 */
export async function setAnswerPinned(
  userId: string,
  answerId: string,
  isPinned: boolean,
): Promise<AnswerDto> {
  const target = await prisma.answer.findUnique({
    where: { id: answerId },
    select: { questionId: true, question: { select: { courseId: true } } },
  });
  if (!target) throw notFound('Answer not found');
  await assertCourseTeacher(userId, target.question.courseId);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Question" WHERE "id" = ${target.questionId} FOR UPDATE`;
    if (isPinned) {
      await tx.answer.updateMany({
        where: { questionId: target.questionId, isPinned: true, id: { not: answerId } },
        data: { isPinned: false },
      });
    }
    const row = await tx.answer.update({
      where: { id: answerId },
      data: { isPinned },
      select: answerSelect,
    });
    return toAnswerDto(row);
  });
}
