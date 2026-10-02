import type { Request, Response } from 'express';

import type { PaginationQuery } from '@/lib/pagination';
import { created, ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import { getUploadedField } from './project.middleware';
import type { SubmissionInput } from './project.schema';
import * as projectService from './project.service';

export async function detail(req: Request, res: Response): Promise<void> {
  ok(res, await projectService.getProject(String(req.params.id)));
}

export async function listSubmissions(req: Request, res: Response): Promise<void> {
  const { submissions, meta } = await projectService.listSubmissions(
    String(req.params.id),
    req.query as unknown as PaginationQuery,
  );
  ok(res, submissions, meta);
}

export async function createSubmission(req: Request, res: Response): Promise<void> {
  const submission = await projectService.createSubmission(
    getAuthUser(req).id,
    String(req.params.id),
    {
      ...(req.body as SubmissionInput),
      file: getUploadedField(req, 'file'),
      image: getUploadedField(req, 'image'),
    },
  );
  created(res, submission);
}
