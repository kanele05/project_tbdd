import type { Request, Response } from 'express';

import { ok } from '@/lib/response';

import * as healthService from './health.service';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const health = await healthService.checkHealth();
  if (health.status === 'ok') {
    ok(res, health);
    return;
  }
  // DB không phản hồi: 503 nhưng body vẫn dạng `{ data }` để công cụ health check đọc được.
  res.status(503).json({ data: health });
}
