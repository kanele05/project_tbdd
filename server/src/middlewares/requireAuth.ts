import type { Request, RequestHandler } from 'express';

import { ApiError } from '@/lib/ApiError';
import { verifyToken } from '@/lib/jwt';
import type { AuthUser } from '@/types/auth';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token, ...rest] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) return null;
  return token;
}

/** Bắt buộc đăng nhập: thiếu / sai / hết hạn token -> 401 `UNAUTHORIZED`. Gán `req.user`. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = extractBearerToken(req);
  const user = token ? verifyToken(token) : null;
  if (!user) {
    next(ApiError.unauthorized('Invalid or missing access token'));
    return;
  }
  req.user = user;
  next();
};

/**
 * Token tùy chọn (PLAN.md §9.1, quyết định thiết kế): không có header -> khách (`req.user` undefined);
 * có header nhưng token sai / hết hạn -> 401 để mobile đăng xuất đúng lúc.
 */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  if (!req.headers.authorization) {
    next();
    return;
  }
  requireAuth(req, _res, next);
};

/** Lấy user trong controller của route đã qua `requireAuth` (không cần dấu `!`). */
export function getAuthUser(req: Request): AuthUser {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}
