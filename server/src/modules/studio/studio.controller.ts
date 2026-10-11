// Controller Studio (chỉ xử lý req/res, gọi service). Quyền: requireAuth + requireRole đã gắn ở mount.
import type { Request, Response } from 'express';

import { ApiError } from '@/lib/ApiError';
import { created, noContent, ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';
import { uploadedFileUrl } from '@/middlewares/upload';

import type {
  CourseRevisionBody,
  CreateCourseInput,
  CreateLessonInput,
  ListCoursesQuery,
  ReorderInput,
  SectionInput,
  UpdateCourseInput,
  UpdateLessonInput,
} from './studio.schema';
import * as courses from './studio.service';
import * as curriculum from './studioCurriculum.service';
import * as revisions from './studioRevision.service';
import * as workflow from './studioWorkflow.service';

const userId = (req: Request): string => getAuthUser(req).id;
const idOf = (req: Request): string => String(req.params.id);

export async function list(req: Request, res: Response): Promise<void> {
  const { items, meta } = await courses.listMyCourses(
    userId(req),
    req.query as unknown as ListCoursesQuery,
  );
  ok(res, items, meta);
}

export async function create(req: Request, res: Response): Promise<void> {
  created(res, await courses.createDraftCourse(userId(req), req.body as CreateCourseInput));
}

export async function detail(req: Request, res: Response): Promise<void> {
  ok(res, await courses.getMyCourse(userId(req), idOf(req)));
}

export async function update(req: Request, res: Response): Promise<void> {
  ok(res, await courses.updateMyCourse(userId(req), idOf(req), req.body as UpdateCourseInput));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await courses.deleteMyCourse(userId(req), idOf(req));
  noContent(res);
}

export async function addSection(req: Request, res: Response): Promise<void> {
  created(res, await curriculum.createSection(userId(req), idOf(req), req.body as SectionInput));
}

export async function editSection(req: Request, res: Response): Promise<void> {
  ok(res, await curriculum.updateSection(userId(req), idOf(req), req.body as SectionInput));
}

export async function removeSection(req: Request, res: Response): Promise<void> {
  await curriculum.deleteSection(userId(req), idOf(req));
  noContent(res);
}

export async function addLesson(req: Request, res: Response): Promise<void> {
  created(
    res,
    await curriculum.createLesson(userId(req), idOf(req), req.body as CreateLessonInput),
  );
}

export async function editLesson(req: Request, res: Response): Promise<void> {
  ok(res, await curriculum.updateLesson(userId(req), idOf(req), req.body as UpdateLessonInput));
}

export async function removeLesson(req: Request, res: Response): Promise<void> {
  await curriculum.deleteLesson(userId(req), idOf(req));
  noContent(res);
}

export async function reorder(req: Request, res: Response): Promise<void> {
  ok(res, await curriculum.reorderCurriculum(userId(req), idOf(req), req.body as ReorderInput));
}

export async function submit(req: Request, res: Response): Promise<void> {
  ok(res, await workflow.submitCourse(userId(req), idOf(req)));
}

export async function withdraw(req: Request, res: Response): Promise<void> {
  ok(res, await workflow.withdrawCourse(userId(req), idOf(req)));
}

export async function archive(req: Request, res: Response): Promise<void> {
  ok(res, await workflow.archiveCourse(userId(req), idOf(req)));
}

export async function restore(req: Request, res: Response): Promise<void> {
  ok(res, await workflow.restoreCourse(userId(req), idOf(req)));
}

export async function openRevision(req: Request, res: Response): Promise<void> {
  created(res, await revisions.createRevision(userId(req), idOf(req)));
}

export async function putRevision(req: Request, res: Response): Promise<void> {
  ok(res, await revisions.saveRevision(userId(req), idOf(req), req.body as CourseRevisionBody));
}

export async function submitRevision(req: Request, res: Response): Promise<void> {
  ok(res, await revisions.submitRevision(userId(req), idOf(req)));
}

export async function removeRevision(req: Request, res: Response): Promise<void> {
  await revisions.deleteRevision(userId(req), idOf(req));
  noContent(res);
}

export function uploadImage(req: Request, res: Response): void {
  if (!req.file) {
    throw ApiError.badRequest('An image file is required', [
      { source: 'body', field: 'file', message: 'File is required' },
    ]);
  }
  created(res, { url: uploadedFileUrl(req.file.filename, 'courses') });
}
