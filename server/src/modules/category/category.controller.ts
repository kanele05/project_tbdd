import type { Request, Response } from 'express';

import { ok } from '@/lib/response';

import * as categoryService from './category.service';

export async function list(_req: Request, res: Response): Promise<void> {
  ok(res, await categoryService.listCategories());
}
