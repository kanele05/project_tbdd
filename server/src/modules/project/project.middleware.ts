import fs from 'node:fs/promises';

import type { ErrorRequestHandler, Request, RequestHandler } from 'express';

import { assertEnrolledInCourse } from '@/lib/enrollmentGuard';
import { getAuthUser } from '@/middlewares/requireAuth';

/** "✓E": phải đã ghi danh; khóa không tồn tại -> 404 `COURSE_NOT_FOUND`, chưa ghi danh -> 403 `NOT_ENROLLED`. */
export const requireEnrolled: RequestHandler = async (req, _res, next) => {
  await assertEnrolledInCourse(getAuthUser(req).id, String(req.params.id));
  next();
};

/** Mọi file multer đã lưu cho request (`single` / `array` / `fields`). */
function uploadedFiles(req: Request): Express.Multer.File[] {
  const files = req.files;
  if (!files) return [];
  return Array.isArray(files) ? files : Object.values(files).flat();
}

/**
 * Lỗi xảy ra SAU khi multer đã ghi file (vd. thiếu `title`, ảnh bìa sai loại) -> xóa file mồ côi
 * khỏi `uploads/` rồi chuyển lỗi cho `errorHandler`.
 */
export const discardUploadsOnError: ErrorRequestHandler = async (err, req, _res, next) => {
  await Promise.all(uploadedFiles(req).map((file) => fs.rm(file.path, { force: true })));
  next(err);
};

/** `req.files` dạng `fields` -> từng trường (tối đa 1 file mỗi trường). */
export function getUploadedField(req: Request, field: string): Express.Multer.File | undefined {
  const files = req.files;
  if (!files || Array.isArray(files)) return undefined;
  return files[field]?.[0];
}
