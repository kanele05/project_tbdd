/**
 * Khóa / mở khóa tài khoản (BR-28). Controller & route của admin nằm ở `modules/admin`; module đó gọi
 * hai hàm này (chỉ service được dùng Prisma).
 */
import { ApiError } from '@/lib/ApiError';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

import { revokeUserSessions } from './session.service';

export type AccountStatus = {
  id: string;
  disabledAt: Date | null;
  disabledReason: string | null;
};

const statusSelect = { id: true, disabledAt: true, disabledReason: true } as const;

function userNotFound(): ApiError {
  return ApiError.of('NOT_FOUND', 'User not found');
}

/**
 * Khóa tài khoản: đặt `disabledAt` + lý do, thu hồi MỌI phiên và refresh token (access token hiện có bị
 * `requireAuth` từ chối ngay). Không khóa được ADMIN (kể cả chính mình): 422 `CANNOT_DISABLE_ADMIN`.
 * Idempotent: khóa lại tài khoản đã khóa chỉ cập nhật lý do. Khóa học của giảng viên giữ nguyên trạng thái.
 * Lý do 5-500 ký tự do schema của route admin kiểm tra.
 */
export async function disableUser(
  userId: string,
  reason: string,
  actorId: string,
): Promise<AccountStatus> {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, disabledAt: true },
  });
  if (!target) throw userNotFound();
  if (target.role === 'ADMIN' || userId === actorId) {
    throw ApiError.of('CANNOT_DISABLE_ADMIN', 'Admin accounts cannot be disabled');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { disabledAt: target.disabledAt ?? new Date(), disabledReason: reason.trim() },
    select: statusSelect,
  });
  const revoked = await revokeUserSessions(userId, { reason: 'ACCOUNT_DISABLED' });
  logger.info({ userId, actorId, revokedSessions: revoked }, 'User account disabled');
  return updated;
}

/** Mở khóa tài khoản (idempotent). Người dùng phải đăng nhập lại vì mọi phiên đã bị thu hồi lúc khóa. */
export async function enableUser(userId: string, actorId: string): Promise<AccountStatus> {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) throw userNotFound();
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { disabledAt: null, disabledReason: null },
    select: statusSelect,
  });
  logger.info({ userId, actorId }, 'User account enabled');
  return updated;
}
