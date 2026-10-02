import type { Prisma } from '@/generated/prisma/client';
import { toUserRef, userRefSelect } from '@/lib/mappers';
import type { AnswerDto, QuestionDto } from '@/types/dto';

/**
 * `select` của câu hỏi cho người dùng `userId`: `likes` chỉ lấy dòng của chính họ (tối đa 1) để suy ra
 * `isLiked` trong CÙNG query (không N+1).
 */
export function questionSelect(userId: string) {
  return {
    id: true,
    content: true,
    createdAt: true,
    likeCount: true,
    answerCount: true,
    user: { select: userRefSelect },
    likes: { where: { userId }, select: { userId: true }, take: 1 },
  } satisfies Prisma.QuestionSelect;
}

export type QuestionRow = Prisma.QuestionGetPayload<{
  select: ReturnType<typeof questionSelect>;
}>;

export function toQuestionDto(row: QuestionRow): QuestionDto {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    likeCount: row.likeCount,
    answerCount: row.answerCount,
    isLiked: row.likes.length > 0,
    user: toUserRef(row.user),
  };
}

export const answerSelect = {
  id: true,
  content: true,
  createdAt: true,
  user: { select: userRefSelect },
} satisfies Prisma.AnswerSelect;

export type AnswerRow = Prisma.AnswerGetPayload<{ select: typeof answerSelect }>;

export function toAnswerDto(row: AnswerRow): AnswerDto {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    user: toUserRef(row.user),
  };
}
