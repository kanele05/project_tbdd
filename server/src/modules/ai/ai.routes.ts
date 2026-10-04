import { Router } from 'express';

import { requireAuth } from '@/middlewares/requireAuth';
import { validate } from '@/middlewares/validate';

import * as aiController from './ai.controller';
import { chatBody, chatHistoryQuery, idParams, langQuery } from './ai.schema';

/**
 * Module gắn ở gốc ('/'), khai báo đầy đủ đường dẫn. Mọi route cần đăng nhập.
 * `lang` (vi|en) lấy từ `?lang=` hoặc header `Accept-Language`, mặc định `en`.
 */
export const router = Router();

router.get(
  '/courses/:id/ai/summary',
  requireAuth,
  validate({ params: idParams, query: langQuery }),
  aiController.courseSummary,
);
router.get(
  '/lessons/:id/ai/summary',
  requireAuth,
  validate({ params: idParams, query: langQuery }),
  aiController.lessonSummary,
);
router.post(
  '/lessons/:id/ai/quiz',
  requireAuth,
  validate({ params: idParams, query: langQuery }),
  aiController.lessonQuiz,
);
router.get(
  '/me/ai/recommendations',
  requireAuth,
  validate({ query: langQuery }),
  aiController.recommendations,
);

router.post(
  '/courses/:id/ai/chat',
  requireAuth,
  validate({ params: idParams, query: langQuery, body: chatBody }),
  aiController.chat,
);
router.get(
  '/courses/:id/ai/chat',
  requireAuth,
  validate({ params: idParams, query: chatHistoryQuery }),
  aiController.chatHistory,
);
router.delete(
  '/courses/:id/ai/chat',
  requireAuth,
  validate({ params: idParams }),
  aiController.clearChat,
);
