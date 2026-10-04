import { createApp } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { startMetricsIfEnabled } from '@/lib/metrics';
import { disconnectPrisma } from '@/lib/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    `API listening on port ${env.PORT} (${env.NODE_ENV}) - base ${env.PUBLIC_BASE_URL}/api/v1`,
  );
});

/** /metrics chỉ phục vụ trên cổng riêng (METRICS_PORT), không nằm trên cổng API công khai. */
function startMetrics() {
  const result = startMetricsIfEnabled({
    port: env.METRICS_PORT,
    apiPort: env.PORT,
    host: env.METRICS_HOST,
    token: env.METRICS_TOKEN,
  });
  if (result.status === 'port-conflict') {
    logger.warn('METRICS_PORT must differ from PORT - metrics endpoint is disabled');
    return undefined;
  }
  if (result.status === 'disabled') return undefined;
  result.server.on('error', (err) => logger.error({ err }, 'Metrics server error'));
  logger.info(`Metrics listening on ${env.METRICS_HOST}:${env.METRICS_PORT} (internal only)`);
  return result.server;
}

const metricsServer = startMetrics();

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down`);
  metricsServer?.close();
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
