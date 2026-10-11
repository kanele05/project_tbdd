import type { Request, Response } from 'express';

import { ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import type { GradeBody, IdParams, ReplyBody, SubmissionsQuery } from './teaching.schema';
import * as teachingService from './teaching.service';

export async function getCourseStats(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  ok(res, await teachingService.getCourseStats(getAuthUser(req).id, id));
}

export async function listSubmissions(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  const { items, meta } = await teachingService.listSubmissions(
    getAuthUser(req).id,
    id,
    req.query as unknown as SubmissionsQuery,
  );
  ok(res, items, meta);
}

export async function gradeSubmission(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  ok(res, await teachingService.gradeSubmission(getAuthUser(req).id, id, req.body as GradeBody));
}

export async function replyToReview(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  const { reply } = req.body as ReplyBody;
  ok(res, await teachingService.replyToReview(getAuthUser(req).id, id, reply));
}

export async function deleteReviewReply(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  ok(res, await teachingService.deleteReviewReply(getAuthUser(req).id, id));
}

export async function pinAnswer(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  ok(res, await teachingService.setAnswerPinned(getAuthUser(req).id, id, true));
}

export async function unpinAnswer(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  ok(res, await teachingService.setAnswerPinned(getAuthUser(req).id, id, false));
}
