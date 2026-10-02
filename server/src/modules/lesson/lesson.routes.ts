import { Router } from 'express';

import { optionalAuth, requireAuth } from '@/middlewares/requireAuth';
import { validate } from '@/middlewares/validate';

import * as lessonController from './lesson.controller';
import { courseIdParams, lessonIdParams, saveProgressBody } from './lesson.schema';

export const router = Router();

// Module gắn ở gốc ('/') nên middleware auth áp dụng TỪNG route (không dùng router.use).
router.get(
  '/courses/:id/curriculum',
  optionalAuth,
  validate({ params: courseIdParams }),
  lessonController.curriculum,
);
router.get(
  '/lessons/:id',
  requireAuth,
  validate({ params: lessonIdParams }),
  lessonController.detail,
);
router.put(
  '/lessons/:id/progress',
  requireAuth,
  validate({ params: lessonIdParams, body: saveProgressBody }),
  lessonController.saveProgress,
);
