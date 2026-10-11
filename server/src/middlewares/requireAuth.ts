import type { Request, RequestHandler } from 'express';

import { ApiError } from '@/lib/ApiError';
import { verifyToken } from '@/lib/jwt';
import { resolveActiveSession } from '@/lib/sessionGuard';
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
 * Gán `req.user` (gồm `sessionId`; `role` là vai trò hiện tại trong DB).
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  // Đã xác thực ở middleware cấp mount (vd. `/teacher`, `/admin`) cùng request -> không kiểm tra phiên lần nữa.
  if (req.user) {
    next();
    return;
  }
  const token = extractBearerToken(req);
  const user = token ? verifyToken(token) : null;
  const session = user ? await resolveActiveSession(user.sessionId) : null;
  if (!user || !session) {
    next(ApiError.unauthorized('Invalid or missing access token'));
    return;
  }
  // `role` lấy từ DB (qua sessionGuard, cache 30 s) chứ không tin claim trong JWT: đổi vai trò / khóa tài
  // khoản có hiệu lực gần như ngay thay vì chờ access token hết hạn (15 phút).
  req.user = { ...user, role: session.role };
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
