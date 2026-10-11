import { Router } from 'express';

import { validate } from '@/middlewares/validate';

import { idParams, langQuery } from './ai.schema';
import * as courseAiController from './courseAi.controller';

/**
 * Route /admin/courses/* của AI (TA-05): GET /admin/courses/:id/ai-review (AI kiểm duyệt sơ bộ, FR-51).
 * requireAuth + requireRole('ADMIN') đã được gắn ở `src/routes.ts` (mount) - KHÔNG lặp lại ở đây.
 * Hợp đồng endpoint: notes/teacher-admin-contract.md §4.
 */
export const router = Router();

router.get(
  '/:id/ai-review',
  validate({ params: idParams, query: langQuery }),
  courseAiController.courseReview,
);
