/**
 * Chạy trước mỗi file test (setupFiles). Giá trị mặc định để unit test (mock Prisma) chạy được
 * kể cả khi chưa có `.env.test`; integration test dùng `.env.test` (dotenv không ghi đè biến đã có).
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-32chars';
// CAPTCHA: test dùng secret test của Cloudflare; việc gọi siteverify được mock trong từng test (không gọi mạng).
process.env.TURNSTILE_SECRET_KEY ??= '1x0000000000000000000000000000000AA';
// Mailer test không bao giờ gửi SMTP thật dù máy dev có cấu hình.
process.env.SMTP_HOST = '';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5433/elearning_test?schema=public';
process.env.PUBLIC_BASE_URL ??= 'http://localhost:4001';
// Test không bao giờ gọi Gemini thật dù máy dev có GEMINI_API_KEY.
process.env.AI_PROVIDER = 'mock';
