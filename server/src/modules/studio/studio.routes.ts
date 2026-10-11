import { Router } from 'express';
import type { ZodType } from 'zod';

import { createUpload, IMAGE_MIME_TYPES } from '@/middlewares/upload';
import { validate } from '@/middlewares/validate';

import * as controller from './studio.controller';
import {
  createCourseBody,
  createLessonBody,
  idParams,
  listCoursesQuery,
  reorderBody,
  revisionBody,
  sectionBody,
  updateCourseBody,
  updateLessonBody,
} from './studio.schema';

/**
 * Route giảng viên /teacher/* (TA-02): khóa, chương, bài, luồng duyệt, bản sửa đổi, upload ảnh bìa.
 * requireAuth + requireRole đã được gắn ở `src/routes.ts` (mount) - KHÔNG lặp lại ở đây.
 * Hợp đồng endpoint: notes/teacher-admin-contract.md. DTO: mobile/src/types/api.ts (+ src/types/dto.ts).
 */
export const router = Router();

const COVER_MAX_BYTES = 5 * 1024 * 1024;
const coverUpload = createUpload({
  maxSizeBytes: COVER_MAX_BYTES,
  allowedMimeTypes: IMAGE_MIME_TYPES,
  subDir: 'courses',
}).single('file');
const params = validate({ params: idParams });
const withBody = (body: ZodType) => validate({ params: idParams, body });

// Khóa học
router.get('/courses', validate({ query: listCoursesQuery }), controller.list);
router.post('/courses', validate({ body: createCourseBody }), controller.create);
router.get('/courses/:id', params, controller.detail);
router.patch('/courses/:id', withBody(updateCourseBody), controller.update);
router.delete('/courses/:id', params, controller.remove);

// Chương / bài
router.post('/courses/:id/sections', withBody(sectionBody), controller.addSection);
router.patch('/sections/:id', withBody(sectionBody), controller.editSection);
router.delete('/sections/:id', params, controller.removeSection);
router.post('/sections/:id/lessons', withBody(createLessonBody), controller.addLesson);
router.patch('/lessons/:id', withBody(updateLessonBody), controller.editLesson);
router.delete('/lessons/:id', params, controller.removeLesson);
router.post('/courses/:id/reorder', withBody(reorderBody), controller.reorder);

// Luồng duyệt
router.post('/courses/:id/submit', params, controller.submit);
router.post('/courses/:id/withdraw', params, controller.withdraw);
router.post('/courses/:id/archive', params, controller.archive);
router.post('/courses/:id/restore', params, controller.restore);

// Bản sửa đổi
router.post('/courses/:id/revision', params, controller.openRevision);
router.put('/courses/:id/revision', withBody(revisionBody), controller.putRevision);
router.post('/courses/:id/revision/submit', params, controller.submitRevision);
router.delete('/courses/:id/revision', params, controller.removeRevision);

// Ảnh bìa (requireAuth + requireRole đã chạy ở mount, trước multer)
router.post('/uploads/image', coverUpload, controller.uploadImage);
