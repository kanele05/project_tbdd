/**
 * Phiên đăng nhập + refresh token (AUTH-01).
 *
 *  - Mỗi lần đăng nhập tạo một `Session` (một thiết bị). `Session.id` là claim `sid` của access token.
 *  - Refresh token là chuỗi ngẫu nhiên, DB chỉ lưu SHA-256. Mỗi lần refresh: token cũ đánh dấu `usedAt`,
 *    cấp token mới (xoay vòng, hạn trượt 30 ngày).
 *  - Token đã dùng mà bị trình lại = có bản sao bị đánh cắp -> thu hồi CẢ phiên (kẻ trộm lẫn người dùng thật
 *    phải đăng nhập lại) và ghi `REFRESH_REUSE`.
 *  - Thu hồi phiên xóa refresh token của phiên và xóa cache => access token cũ bị `requireAuth` từ chối ngay.
 */
import { env } from '@/config/env';
import type { Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { generateRefreshToken, hashRefreshToken } from '@/lib/authCrypto';
import { describeDevice, maskIp, truncateUserAgent } from '@/lib/device';
import { durationToMs } from '@/lib/duration';
import { ACCESS_TOKEN_TTL_SEC, signAccessToken } from '@/lib/jwt';
import { toUserDto, type UserDtoRow, userDtoSelect } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';
import { forgetSession } from '@/lib/sessionGuard';
import type { ClientContext } from '@/types/auth';
import type { AuthSessionDto, SessionDto, TokenPairDto, UserDto } from '@/types/dto';

import { recordAuthEvent } from './authEvent.service';

const REFRESH_TOKEN_TTL_MS = durationToMs(env.REFRESH_TOKEN_TTL);
/** Token đã dùng được giữ thêm 7 ngày để còn phát hiện bị dùng lại, sau đó dọn để bảng không phình mãi. */
const USED_TOKEN_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

type SessionUser = Pick<UserDto, 'id' | 'role'>;

function buildTokenPair(user: SessionUser, sessionId: string, refreshToken: string): TokenPairDto {
  const accessToken = signAccessToken({ id: user.id, role: user.role, sessionId });
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: ACCESS_TOKEN_TTL_SEC,
    token: accessToken,
  };
}

function invalidRefreshToken(): ApiError {
  return ApiError.of('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
}

export type StartedSession = {
  sessionId: string;
  tokens: TokenPairDto;
  deviceName: string;
  /** Đã từng đăng nhập trên thiết bị khác nhưng chưa bao giờ trên thiết bị này. */
  isNewDevice: boolean;
};

/** Tạo phiên mới + cặp token đầu tiên. `clientDeviceName` do app gửi (nếu có), không thì đoán từ User-Agent. */
export async function startSession(
  user: SessionUser,
  ctx: ClientContext,
  clientDeviceName?: string,
  now = new Date(),
): Promise<StartedSession> {
  const deviceName = describeDevice(ctx.userAgent, clientDeviceName);
  const [total, known] = await Promise.all([
    prisma.session.count({ where: { userId: user.id } }),
    prisma.session.count({
      where: { userId: user.id, deviceName: { equals: deviceName, mode: 'insensitive' } },
    }),
  ]);

  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      deviceName,
      userAgent: truncateUserAgent(ctx.userAgent),
      ipAddress: maskIp(ctx.ip),
      lastUsedAt: now,
      expiresAt,
      refreshTokens: { create: { tokenHash: hashRefreshToken(refreshToken), expiresAt } },
    },
    select: { id: true },
  });

  return {
    sessionId: session.id,
    tokens: buildTokenPair(user, session.id, refreshToken),
    deviceName,
    isNewDevice: total > 0 && known === 0,
  };
}

// ---------------------------------------------------------------- refresh

type RefreshRow = {
  id: string;
  usedAt: Date | null;
  expiresAt: Date;
  session: {
    id: string;
    userId: string;
    revokedAt: Date | null;
    expiresAt: Date;
    user: UserDtoRow;
  };
};

async function rejectReuse(row: RefreshRow, ctx: ClientContext, now: Date): Promise<never> {
  await revokeSessions({ id: row.session.id }, 'REFRESH_REUSE', now);
  await recordAuthEvent({
    userId: row.session.userId,
    type: 'REFRESH_REUSE',
    sessionId: row.session.id,
    ctx,
  });
  throw invalidRefreshToken();
}

/** Đổi refresh token lấy cặp token mới (xoay vòng). Mọi lỗi đều trả cùng `401 INVALID_REFRESH_TOKEN`. */
export async function refreshSession(
  rawToken: string,
  ctx: ClientContext,
  now = new Date(),
): Promise<AuthSessionDto> {
  const row: RefreshRow | null = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(rawToken) },
    select: {
      id: true,
      usedAt: true,
      expiresAt: true,
      session: {
        select: {
          id: true,
          userId: true,
          revokedAt: true,
          expiresAt: true,
          user: { select: userDtoSelect },
        },
      },
    },
  });
  if (!row || row.session.revokedAt || row.expiresAt <= now || row.session.expiresAt <= now) {
    throw invalidRefreshToken();
  }
  if (row.usedAt) return rejectReuse(row, ctx, now);

  const nextToken = generateRefreshToken();
  const nextExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);
  const sessionId = row.session.id;
  const rotated = await prisma.$transaction(async (tx) => {
    // "Chiếm" token bằng UPDATE có điều kiện: hai request đồng thời chỉ một request thắng (count = 1).
    const claim = await tx.refreshToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claim.count === 0) return false;
    await tx.refreshToken.create({
      data: { sessionId, tokenHash: hashRefreshToken(nextToken), expiresAt: nextExpiresAt },
    });
    await tx.session.update({
      where: { id: sessionId },
      data: {
        lastUsedAt: now,
        expiresAt: nextExpiresAt,
        ipAddress: maskIp(ctx.ip),
        userAgent: truncateUserAgent(ctx.userAgent),
      },
    });
    await tx.refreshToken.deleteMany({
      where: { sessionId, usedAt: { lt: new Date(now.getTime() - USED_TOKEN_RETENTION_MS) } },
    });
    return true;
  });
  if (!rotated) return rejectReuse(row, ctx, now);

  const user = toUserDto(row.session.user);
  return { twoFactorRequired: false, ...buildTokenPair(user, sessionId, nextToken), user };
}

// ---------------------------------------------------------------- thu hồi phiên

type RevokedSession = { id: string; userId: string };

/** Thu hồi mọi phiên khớp `where` còn hiệu lực: đánh dấu, xóa refresh token, xóa cache. Trả các phiên đã thu hồi. */
async function revokeSessions(
  where: Prisma.SessionWhereInput,
  reason: string,
  now = new Date(),
): Promise<RevokedSession[]> {
  const targets = await prisma.session.findMany({
    where: { AND: [where, { revokedAt: null }] },
    select: { id: true, userId: true },
  });
  if (targets.length === 0) return [];
  const ids = targets.map((t) => t.id);
  await prisma.$transaction([
    prisma.session.updateMany({
      where: { id: { in: ids }, revokedAt: null },
      data: { revokedAt: now, revokedReason: reason },
    }),
    prisma.refreshToken.deleteMany({ where: { sessionId: { in: ids } } }),
  ]);
  for (const id of ids) forgetSession(id);
  return targets;
}

/**
 * Đăng xuất phiên hiện tại. Nhận `sessionId` (từ access token) và/hoặc `refreshToken` (khi access token đã hết hạn).
 * Idempotent: không tìm thấy phiên nào thì coi như đã đăng xuất, không báo lỗi.
 */
export async function logout(
  input: { sessionId?: string; refreshToken?: string },
  ctx: ClientContext,
): Promise<void> {
  const sessionIds = new Set<string>();
  if (input.sessionId) sessionIds.add(input.sessionId);
  if (input.refreshToken) {
    const row = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(input.refreshToken) },
      select: { sessionId: true },
    });
    if (row) sessionIds.add(row.sessionId);
  }
  if (sessionIds.size === 0) return;
  const revoked = await revokeSessions({ id: { in: [...sessionIds] } }, 'LOGOUT');
  for (const session of revoked) {
    await recordAuthEvent({ userId: session.userId, type: 'LOGOUT', sessionId: session.id, ctx });
  }
}

/**
 * Thu hồi mọi phiên của user (trừ `exceptSessionId` nếu có): đặt lại mật khẩu, đổi mật khẩu, "đăng xuất thiết bị khác".
 * Trả số phiên đã thu hồi.
 */
export async function revokeUserSessions(
  userId: string,
  options: { exceptSessionId?: string; reason: string },
  now = new Date(),
): Promise<number> {
  const where: Prisma.SessionWhereInput = options.exceptSessionId
    ? { userId, id: { not: options.exceptSessionId } }
    : { userId };
  const revoked = await revokeSessions(where, options.reason, now);
  return revoked.length;
}

/** Đăng xuất từ xa một thiết bị của chính user (kể cả thiết bị hiện tại). 404 nếu phiên không thuộc về user. */
export async function revokeSessionOfUser(
  userId: string,
  sessionId: string,
  ctx: ClientContext,
): Promise<void> {
  const revoked = await revokeSessions({ id: sessionId, userId }, 'REMOTE_LOGOUT');
  if (revoked.length === 0) throw ApiError.of('SESSION_NOT_FOUND', 'Session not found');
  await recordAuthEvent({ userId, type: 'SESSION_REVOKED', sessionId, ctx });
}

/** Danh sách thiết bị đang đăng nhập (phiên chưa thu hồi, chưa hết hạn), dùng gần nhất trước. */
export async function listSessions(
  userId: string,
  currentSessionId: string,
  now = new Date(),
): Promise<SessionDto[]> {
  const rows = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: [{ lastUsedAt: 'desc' }, { id: 'asc' }],
    select: { id: true, deviceName: true, ipAddress: true, createdAt: true, lastUsedAt: true },
  });
  return rows.map((row) => ({
    id: row.id,
    deviceName: row.deviceName,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt.toISOString(),
    isCurrent: row.id === currentSessionId,
  }));
}
