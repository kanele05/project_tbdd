import { ApiError } from '@/lib/ApiError';
import { assertEnrolled, assertEnrolledInCourse } from '@/lib/enrollmentGuard';
import { notify } from '@/lib/notify';
import { buildPaginationMeta, getPagination, type PaginationMeta } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import type { AnswerDto, LikeStateDto, QuestionDto } from '@/types/dto';

import { answerSelect, questionSelect, toAnswerDto, toQuestionDto } from './question.mapper';

type Page = { page?: number; limit?: number };

function questionNotFound(): ApiError {
  return ApiError.of('QUESTION_NOT_FOUND', 'Question not found');
}

/** Tìm câu hỏi rồi kiểm tra người dùng đã ghi danh khóa của câu hỏi (✓E): 404 trước, 403 sau. */
async function requireQuestionAccess(userId: string, questionId: string): Promise<void> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { courseId: true },
  });
  if (!question) throw questionNotFound();
  await assertEnrolled(userId, question.courseId);
}

/** `GET /courses/:id/questions`: mới nhất trước, kèm `isLiked` của người xem. */
export async function listQuestions(
  userId: string,
  courseId: string,
  query: Page,
): Promise<{ items: QuestionDto[]; meta: PaginationMeta }> {
  await assertEnrolledInCourse(userId, courseId);
  const pagination = getPagination(query);
  const [rows, total] = await Promise.all([
    prisma.question.findMany({
      where: { courseId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      select: questionSelect(userId),
    }),
    prisma.question.count({ where: { courseId } }),
  ]);
  return { items: rows.map(toQuestionDto), meta: buildPaginationMeta(total, pagination) };
}

/** `POST /courses/:id/questions` (BR-09): chỉ người đã ghi danh. */
export async function createQuestion(
  userId: string,
  courseId: string,
  content: string,
): Promise<QuestionDto> {
  await assertEnrolledInCourse(userId, courseId);
  const row = await prisma.question.create({
    data: { courseId, userId, content },
    select: questionSelect(userId),
  });
  return toQuestionDto(row);
}

/** `GET /questions/:id`: quyền theo khóa học của câu hỏi. */
export async function getQuestion(userId: string, questionId: string): Promise<QuestionDto> {
  const row = await prisma.question.findUnique({
    where: { id: questionId },
    select: { ...questionSelect(userId), courseId: true },
  });
  if (!row) throw questionNotFound();
  await assertEnrolled(userId, row.courseId);
  return toQuestionDto(row);
}

/** `GET /questions/:id/answers`: cũ -> mới. */
export async function listAnswers(
  userId: string,
  questionId: string,
  query: Page,
): Promise<{ items: AnswerDto[]; meta: PaginationMeta }> {
  await requireQuestionAccess(userId, questionId);
  const pagination = getPagination(query);
  const [rows, total] = await Promise.all([
    prisma.answer.findMany({
      where: { questionId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
      select: answerSelect,
    }),
    prisma.answer.count({ where: { questionId } }),
  ]);
  return { items: rows.map(toAnswerDto), meta: buildPaginationMeta(total, pagination) };
}

/**
 * `POST /questions/:id/answers` (BR-09): tạo câu trả lời, tăng `answerCount` và (nếu người trả lời khác
 * người hỏi) tạo thông báo `NEW_ANSWER` cho người hỏi - tất cả trong 1 transaction.
 */
export function createAnswer(
  userId: string,
  questionId: string,
  content: string,
): Promise<AnswerDto> {
  return prisma.$transaction(async (tx) => {
    const question = await tx.question.findUnique({
      where: { id: questionId },
      select: { id: true, userId: true, courseId: true, course: { select: { title: true } } },
    });
    if (!question) throw questionNotFound();
    await assertEnrolled(userId, question.courseId, tx);

    const answer = await tx.answer.create({
      data: { questionId, userId, content },
      select: answerSelect,
    });
    await tx.question.update({
      where: { id: questionId },
      data: { answerCount: { increment: 1 } },
      select: { id: true },
    });
    if (question.userId !== userId) {
      await notify(tx, {
        userId: question.userId,
        type: 'NEW_ANSWER',
        title: 'New answer to your question',
        body: `${answer.user.fullName} answered your question in "${question.course.title}".`,
        data: { courseId: question.courseId, questionId },
      });
    }
    return toAnswerDto(answer);
  });
}

/** `PUT /questions/:id/like`: idempotent, chỉ tăng `likeCount` khi tạo mới bản ghi. */
export function likeQuestion(userId: string, questionId: string): Promise<LikeStateDto> {
  return prisma.$transaction(async (tx) => {
    const question = await tx.question.findUnique({
      where: { id: questionId },
      select: { courseId: true },
    });
    if (!question) throw questionNotFound();
    await assertEnrolled(userId, question.courseId, tx);

    const { count } = await tx.questionLike.createMany({
      data: [{ userId, questionId }],
      skipDuplicates: true,
    });
    const updated =
      count > 0
        ? await tx.question.update({
            where: { id: questionId },
            data: { likeCount: { increment: 1 } },
            select: { likeCount: true },
          })
        : await tx.question.findUniqueOrThrow({
            where: { id: questionId },
            select: { likeCount: true },
          });
    return { likeCount: updated.likeCount, isLiked: true };
  });
}

/** `DELETE /questions/:id/like`: idempotent, chỉ giảm `likeCount` khi thực sự xóa được bản ghi. */
export function unlikeQuestion(userId: string, questionId: string): Promise<LikeStateDto> {
  return prisma.$transaction(async (tx) => {
    const question = await tx.question.findUnique({
      where: { id: questionId },
      select: { courseId: true },
    });
    if (!question) throw questionNotFound();
    await assertEnrolled(userId, question.courseId, tx);

    const { count } = await tx.questionLike.deleteMany({ where: { userId, questionId } });
    const updated =
      count > 0
        ? await tx.question.update({
            where: { id: questionId },
            data: { likeCount: { decrement: 1 } },
            select: { likeCount: true },
          })
        : await tx.question.findUniqueOrThrow({
            where: { id: questionId },
            select: { likeCount: true },
          });
    return { likeCount: updated.likeCount, isLiked: false };
  });
}
