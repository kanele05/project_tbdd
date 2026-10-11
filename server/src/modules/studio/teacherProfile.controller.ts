// Controller hồ sơ giảng viên của chính mình (chỉ xử lý req/res).
import type { Request, Response } from 'express';

import { ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import type { TeacherProfileBody } from './studio.schema';
import * as profileService from './teacherProfile.service';

export async function get(req: Request, res: Response): Promise<void> {
  ok(res, await profileService.getMyTeacherProfile(getAuthUser(req).id));
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = req.body as TeacherProfileBody;
  ok(res, await profileService.updateMyTeacherProfile(getAuthUser(req).id, body));
}
