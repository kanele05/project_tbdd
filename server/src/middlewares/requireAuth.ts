import type { Request, RequestHandler } from 'express';

import { ApiError } from '@/lib/ApiError';
import { verifyToken } from '@/lib/jwt';
import { isSessionActive } from '@/lib/sessionGuard';
import type { AuthUser } from '@/types/auth';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token, ...rest] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) return null;
  return token;
}

/**
 * Bắt buộc đăng nhập: thiếu / sai / hết hạn token, hoặc phiên (`sid`) đã bị thu hồi -> 401 `UNAUTHORIZED`.
 * Gán `req.user` (gồm `sessionId`).
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = extractBearerToken(req);
  const user = token ? verifyToken(token) : null;
  if (!user || !(await isSessionActive(user.sessionId))) {
    next(ApiError.unauthorized('Invalid or missing access token'));
    return;
  }
  req.user = user;
  next();
};

/**
 * Token tùy chọn (PLAN.md §9.1, quyết định thiết kế): không có header -> khách (`req.user` undefined);
 * có header nhưng token sai / hết hạn / phiên bị thu hồi -> 401 để mobile đăng xuất / refresh đúng lúc.
 */
export const optionalAuth: RequestHandler = async (req, res, next) => {
  if (!req.headers.authorization) {
    next();
    return;
  }
  await requireAuth(req, res, next);
};

/** Lấy user trong controller của route đã qua `requireAuth` (không cần dấu `!`). */
export function getAuthUser(req: Request): AuthUser {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}
