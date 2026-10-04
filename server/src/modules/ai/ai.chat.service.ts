import { getAiProvider } from '@/lib/ai';
import { AiProviderError } from '@/lib/ai/errors';
import type { AiLang, AiMessage } from '@/lib/ai/types';
import { assertEnrolledInCourse } from '@/lib/enrollmentGuard';
import { buildPaginationMeta, getPagination, type PaginationMeta } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import type { AiChatMessageDto } from '@/types/dto';

import { mockTutorReply } from './ai.mock';
import { buildTutorSystem } from './ai.prompts';
import { loadCourseMaterial, runAi } from './ai.service';

/** Số tin nhắn gần nhất của user trong khóa được đưa vào ngữ cảnh mỗi lượt hỏi. */
export const CHAT_HISTORY_CONTEXT = 10;

export type TutorChatSession = {
  /**
   * Các đoạn chữ của câu trả lời. Đoạn đầu tiên đã nhận được trước khi trả session nên mọi lỗi mở stream
   * (429 / 422 / 503) đã được ném khỏi `startTutorChat` dưới dạng `ApiError`; lỗi giữa chừng ném khi duyệt.
   */
  chunks: AsyncGenerator<string>;
  /** Lưu cặp tin (user + assistant) vào lịch sử và trả id tin trả lời. Chỉ gọi khi `chunks` đã chạy hết. */
  complete(): Promise<{ messageId: string }>;
};

function toMessageDto(row: {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: Date;
}): AiChatMessageDto {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadRecentMessages(userId: string, courseId: string): Promise<AiMessage[]> {
  const rows = await prisma.aiChatMessage.findMany({
    where: { userId, courseId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: CHAT_HISTORY_CONTEXT,
    select: { role: true, content: true },
  });
  return rows
    .reverse()
    .map((row) => ({ role: row.role === 'USER' ? 'user' : 'assistant', text: row.content }));
}

/**
 * `POST /courses/:id/ai/chat` (✓E): kiểm tra ghi danh, trừ lượt rate limit, dựng ngữ cảnh (nội dung khóa +
 * 10 tin gần nhất), mở stream từ AI và chờ đoạn đầu tiên. Tin nhắn chỉ được lưu khi trả lời hoàn tất,
 * nên câu hỏi thất bại / bị ngắt giữa chừng không để lại tin "mồ côi" trong lịch sử.
 */
export async function startTutorChat(
  userId: string,
  courseId: string,
  message: string,
  lang: AiLang,
  signal?: AbortSignal,
): Promise<TutorChatSession> {
  await assertEnrolledInCourse(userId, courseId);
  const [course, history] = await Promise.all([
    loadCourseMaterial(courseId),
    loadRecentMessages(userId, courseId),
  ]);
  const askedAt = new Date();

  const opened = await runAi(userId, 'chat', async () => {
    const iterator = getAiProvider()
      .streamText({
        label: 'tutor_chat',
        system: buildTutorSystem(course, lang),
        history,
        prompt: message,
        signal,
        mock: () => mockTutorReply(message, course, lang),
      })
      [Symbol.asyncIterator]();
    const first = await iterator.next();
    if (first.done) throw new AiProviderError('bad_output', 'Empty response from model');
    return { iterator, first: first.value };
  });

  let answer = opened.first;
  async function* chunks(): AsyncGenerator<string> {
    try {
      yield opened.first;
      for (;;) {
        const next = await opened.iterator.next();
        if (next.done) return;
        answer += next.value;
        yield next.value;
      }
    } finally {
      await opened.iterator.return?.();
    }
  }

  return {
    chunks: chunks(),
    async complete() {
      const answeredAt = new Date(Math.max(Date.now(), askedAt.getTime() + 1));
      const [, reply] = await prisma.$transaction([
        prisma.aiChatMessage.create({
          data: { userId, courseId, role: 'USER', content: message, createdAt: askedAt },
          select: { id: true },
        }),
        prisma.aiChatMessage.create({
          data: { userId, courseId, role: 'ASSISTANT', content: answer, createdAt: answeredAt },
          select: { id: true },
        }),
      ]);
      return { messageId: reply.id };
    },
  };
}

export type ChatHistoryResult = { messages: AiChatMessageDto[]; meta: PaginationMeta };

/** `GET /courses/:id/ai/chat` (✓E): lịch sử của chính user, MỚI NHẤT TRƯỚC, phân trang. */
export async function listChatHistory(
  userId: string,
  courseId: string,
  query: { page?: number; limit?: number },
): Promise<ChatHistoryResult> {
  await assertEnrolledInCourse(userId, courseId);
  const pagination = getPagination(query);
  const where = { userId, courseId };
  const [total, rows] = await Promise.all([
    prisma.aiChatMessage.count({ where }),
    prisma.aiChatMessage.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      select: { id: true, role: true, content: true, createdAt: true },
    }),
  ]);
  return { messages: rows.map(toMessageDto), meta: buildPaginationMeta(total, pagination) };
}

/** `DELETE /courses/:id/ai/chat` (✓E): xóa toàn bộ lịch sử trò chuyện AI của user trong khóa này. */
export async function clearChatHistory(userId: string, courseId: string): Promise<void> {
  await assertEnrolledInCourse(userId, courseId);
  await prisma.aiChatMessage.deleteMany({ where: { userId, courseId } });
}
