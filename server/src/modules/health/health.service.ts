import { prisma } from '@/lib/prisma';

export type HealthStatus = { status: 'ok' | 'error'; db: 'ok' | 'down' };

/** Kiểm tra server sống và kết nối DB thật (`SELECT 1`). Không bao giờ ném lỗi. */
export async function checkHealth(): Promise<HealthStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'ok' };
  } catch {
    return { status: 'error', db: 'down' };
  }
}
