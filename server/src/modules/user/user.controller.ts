import type { Request, Response } from 'express';

import { ApiError } from '@/lib/ApiError';
import { ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import type { UpdateMeInput } from './user.schema';
import * as userService from './user.service';

export async function stats(req: Request, res: Response): Promise<void> {
  ok(res, await userService.getMyStats(getAuthUser(req).id));
}

export async function update(req: Request, res: Response): Promise<void> {
  ok(res, await userService.updateMe(getAuthUser(req).id, req.body as UpdateMeInput));
}

export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw ApiError.badRequest('An image file is required', [
      { source: 'body', field: 'file', message: 'File is required' },
    ]);
  }
  ok(res, await userService.updateAvatar(getAuthUser(req).id, req.file.filename));
}
