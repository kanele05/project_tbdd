import { createApp } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { disconnectPrisma } from '@/lib/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    `API listening on port ${env.PORT} (${env.NODE_ENV}) - base ${env.PUBLIC_BASE_URL}/api/v1`,
  );
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down`);
  server.close(() => {
    void disconnectPrisma().finally(() => process.exit(0));
  });
  // Ép thoát nếu còn kết nối treo.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});
