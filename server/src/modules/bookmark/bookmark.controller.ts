import type { Request, Response } from 'express';

import { noContent, ok } from '@/lib/response';
import { getAuthUser } from '@/middlewares/requireAuth';

import type { CourseIdParams, ListBookmarksQuery } from './bookmark.schema';
import * as bookmarkService from './bookmark.service';

export async function add(req: Request, res: Response): Promise<void> {
  const { id } = req.params as CourseIdParams;
  await bookmarkService.addBookmark(getAuthUser(req).id, id);
  noContent(res);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params as CourseIdParams;
  await bookmarkService.removeBookmark(getAuthUser(req).id, id);
  noContent(res);
}

export async function list(req: Request, res: Response): Promise<void> {
  const { items, meta } = await bookmarkService.listBookmarks(
    getAuthUser(req).id,
    req.query as unknown as ListBookmarksQuery,
  );
  ok(res, items, meta);
}
