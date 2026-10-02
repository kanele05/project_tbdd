import type { Request, Response } from 'express';

import { ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import type { CourseIdParams, LessonIdParams, SaveProgressBody } from './lesson.schema';
import * as lessonService from './lesson.service';

export async function curriculum(req: Request, res: Response): Promise<void> {
  const { id } = req.params as CourseIdParams;
  ok(res, await lessonService.getCurriculum(id, req.user?.id));
}

export async function detail(req: Request, res: Response): Promise<void> {
  const { id } = req.params as LessonIdParams;
  ok(res, await lessonService.getLesson(getAuthUser(req).id, id));
}

export async function saveProgress(req: Request, res: Response): Promise<void> {
  const { id } = req.params as LessonIdParams;
  ok(res, await lessonService.saveProgress(getAuthUser(req).id, id, req.body as SaveProgressBody));
}
