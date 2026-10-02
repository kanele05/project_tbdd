import { Router } from 'express';

import { requireAuth } from '@/middlewares/requireAuth';
import { validate } from '@/middlewares/validate';

import * as bookmarkController from './bookmark.controller';
import { courseIdParams, listBookmarksQuery } from './bookmark.schema';

export const router = Router();

// Module gắn ở gốc ('/') nên middleware auth áp dụng TỪNG route (không dùng router.use).
router.put(
  '/courses/:id/bookmark',
  requireAuth,
  validate({ params: courseIdParams }),
  bookmarkController.add,
);
router.delete(
  '/courses/:id/bookmark',
  requireAuth,
  validate({ params: courseIdParams }),
  bookmarkController.remove,
);
router.get(
  '/me/bookmarks',
  requireAuth,
  validate({ query: listBookmarksQuery }),
  bookmarkController.list,
);
