import { Router } from 'express';

import { requireAuth } from '@/middlewares/requireAuth';
import { createUpload, IMAGE_MIME_TYPES } from '@/middlewares/upload';
import { validate } from '@/middlewares/validate';

import * as userController from './user.controller';
import { AVATAR_MAX_BYTES, updateMeBody } from './user.schema';

/**
 * Gắn ở `/me` (chỉ các đường dẫn của module này: `/me`, `/me/stats`, `/me/avatar`).
 * `/me/bookmarks`, `/me/courses` thuộc module khác và được gắn riêng.
 */
export const router = Router();

const avatarUpload = createUpload({
  maxSizeBytes: AVATAR_MAX_BYTES,
  allowedMimeTypes: IMAGE_MIME_TYPES,
}).single('file');

router.get('/stats', requireAuth, userController.stats);
router.patch('/', requireAuth, validate({ body: updateMeBody }), userController.update);
// requireAuth chạy TRƯỚC multer để người chưa đăng nhập không ghi được file lên đĩa.
router.post('/avatar', requireAuth, avatarUpload, userController.uploadAvatar);
