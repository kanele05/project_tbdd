import { Router } from 'express';

import { validate } from '@/middlewares/validate';

import * as adminController from './admin.controller';
import {
  disableUserBody,
  idParams,
  listAdminCoursesQuery,
  listAdminUsersQuery,
  moderationReasonBody,
  rejectCourseBody,
} from './admin.schema';

/**
 * Route quản trị /admin/* (TA-03): hàng chờ, chi tiết + diff, duyệt/từ chối, ẩn/khôi phục, người dùng, dashboard.
 * requireAuth + requireRole('ADMIN') đã được gắn ở `src/routes.ts` (mount) - KHÔNG lặp lại ở đây.
 * (`GET /admin/courses/:id/ai-review` thuộc module ai/courseReview, mount trước module này.)
 * Hợp đồng endpoint: notes/teacher-admin-contract.md. DTO: mobile/src/types/api.ts (+ src/types/dto.ts).
 */
export const router = Router();

router.get('/stats', adminController.stats);

router.get('/courses', validate({ query: listAdminCoursesQuery }), adminController.listCourses);
router.get('/courses/:id', validate({ params: idParams }), adminController.courseDetail);
router.post('/courses/:id/approve', validate({ params: idParams }), adminController.approve);
router.post(
  '/courses/:id/reject',
  validate({ params: idParams, body: rejectCourseBody }),
  adminController.reject,
);
router.post(
  '/courses/:id/archive',
  validate({ params: idParams, body: moderationReasonBody }),
  adminController.archive,
);
router.post(
  '/courses/:id/restore',
  validate({ params: idParams, body: moderationReasonBody }),
  adminController.restore,
);

router.get('/users', validate({ query: listAdminUsersQuery }), adminController.listUsers);
router.post(
  '/users/:id/disable',
  validate({ params: idParams, body: disableUserBody }),
  adminController.disableUser,
);
router.post('/users/:id/enable', validate({ params: idParams }), adminController.enableUser);
