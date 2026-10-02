import { PrismaPg } from '@prisma/adapter-pg';

import { env, isProduction } from '@/config/env';
import { PrismaClient } from '@/generated/prisma/client';

export { Prisma } from '@/generated/prisma/client';

type GlobalWithPrisma = typeof globalThis & { __prisma?: PrismaClient };
const globalRef = globalThis as GlobalWithPrisma;

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter, log: isProduction ? ['error'] : ['warn', 'error'] });
}

/**
 * Singleton. Lưu trên globalThis để `tsx watch` (reload module) và Jest không tạo thêm connection pool.
 * CHỈ service được import file này (CLAUDE.md §8).
 */
export const prisma: PrismaClient = globalRef.__prisma ?? (globalRef.__prisma = createClient());

/** Đóng kết nối nếu đã được tạo (dùng khi tắt server / kết thúc test). */
export async function disconnectPrisma(): Promise<void> {
  if (globalRef.__prisma) {
    await globalRef.__prisma.$disconnect();
    globalRef.__prisma = undefined;
  }
}
