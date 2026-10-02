import type { RequestHandler } from 'express';

import { ApiError } from '@/lib/ApiError';

/** Route không tồn tại -> 404 `NOT_FOUND` (đi qua errorHandler để cùng định dạng lỗi). */
export const notFound: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`));
};
