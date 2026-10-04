import type { Request, Response } from 'express';

import { AiProviderError, describeAnyError } from '@/lib/ai';
import { openSse } from '@/lib/ai/sse';
import type { AiLang } from '@/lib/ai/types';
import { logger } from '@/lib/logger';
import type { PaginationQuery } from '@/lib/pagination';
import { noContent, ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import * as chatService from './ai.chat.service';
import { resolveLang } from './ai.lang';
import type { ChatBody, IdParams, LangQuery } from './ai.schema';
import * as aiService from './ai.service';

/** `?lang=` -> header `Accept-Language` -> `en`. */
function langOf(req: Request): AiLang {
  const { lang } = req.query as LangQuery;
  return resolveLang(lang, req.headers['accept-language']);
}

export async function courseSummary(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  ok(res, await aiService.getCourseSummary(getAuthUser(req).id, id, langOf(req)));
}

export async function lessonSummary(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  ok(res, await aiService.getLessonSummary(getAuthUser(req).id, id, langOf(req)));
}

export async function lessonQuiz(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  ok(res, await aiService.createLessonQuiz(getAuthUser(req).id, id, langOf(req)));
}

export async function recommendations(req: Request, res: Response): Promise<void> {
  ok(res, await aiService.getRecommendations(getAuthUser(req).id, langOf(req)));
}

/**
 * `POST /courses/:id/ai/chat` - trả lời bằng SSE: `delta {text}` ... `done {messageId}` | `error {code, message}`.
 * Lỗi xảy ra TRƯỚC khi có chữ đầu tiên (chưa ghi danh, hết hạn mức, AI lỗi...) trả JSON lỗi thường
 * (403 / 429 / 503 ...); lỗi SAU khi đã stream được một phần mới gửi sự kiện `error`.
 */
export async function chat(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  const { message } = req.body as ChatBody;

  // Client ngắt kết nối giữa chừng -> hủy request AI đang chạy.
  const abort = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) abort.abort();
  });

  let session: Awaited<ReturnType<typeof chatService.startTutorChat>>;
  try {
    session = await chatService.startTutorChat(
      getAuthUser(req).id,
      id,
      message,
      langOf(req),
      abort.signal,
    );
  } catch (err) {
    if (abort.signal.aborted) return; // client đã rời đi: không còn ai nhận phản hồi lỗi
    throw err;
  }

  const sse = openSse(res);
  try {
    for await (const text of session.chunks) {
      if (!sse.send('delta', { text })) return; // client đã rời đi: không lưu câu trả lời dang dở
    }
    const { messageId } = await session.complete();
    sse.send('done', { messageId });
  } catch (err) {
    if (err instanceof AiProviderError && err.kind === 'aborted') return;
    const info = describeAnyError(err);
    if (info.status >= 500) (req.log ?? logger).error({ err }, 'AI chat stream failed');
    sse.send('error', { code: info.code, message: info.message });
  } finally {
    sse.end();
  }
}

export async function chatHistory(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  const { messages, meta } = await chatService.listChatHistory(
    getAuthUser(req).id,
    id,
    req.query as unknown as PaginationQuery,
  );
  ok(res, messages, meta);
}

export async function clearChat(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  await chatService.clearChatHistory(getAuthUser(req).id, id);
  noContent(res);
}
