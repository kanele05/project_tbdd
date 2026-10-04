import type { AuthEventType, Prisma } from '@/generated/prisma/client';
import { maskIp, truncateUserAgent } from '@/lib/device';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import type { ClientContext } from '@/types/auth';

export type AuthEventInput = {
  userId: string;
  type: AuthEventType;
  ctx?: ClientContext;
  sessionId?: string;
  metadata?: Prisma.InputJsonObject;
};

/**
 * Ghi nhật ký bảo mật (AUTH-06). Là "best effort": lỗi ghi log không được làm hỏng luồng đăng nhập,
 * nên chỉ cảnh báo. KHÔNG bao giờ truyền mật khẩu / mã / token vào `metadata`.
 */
export async function recordAuthEvent(input: AuthEventInput): Promise<void> {
  try {
    await prisma.authEvent.create({
      data: {
        userId: input.userId,
        type: input.type,
        sessionId: input.sessionId ?? null,
        ipAddress: maskIp(input.ctx?.ip),
        userAgent: truncateUserAgent(input.ctx?.userAgent),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
      select: { id: true },
    });
  } catch (err) {
    logger.warn({ err, type: input.type }, 'Failed to record auth event');
  }
}
