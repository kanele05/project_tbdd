import type { Request, Response } from 'express';

import { ok } from '@/lib/response';

import * as homeService from './home.service';

export async function get(req: Request, res: Response): Promise<void> {
  ok(res, await homeService.getHome(req.user?.id));
}
