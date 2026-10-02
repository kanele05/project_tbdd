import { Router } from 'express';

import { optionalAuth } from '@/middlewares/requireAuth';
import { validate } from '@/middlewares/validate';

import * as courseController from './course.controller';
import { courseIdParams, listCoursesQuery } from './course.schema';

export const router = Router();

router.get('/', optionalAuth, validate({ query: listCoursesQuery }), courseController.list);
router.get('/:id', optionalAuth, validate({ params: courseIdParams }), courseController.detail);
router.get(
  '/:id/similar',
  optionalAuth,
  validate({ params: courseIdParams }),
  courseController.similar,
);
