import { isTest } from '@/config/env';
import type { Role } from '@/generated/prisma/client';
import { TtlCache } from '@/lib/cache';
import { prisma } from '@/lib/prisma';

/**
 * Kiểm tra phiên đăng nhập (`sid` trong access token) còn hiệu lực - gọi ở `requireAuth` cho mọi request.
 *
 * Chọn cache **chỉ kết quả "còn hiệu lực"**, TTL 30 s, trong bộ nhớ tiến trình:
 *  - 99 % request không phải truy vấn DB thêm;
 *  - thu hồi phiên gọi `forgetSession()` nên có hiệu lực NGAY trên instance này (API chạy 1 container);
 *    nếu sau này chạy nhiều instance thì độ trễ tối đa là 30 s (ngắn hơn nhiều so với TTL access token 15 phút);
 *  - phiên bị thu hồi (kết quả "không") không cache, luôn kiểm tra lại DB nên không bao giờ "sống lại".
 * Tắt khi test để dữ liệu test không bị "dính" cache.
 *
 * Cùng truy vấn này còn:
 *  - trả `role` HIỆN TẠI trong DB (không tin `role` trong JWT) -> đổi vai trò (script `user:set-role`) có hiệu
 *    lực tối đa sau 30 s thay vì chờ access token hết hạn; `requireAuth` gán `req.user.role` từ đây;
 *  - từ chối phiên của tài khoản đã bị khóa (`User.disabledAt`, BR-28) dù phiên chưa kịp thu hồi.
 */
const SESSION_CACHE_TTL_MS = 30_000;
const sessionCache = new TtlCache({
  max: 10_000,
  defaultTtlMs: SESSION_CACHE_TTL_MS,
  enabled: !isTest,
});

const cacheKey = (sessionId: string): string => `session:${sessionId}`;

export type ActiveSession = { role: Role };

/** Phiên còn hiệu lực (chưa thu hồi / hết hạn, tài khoản không bị khóa) kèm vai trò hiện tại; ngược lại `null`. */
export async function resolveActiveSession(
  sessionId: string,
  now = new Date(),
): Promise<ActiveSession | null> {
  const cached = sessionCache.get<ActiveSession>(cacheKey(sessionId));
  if (cached) return cached;
  const session = await prisma.session.findFirst({
    where: { id: sessionId, revokedAt: null, expiresAt: { gt: now }, user: { disabledAt: null } },
    select: { user: { select: { role: true } } },
  });
  if (!session) return null;
  const active: ActiveSession = { role: session.user.role };
  sessionCache.set(cacheKey(sessionId), active);
  return active;
}

export async function isSessionActive(sessionId: string, now = new Date()): Promise<boolean> {
  return (await resolveActiveSession(sessionId, now)) !== null;
}

/** Gọi ngay sau khi thu hồi phiên để các request kế tiếp bị từ chối tức thì. */
export function forgetSession(sessionId: string): void {
  sessionCache.delete(cacheKey(sessionId));
}
