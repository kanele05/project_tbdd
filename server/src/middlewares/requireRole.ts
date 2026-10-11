import type { RequestHandler } from 'express';

import { ApiError } from '@/lib/ApiError';
import type { AuthUser } from '@/types/auth';

/**
 * Chỉ cho phép các vai trò được liệt kê (BR-23). PHẢI đặt SAU `requireAuth`.
 *  - chưa đăng nhập -> 401 `UNAUTHORIZED`;
 *  - sai vai trò   -> 403 `FORBIDDEN`.
 * `req.user.role` do `requireAuth` lấy từ DB (không phải claim JWT) nên luôn là vai trò hiện tại.
 */
export function requireRole(...roles: readonly AuthUser['role'][]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.of('FORBIDDEN', 'You do not have permission to access this resource'));
      return;
    }
    next();
  };
}
