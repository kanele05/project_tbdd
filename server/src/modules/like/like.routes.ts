import { Router } from 'express';

import { requireAuth } from '@/middlewares/requireAuth';
import { validate } from '@/middlewares/validate';

import * as likeController from './like.controller';
import { courseIdParams } from './like.schema';

export const router = Router();

// Module gắn ở gốc ('/') nên middleware auth áp dụng TỪNG route (không dùng router.use).
router.put(
  '/courses/:id/like',
  requireAuth,
  validate({ params: courseIdParams }),
  likeController.like,
);
router.delete(
  '/courses/:id/like',
  requireAuth,
  validate({ params: courseIdParams }),
  likeController.unlike,
);
router.post(
  '/courses/:id/share',
  requireAuth,
  validate({ params: courseIdParams }),
  likeController.share,
);
