import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

import { isTest } from '@/config/env';
import { ApiError } from '@/lib/ApiError';

export type RateLimitOptions = {
  windowMs?: number;
  limit: number;
  /** true -> bỏ qua giới hạn (mặc định bỏ qua khi NODE_ENV=test). */
  skip?: boolean;
};

/** Tạo middleware giới hạn tần suất; vượt -> 429 `RATE_LIMITED` (+ header Retry-After). */
export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const { windowMs = 60_000, limit, skip = isTest } = options;
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => skip,
    handler: (_req, _res, next) => {
      next(new ApiError(429, 'RATE_LIMITED', 'Too many requests, please try again later'));
    },
  });
}

/** NFR-05: `/auth/*` tối đa 10 request / phút / IP. */
export const authRateLimiter = createRateLimiter({ limit: 10 });

/** Giới hạn chung cho toàn bộ API: 300 request / phút / IP (quyết định thiết kế, cấu hình được). */
export const apiRateLimiter = createRateLimiter({ limit: 300 });
