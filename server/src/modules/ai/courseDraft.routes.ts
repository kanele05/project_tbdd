import { Router } from 'express';

import { validate } from '@/middlewares/validate';

import * as courseAiController from './courseAi.controller';
import { draftBody } from './courseAi.schema';

/**
 * Route /teacher/ai/* (TA-05): POST /teacher/ai/course-draft (AI soạn khóa, FR-44).
 * requireAuth + requireRole('TEACHER') đã được gắn ở `src/routes.ts` (mount) - KHÔNG lặp lại ở đây.
 * Hợp đồng endpoint: notes/teacher-admin-contract.md §4.
 */
export const router = Router();

router.post('/course-draft', validate({ body: draftBody }), courseAiController.courseDraft);
