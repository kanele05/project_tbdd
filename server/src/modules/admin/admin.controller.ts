// Controller (chỉ xử lý req/res, gọi service).
import type { Request, Response } from 'express';

import { ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import type { ListAdminCoursesQuery, ListAdminUsersQuery } from './admin.schema';
import * as adminService from './admin.service';

const idOf = (req: Request): string => String(req.params.id);

export async function stats(_req: Request, res: Response): Promise<void> {
  ok(res, await adminService.getAdminStats());
}

export async function listCourses(req: Request, res: Response): Promise<void> {
  const { items, meta } = await adminService.listAdminCourses(
    req.query as unknown as ListAdminCoursesQuery,
  );
  ok(res, items, meta);
}

export async function courseDetail(req: Request, res: Response): Promise<void> {
  ok(res, await adminService.getAdminCourseDetail(idOf(req)));
}

export async function approve(req: Request, res: Response): Promise<void> {
  ok(res, await adminService.approveCourse(idOf(req), getAuthUser(req).id));
}

export async function reject(req: Request, res: Response): Promise<void> {
  const { reason } = req.body as { reason: string };
  ok(res, await adminService.rejectCourse(idOf(req), getAuthUser(req).id, reason));
}

export async function archive(req: Request, res: Response): Promise<void> {
  const { reason } = req.body as { reason?: string };
  ok(res, await adminService.archiveCourse(idOf(req), getAuthUser(req).id, reason));
}

export async function restore(req: Request, res: Response): Promise<void> {
  const { reason } = req.body as { reason?: string };
  ok(res, await adminService.restoreCourse(idOf(req), getAuthUser(req).id, reason));
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const { users, meta } = await adminService.listAdminUsers(
    req.query as unknown as ListAdminUsersQuery,
  );
  ok(res, users, meta);
}

export async function disableUser(req: Request, res: Response): Promise<void> {
  const { reason } = req.body as { reason: string };
  ok(res, await adminService.disableAdminUser(idOf(req), reason, getAuthUser(req).id));
}

export async function enableUser(req: Request, res: Response): Promise<void> {
  ok(res, await adminService.enableAdminUser(idOf(req), getAuthUser(req).id));
}
