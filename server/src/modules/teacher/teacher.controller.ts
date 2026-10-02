import type { Request, Response } from 'express';

import type { PaginationQuery } from '@/lib/pagination';
import { ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import type { ListTeachersQuery } from './teacher.schema';
import * as teacherService from './teacher.service';

export async function list(req: Request, res: Response): Promise<void> {
  const { teachers, meta } = await teacherService.listTeachers(
    req.query as unknown as ListTeachersQuery,
  );
  ok(res, teachers, meta);
}

export async function detail(req: Request, res: Response): Promise<void> {
  ok(res, await teacherService.getTeacherDetail(String(req.params.id), req.user?.id));
}

export async function courses(req: Request, res: Response): Promise<void> {
  ok(res, await teacherService.getTeacherCourses(String(req.params.id), req.user?.id));
}

export async function reviews(req: Request, res: Response): Promise<void> {
  const result = await teacherService.listTeacherReviews(
    String(req.params.id),
    req.query as unknown as PaginationQuery,
  );
  ok(res, result.reviews, result.meta);
}

export async function follow(req: Request, res: Response): Promise<void> {
  ok(res, await teacherService.followTeacher(getAuthUser(req).id, String(req.params.id)));
}

export async function unfollow(req: Request, res: Response): Promise<void> {
  ok(res, await teacherService.unfollowTeacher(getAuthUser(req).id, String(req.params.id)));
}
