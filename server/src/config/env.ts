import path from 'node:path';

import dotenv from 'dotenv';
import { z } from 'zod';

/** Thư mục gốc của server/ (đúng cả khi chạy tsx từ src/ lẫn node từ dist/). */
export const SERVER_ROOT = path.resolve(__dirname, '..', '..');

// NODE_ENV=test -> .env.test (DB `elearning_test`), ngược lại -> .env. Biến đã có sẵn trong
// process.env (vd. cấu hình trên Render) luôn được ưu tiên, dotenv không ghi đè.
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.join(SERVER_ROOT, envFile), quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  CORS_ORIGIN: z.string().min(1).default('*'),
  PUBLIC_BASE_URL: z.url().optional(),
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.') || 'env'}: ${i.message}`);
    throw new Error(
      `Invalid environment variables (xem server/.env.example):\n${lines.join('\n')}`,
    );
  }
  const data = result.data;
  return {
    ...data,
    // Không có PUBLIC_BASE_URL thì dùng localhost theo PORT (chỉ hợp lệ khi test trên cùng máy).
    PUBLIC_BASE_URL: (data.PUBLIC_BASE_URL ?? `http://localhost:${data.PORT}`).replace(/\/+$/, ''),
  };
}

export const env = parseEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

export const paths = {
  root: SERVER_ROOT,
  static: path.join(SERVER_ROOT, 'static'),
  uploads: path.resolve(SERVER_ROOT, env.UPLOAD_DIR),
} as const;
