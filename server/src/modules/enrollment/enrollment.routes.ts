import { Router } from 'express';

import { requireAuth } from '@/middlewares/requireAuth';
import { validate } from '@/middlewares/validate';

import * as enrollmentController from './enrollment.controller';
import { myCoursesQuery } from './enrollment.schema';

export const router = Router();

// Module gắn ở gốc ('/') nên middleware auth áp dụng TỪNG route (không dùng router.use).
router.get(
  '/me/courses',
  requireAuth,
  validate({ query: myCoursesQuery }),
  enrollmentController.listMine,
);
