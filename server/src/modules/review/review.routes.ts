import { Router } from 'express';

import { optionalAuth, requireAuth } from '@/middlewares/requireAuth';
import { validate } from '@/middlewares/validate';

import * as reviewController from './review.controller';
import { courseIdParams, listReviewsQuery, upsertReviewBody } from './review.schema';

export const router = Router();

// Module gắn ở gốc ('/') nên middleware auth áp dụng TỪNG route (không dùng router.use).
router.get(
  '/courses/:id/reviews',
  optionalAuth,
  validate({ params: courseIdParams, query: listReviewsQuery }),
  reviewController.list,
);
router.get(
  '/courses/:id/reviews/me',
  requireAuth,
  validate({ params: courseIdParams }),
  reviewController.getMine,
);
router.put(
  '/courses/:id/reviews/me',
  requireAuth,
  validate({ params: courseIdParams, body: upsertReviewBody }),
  reviewController.upsertMine,
);
