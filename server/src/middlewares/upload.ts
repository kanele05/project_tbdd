import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import multer, { type FileFilterCallback } from 'multer';

import { paths } from '@/config/env';
import { ApiError } from '@/lib/ApiError';
import { toAbsoluteUrl } from '@/lib/url';

/** Giới hạn upload mặc định (CLAUDE.md §8): 10 MB. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Whitelist MIME (png, jpg, pdf, zip, txt) -> phần mở rộng an toàn để lưu tên file. */
const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'application/pdf': '.pdf',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'text/plain': '.txt',
};

export const ALLOWED_MIME_TYPES = Object.keys(MIME_TO_EXT);
export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg'];

export type UploadOptions = {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  /** Thư mục con của `UPLOAD_DIR` (vd. `courses` -> `/uploads/courses/<tên file>`); chỉ chữ thường, số, `-`, `_`. */
  subDir?: string;
};

/**
 * Tạo middleware multer lưu file vào `UPLOAD_DIR` (mặc định `uploads/`), tên file ngẫu nhiên.
 * Dùng: `upload.single('file')`, hoặc `createUpload({ maxSizeBytes: 5 * 1024 * 1024, allowedMimeTypes: IMAGE_MIME_TYPES })`
 * cho avatar. Quá dung lượng -> 413 `FILE_TOO_LARGE`; sai loại -> 415 `UNSUPPORTED_FILE_TYPE`.
 */
export function createUpload(options: UploadOptions = {}): multer.Multer {
  const {
    maxSizeBytes = MAX_UPLOAD_BYTES,
    allowedMimeTypes = ALLOWED_MIME_TYPES,
    subDir,
  } = options;
  if (subDir !== undefined && !/^[a-z0-9_-]+$/.test(subDir)) {
    throw new Error(`Invalid upload subDir "${subDir}"`);
  }
  const destination = subDir ? path.join(paths.uploads, subDir) : paths.uploads;

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(destination, { recursive: true });
      cb(null, destination);
    },
    filename: (_req, file, cb) => {
      const ext = MIME_TO_EXT[file.mimetype] ?? path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${randomUUID()}${ext}`);
    },
  });

  const fileFilter = (_req: unknown, file: Express.Multer.File, cb: FileFilterCallback): void => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'This file type is not supported'));
  };

  return multer({ storage, fileFilter, limits: { fileSize: maxSizeBytes, files: 5 } });
}

/** Instance mặc định: ≤ 10 MB, whitelist png/jpg/pdf/zip/txt. */
export const upload = createUpload();

/** URL tuyệt đối của file vừa upload (`req.file.filename`); `subDir` trùng với option của `createUpload`. */
export function uploadedFileUrl(filename: string, subDir?: string): string {
  return toAbsoluteUrl(`/uploads/${subDir ? `${subDir}/` : ''}${filename}`);
}
