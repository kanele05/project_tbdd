import { Router } from 'express';

import { requireAuth } from '@/middlewares/requireAuth';
import { validate } from '@/middlewares/validate';

import * as questionController from './question.controller';
import {
  courseIdParams,
  createAnswerBody,
  createQuestionBody,
  listQuery,
  questionIdParams,
} from './question.schema';

export const router = Router();

// Module gắn ở gốc ('/') nên middleware auth áp dụng TỪNG route (không dùng router.use).
// Quyền "✓E" (đã ghi danh) do service kiểm tra qua assertEnrolled (NFR-06).
router.get(
  '/courses/:id/questions',
  requireAuth,
  validate({ params: courseIdParams, query: listQuery }),
  questionController.listQuestions,
);
router.post(
  '/courses/:id/questions',
  requireAuth,
  validate({ params: courseIdParams, body: createQuestionBody }),
  questionController.createQuestion,
);
router.get(
  '/questions/:id',
  requireAuth,
  validate({ params: questionIdParams }),
  questionController.getQuestion,
);
router.get(
  '/questions/:id/answers',
  requireAuth,
  validate({ params: questionIdParams, query: listQuery }),
  questionController.listAnswers,
);
router.post(
  '/questions/:id/answers',
  requireAuth,
  validate({ params: questionIdParams, body: createAnswerBody }),
  questionController.createAnswer,
);
router.put(
  '/questions/:id/like',
  requireAuth,
  validate({ params: questionIdParams }),
  questionController.like,
);
router.delete(
  '/questions/:id/like',
  requireAuth,
  validate({ params: questionIdParams }),
  questionController.unlike,
);
