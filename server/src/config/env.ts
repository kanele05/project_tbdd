import path from 'node:path';

import dotenv from 'dotenv';
import { z } from 'zod';

/** Thư mục gốc của server/ (đúng cả khi chạy tsx từ src/ lẫn node từ dist/). */
export const SERVER_ROOT = path.resolve(__dirname, '..', '..');

// NODE_ENV=test -> .env.test (DB `elearning_test`), ngược lại -> .env. Biến đã có sẵn trong
// process.env (vd. cấu hình trên Render) luôn được ưu tiên, dotenv không ghi đè.
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.join(SERVER_ROOT, envFile), quiet: true });

/** Biến để trống trong .env (vd. `GEMINI_API_KEY=`) coi như chưa đặt. */
const emptyToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/** Thời hạn dạng `15m`, `12h`, `30d` (giây/phút/giờ/ngày) - hợp lệ cho jsonwebtoken `expiresIn` và tự tính hạn refresh token. */
const DURATION_PATTERN = /^[1-9]\d*[smhd]$/;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CORS_ORIGIN: z.string().min(1).default('*'),
  PUBLIC_BASE_URL: z.url().optional(),
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),

  // --- AI (xem src/lib/ai) ---
  // Bỏ trống: có GEMINI_API_KEY -> gemini, không có -> mock (app vẫn chạy được, nội dung giả).
  AI_PROVIDER: z.preprocess(emptyToUndefined, z.enum(['gemini', 'mock']).optional()),
  GEMINI_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  // `gemini-3.5-flash-lite`: bản stable, có free tier, Google khuyến nghị cho dự án mới (ai.google.dev/gemini-api/docs/models,
  // kiểm tra 03/10/2026). Free tier ~500 request/ngày/PROJECT (số do bên thứ ba ghi nhận; Google không công bố, xem trong
  // AI Studio) - nhiều hơn hẳn các model Flash (~20/ngày) nên chọn Flash-Lite. Muốn chất lượng cao hơn: `gemini-3.8-flash`.
  GEMINI_MODEL: z.preprocess(emptyToUndefined, z.string().min(1).default('gemini-3.5-flash-lite')),
  AI_TIMEOUT_MS: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1000).default(45_000)),
  // Rate limit AI theo user (mỗi giờ): chat riêng, các tính năng còn lại dùng chung một bộ đếm.
  AI_CHAT_LIMIT_PER_HOUR: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).default(20),
  ),
  AI_LIMIT_PER_HOUR: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(30)),
  // Trần mỗi ngày: (1) mỗi user - mọi tính năng AI dùng chung một bộ đếm; (2) toàn server (chỉ khi dùng gemini) -
  // đặt thấp hơn hạn mức free tier của cả project để không bao giờ chạm 429 của Google.
  AI_USER_LIMIT_PER_DAY: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(60)),
  AI_GLOBAL_LIMIT_PER_DAY: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).default(400),
  ),

  // --- Prometheus metrics (src/lib/metrics.ts) ---
  // Không đặt METRICS_PORT -> KHÔNG phục vụ /metrics. Có -> mở cổng riêng (không publish ra ngoài).
  METRICS_PORT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(65535).optional(),
  ),
  // Mặc định chỉ nghe localhost; trong Docker đặt 0.0.0.0 để Prometheus (cùng mạng nội bộ) scrape được.
  METRICS_HOST: z.preprocess(emptyToUndefined, z.string().min(1).default('127.0.0.1')),
  // (Tùy chọn) bắt buộc header `Authorization: Bearer <token>` khi scrape.
  METRICS_TOKEN: z.preprocess(emptyToUndefined, z.string().min(16).optional()),

  // --- Thời hạn token (AUTH-01): access token ngắn hạn + refresh token dài hạn, dạng `15m`, `12h`, `30d` ---
  ACCESS_TOKEN_TTL: z.preprocess(
    emptyToUndefined,
    z.string().regex(DURATION_PATTERN).default('15m'),
  ),
  REFRESH_TOKEN_TTL: z.preprocess(
    emptyToUndefined,
    z.string().regex(DURATION_PATTERN).default('30d'),
  ),

  // --- Gửi email (AUTH-07): không đặt SMTP_HOST -> mailer chỉ ghi nội dung thư ra log (dev) ---
  SMTP_HOST: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  SMTP_PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(65535).default(587)),
  SMTP_USER: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  SMTP_PASS: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  MAIL_FROM: z.preprocess(
    emptyToUndefined,
    z.string().min(3).default('E-Learning <no-reply@localhost>'),
  ),

  // --- CAPTCHA Cloudflare Turnstile (AUTH-05). Site key công khai dành cho client (web/mobile); server chỉ cần secret ---
  TURNSTILE_SITE_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  TURNSTILE_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),

  // --- 2FA TOTP (AUTH-04): khóa AES-256 (32 byte, base64) mã hóa secret TOTP trong DB. `openssl rand -base64 32` ---
  TOTP_ENC_KEY: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine(
        (value) => Buffer.from(value, 'base64').length === 32,
        'TOTP_ENC_KEY must be 32 bytes encoded as base64 (openssl rand -base64 32)',
      )
      .optional(),
  ),
});

/** Khóa DEV (32 byte toàn số 0) trong .env.example - không bao giờ được dùng ở production. */
const DEV_TOTP_ENC_KEY = Buffer.alloc(32).toString('base64');

/** Các biến bắt buộc/an toàn riêng cho production (dev/test được bỏ qua). */
function productionIssues(data: z.infer<typeof envSchema>): string[] {
  if (data.NODE_ENV !== 'production') return [];
  const issues: string[] = [];
  if (!data.TOTP_ENC_KEY) issues.push('TOTP_ENC_KEY is required in production');
  else if (data.TOTP_ENC_KEY === DEV_TOTP_ENC_KEY) {
    issues.push('TOTP_ENC_KEY must not be the dev key from .env.example - generate your own');
  }
  return issues;
}

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.') || 'env'}: ${i.message}`);
    throw new Error(
      `Invalid environment variables (xem server/.env.example):\n${lines.join('\n')}`,
    );
  }
  const data = result.data;
  const issues = productionIssues(data);
  if (issues.length > 0) {
    throw new Error(`Invalid production environment:\n${issues.map((i) => `  - ${i}`).join('\n')}`);
  }
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
