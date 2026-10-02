import { cache } from '@/lib/cache';
import { prisma } from '@/lib/prisma';

/**
 * Xóa toàn bộ dữ liệu mọi bảng (trừ `_prisma_migrations`) + xóa cache server.
 * Gọi trong `beforeEach` (hoặc `beforeAll`) của integration test để mỗi test bắt đầu từ DB rỗng.
 */
export async function resetDb(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length > 0) {
    const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  }
  cache.clear();
}
