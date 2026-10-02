import type { Request, Response } from 'express';

import { ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import type { CourseIdParams } from './like.schema';
import * as likeService from './like.service';

export async function like(req: Request, res: Response): Promise<void> {
  const { id } = req.params as CourseIdParams;
  ok(res, await likeService.likeCourse(getAuthUser(req).id, id));
}

export async function unlike(req: Request, res: Response): Promise<void> {
  const { id } = req.params as CourseIdParams;
  ok(res, await likeService.unlikeCourse(getAuthUser(req).id, id));
}

export async function share(req: Request, res: Response): Promise<void> {
  const { id } = req.params as CourseIdParams;
  ok(res, await likeService.shareCourse(id));
}
