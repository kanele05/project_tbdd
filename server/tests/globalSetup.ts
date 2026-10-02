/**
 * Jest globalSetup: đưa DB test (`elearning_test`) về trạng thái sạch trước khi chạy toàn bộ test:
 *   1. `prisma migrate deploy` - áp các migration còn thiếu lên DB test;
 *   2. TRUNCATE mọi bảng dữ liệu (giữ `_prisma_migrations`).
 * Yêu cầu PostgreSQL đang chạy (`npm run db:start`) và có file `.env.test`.
 * (Không dùng `prisma migrate reset` vì Prisma CLI chặn lệnh phá dữ liệu đó khi chạy từ AI agent.)
 * Chỉ dùng module Node / thư viện: globalSetup chạy ngoài moduleNameMapper của Jest (không dùng alias `@/`).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import dotenv from 'dotenv';
import { Client } from 'pg';

function assertTestDatabase(url: string): void {
  // Chốt an toàn: không bao giờ xóa dữ liệu của một DB không phải DB test.
  const dbName = new URL(url.replace(/^postgres(ql)?:/, 'http:')).pathname;
  if (!/test/i.test(dbName)) {
    throw new Error(
      `Refusing to clean "${url.replace(/:[^:@/]+@/, ':***@')}" - tên database test phải chứa "test" (xem .env.test).`,
    );
  }
}

export default async function globalSetup(): Promise<void> {
  // Unit test thuần (mock Prisma) không cần DB: `npm run test:unit` đặt SKIP_DB_SETUP=1.
  if (process.env.SKIP_DB_SETUP === '1') return;

  const serverRoot = path.resolve(__dirname, '..');
  dotenv.config({ path: path.join(serverRoot, '.env.test'), quiet: true });

  const url = process.env.DATABASE_URL ?? '';
  assertTestDatabase(url);

  const prismaCli = require.resolve('prisma/build/index.js');
  const deploy = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: serverRoot,
    env: { ...process.env, NODE_ENV: 'test' },
    encoding: 'utf8',
  });
  if (deploy.status !== 0) {
    throw new Error(
      `Không áp được migration lên DB test. Đã chạy "npm run db:start" chưa?\n${deploy.stdout}\n${deploy.stderr}`,
    );
  }

  const client = new Client({ connectionString: url.replace(/[?&]schema=[^&]*/, '') });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
    );
    if (rows.length > 0) {
      const list = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
      await client.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await client.end();
  }
}
