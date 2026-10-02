import { Router } from 'express';

import { paginationQuery } from '@/lib/pagination';
import { optionalAuth, requireAuth } from '@/middlewares/requireAuth';
import { validate } from '@/middlewares/validate';

import * as teacherController from './teacher.controller';
import { listTeachersQuery, teacherIdParams } from './teacher.schema';

export const router = Router();

router.get('/', validate({ query: listTeachersQuery }), teacherController.list);
router.get('/:id', optionalAuth, validate({ params: teacherIdParams }), teacherController.detail);
router.get(
  '/:id/courses',
  optionalAuth,
  validate({ params: teacherIdParams }),
  teacherController.courses,
);
router.get(
  '/:id/reviews',
  validate({ params: teacherIdParams, query: paginationQuery }),
  teacherController.reviews,
);
router.put(
  '/:id/follow',
  requireAuth,
  validate({ params: teacherIdParams }),
  teacherController.follow,
);
router.delete(
  '/:id/follow',
  requireAuth,
  validate({ params: teacherIdParams }),
  teacherController.unfollow,
);
