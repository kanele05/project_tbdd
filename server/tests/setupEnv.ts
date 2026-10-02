/**
 * Chạy trước mỗi file test (setupFiles). Giá trị mặc định để unit test (mock Prisma) chạy được
 * kể cả khi chưa có `.env.test`; integration test dùng `.env.test` (dotenv không ghi đè biến đã có).
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-32chars';
process.env.JWT_EXPIRES_IN ??= '7d';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5433/elearning_test?schema=public';
process.env.PUBLIC_BASE_URL ??= 'http://localhost:4001';
