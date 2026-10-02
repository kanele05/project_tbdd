import type { Request, Response } from 'express';

import { ok } from '@/lib/response';

import * as tagService from './tag.service';

export async function listHot(_req: Request, res: Response): Promise<void> {
  ok(res, await tagService.listHotTags());
}
