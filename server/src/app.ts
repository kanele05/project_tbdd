import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { env, isProduction, paths } from '@/config/env';
import { httpLogger } from '@/lib/logger';
import { metricsMiddleware } from '@/lib/metrics';
import { errorHandler } from '@/middlewares/errorHandler';
import { notFound } from '@/middlewares/notFound';
import { apiRateLimiter } from '@/middlewares/rateLimit';
import { createApiRouter } from '@/routes';

export const API_PREFIX = '/api/v1';

function corsOrigin(): cors.CorsOptions['origin'] {
  if (env.CORS_ORIGIN === '*') return '*';
  return env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/** Tạo Express app (không listen) - dùng cho `server.ts` và cho Supertest. */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  // Sau reverse proxy 1 tầng (Caddy trong docker-compose / Render) để rate limit thấy đúng IP client.
  if (isProduction) app.set('trust proxy', 1);

  // Đặt đầu tiên để thời gian đo bao gồm toàn bộ middleware phía sau.
  app.use(metricsMiddleware);
  app.use(httpLogger);
  // CORP cross-origin để ảnh/video từ /static, /uploads tải được từ app và web preview.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: corsOrigin() }));
  app.use(compression());

  // File tĩnh: video/tài liệu mẫu (static/) và file người dùng upload (uploads/). Hỗ trợ HTTP Range cho video.
  const staticOptions = { maxAge: isProduction ? '1d' : 0 };
  app.use('/static', express.static(paths.static, staticOptions));
  app.use('/uploads', express.static(paths.uploads, staticOptions));

  app.use(API_PREFIX, apiRateLimiter, express.json({ limit: '100kb' }), createApiRouter());

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
