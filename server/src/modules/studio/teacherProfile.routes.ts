import { Router } from 'express';

import { validate } from '@/middlewares/validate';

import { teacherProfileBody } from './studio.schema';
import * as controller from './teacherProfile.controller';

/**
 * Route /me/teacher-profile (TA-02): GET/PATCH hồ sơ giảng viên (FR-49).
 * requireAuth + requireRole đã được gắn ở `src/routes.ts` (mount) - KHÔNG lặp lại ở đây.
 * Hợp đồng endpoint: notes/teacher-admin-contract.md. DTO: mobile/src/types/api.ts (+ src/types/dto.ts).
 */
export const router = Router();

router.get('/', controller.get);
router.patch('/', validate({ body: teacherProfileBody }), controller.update);
