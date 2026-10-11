import { Router } from 'express';

import { validate } from '@/middlewares/validate';

import * as teachingController from './teaching.controller';
import { gradeBody, idParams, replyBody, submissionsQuery } from './teaching.schema';

/**
 * Route giảng viên /teacher/* (TA-04): thống kê, bài nộp + chấm điểm, phản hồi đánh giá, ghim câu trả lời.
 * requireAuth + requireRole đã được gắn ở `src/routes.ts` (mount) - KHÔNG lặp lại ở đây.
 * Hợp đồng endpoint: notes/teacher-admin-contract.md.
 */
export const router = Router();

router.get('/courses/:id/stats', validate({ params: idParams }), teachingController.getCourseStats);
router.get(
  '/courses/:id/submissions',
  validate({ params: idParams, query: submissionsQuery }),
  teachingController.listSubmissions,
);
router.put(
  '/submissions/:id/grade',
  validate({ params: idParams, body: gradeBody }),
  teachingController.gradeSubmission,
);
router.put(
  '/reviews/:id/reply',
  validate({ params: idParams, body: replyBody }),
  teachingController.replyToReview,
);
router.delete(
  '/reviews/:id/reply',
  validate({ params: idParams }),
  teachingController.deleteReviewReply,
);
router.put('/answers/:id/pin', validate({ params: idParams }), teachingController.pinAnswer);
router.delete('/answers/:id/pin', validate({ params: idParams }), teachingController.unpinAnswer);
