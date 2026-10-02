import type { Request, Response } from 'express';

import { ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import type { CourseIdParams, ListReviewsQuery, UpsertReviewBody } from './review.schema';
import * as reviewService from './review.service';

export async function list(req: Request, res: Response): Promise<void> {
  const { id } = req.params as CourseIdParams;
  const { items, meta } = await reviewService.listReviews(
    id,
    req.query as unknown as ListReviewsQuery,
  );
  ok(res, items, meta);
}

export async function getMine(req: Request, res: Response): Promise<void> {
  const { id } = req.params as CourseIdParams;
  ok(res, await reviewService.getMyReview(getAuthUser(req).id, id));
}

export async function upsertMine(req: Request, res: Response): Promise<void> {
  const { id } = req.params as CourseIdParams;
  ok(
    res,
    await reviewService.upsertMyReview(getAuthUser(req).id, id, req.body as UpsertReviewBody),
  );
}
