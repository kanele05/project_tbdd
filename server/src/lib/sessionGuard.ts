import { isTest } from '@/config/env';
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
 */
const SESSION_CACHE_TTL_MS = 30_000;
const sessionCache = new TtlCache({
  max: 10_000,
  defaultTtlMs: SESSION_CACHE_TTL_MS,
  enabled: !isTest,
});

const cacheKey = (sessionId: string): string => `session:${sessionId}`;

export async function isSessionActive(sessionId: string, now = new Date()): Promise<boolean> {
  if (sessionCache.get<true>(cacheKey(sessionId))) return true;
  const session = await prisma.session.findFirst({
    where: { id: sessionId, revokedAt: null, expiresAt: { gt: now } },
    select: { id: true },
  });
  if (!session) return false;
  sessionCache.set(cacheKey(sessionId), true);
  return true;
}

/** Gọi ngay sau khi thu hồi phiên để các request kế tiếp bị từ chối tức thì. */
export function forgetSession(sessionId: string): void {
  sessionCache.delete(cacheKey(sessionId));
}
