import type { Request, Response } from 'express';

import { ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import type { MyCoursesQuery } from './enrollment.schema';
import * as enrollmentService from './enrollment.service';

export async function listMine(req: Request, res: Response): Promise<void> {
  const { status } = req.query as unknown as MyCoursesQuery;
  ok(res, await enrollmentService.listMyCourses(getAuthUser(req).id, status));
}
