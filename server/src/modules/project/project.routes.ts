import { Router } from 'express';

import { requireAuth } from '@/middlewares/requireAuth';
import { createUpload } from '@/middlewares/upload';
import { validate } from '@/middlewares/validate';

import * as projectController from './project.controller';
import { discardUploadsOnError, requireEnrolled } from './project.middleware';
import { courseIdParams, listSubmissionsQuery, submissionBody } from './project.schema';

/** Gắn ở gốc `/` vì mọi đường dẫn nằm dưới `/courses/:id/...` (cùng nhóm với module khác). */
export const router = Router();

// multipart: `file` (bắt buộc, <= 10 MB, png/jpg/pdf/zip/txt) và `image` (tùy chọn, ảnh bìa).
const submissionUpload = createUpload().fields([
  { name: 'file', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

router.get(
  '/courses/:id/project',
  requireAuth,
  validate({ params: courseIdParams }),
  requireEnrolled,
  projectController.detail,
);
router.get(
  '/courses/:id/submissions',
  requireAuth,
  validate({ params: courseIdParams, query: listSubmissionsQuery }),
  requireEnrolled,
  projectController.listSubmissions,
);
// Kiểm tra đăng nhập + ghi danh TRƯỚC multer để người không đủ quyền không ghi được file lên đĩa.
router.post(
  '/courses/:id/submissions',
  requireAuth,
  validate({ params: courseIdParams }),
  requireEnrolled,
  submissionUpload,
  validate({ body: submissionBody }),
  projectController.createSubmission,
);
router.use(discardUploadsOnError);
