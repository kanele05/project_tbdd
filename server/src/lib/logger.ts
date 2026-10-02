import { randomUUID } from 'node:crypto';

import pino from 'pino';
import { pinoHttp } from 'pino-http';

import { env, isProduction, isTest } from '@/config/env';

export const logger = pino({
  level: env.LOG_LEVEL ?? (isTest ? 'silent' : isProduction ? 'info' : 'debug'),
  // Không bao giờ log mật khẩu / token (CLAUDE.md §8).
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      '*.password',
      '*.passwordHash',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
  transport:
    isProduction || isTest
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
});

/** Middleware log mỗi request kèm thời gian phản hồi (dùng để đo NFR-02: API p95 < 500 ms). */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && incoming.length <= 100 ? incoming : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  // Health check gọi liên tục nên không log (tránh nhiễu).
  autoLogging: { ignore: (req) => (req.url ?? '').startsWith('/api/v1/health') },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res, responseTime) =>
    `${req.method} ${req.url} ${res.statusCode} ${Math.round(responseTime)}ms`,
  customErrorMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode} failed`,
  serializers: {
    req: (req: { id?: unknown; method?: string; url?: string }) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
  },
});
