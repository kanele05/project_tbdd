import type { Request, Response } from 'express';

import { ok } from '@/lib/response';

import type { ListCoursesQuery } from './course.schema';
import * as courseService from './course.service';

export async function list(req: Request, res: Response): Promise<void> {
  const { courses, meta } = await courseService.listCourses(
    req.query as unknown as ListCoursesQuery,
    req.user?.id,
  );
  ok(res, courses, meta);
}

export async function detail(req: Request, res: Response): Promise<void> {
  ok(res, await courseService.getCourseDetail(String(req.params.id), req.user?.id, req.user?.role));
}

export async function similar(req: Request, res: Response): Promise<void> {
  ok(
    res,
    await courseService.getSimilarCourses(String(req.params.id), req.user?.id, req.user?.role),
  );
}
