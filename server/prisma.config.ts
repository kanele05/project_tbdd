import path from 'node:path';

import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// NODE_ENV=test -> dùng .env.test (DB `elearning_test`), ngược lại dùng .env.
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, envFile), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // `prisma generate` không cần kết nối DB nên cho phép thiếu biến khi cài đặt lần đầu.
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/elearning?schema=public',
  },
});
