import { createHash, timingSafeEqual } from 'node:crypto';
import type { Server } from 'node:http';

import express, {
  type Express,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

/**
 * Prometheus metrics (monitoring - deploy/README.md).
 *
 * - Một registry riêng (không dùng registry mặc định của prom-client) để test không bị trùng đăng ký.
 * - Nhãn `route` là MẪU ĐƯỜNG DẪN (`/api/v1/courses/:id`), không phải URL thật -> số series nhỏ,
 *   không bị bùng nổ cardinality (và không lộ id/token nằm trong URL).
 * - File này cố ý không import `@/config/env` để unit test nhẹ; cấu hình (cổng, token) do `server.ts` truyền vào.
 */
export const metricsRegistry = new Registry();

const HTTP_BUCKETS_SECONDS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const AI_BUCKETS_SECONDS = [0.25, 0.5, 1, 2, 4, 8, 15, 30, 60, 120];

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds, by method, route pattern and status code',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: HTTP_BUCKETS_SECONDS,
  registers: [metricsRegistry],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests, by method, route pattern and status code',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [metricsRegistry],
});

export const httpRequestsInFlight = new Gauge({
  name: 'http_requests_in_flight',
  help: 'HTTP requests currently being processed',
  registers: [metricsRegistry],
});

/** Mỗi lần gọi model (ghi bởi `lib/ai/instrumented.ts`, bọc provider trong `getAiProvider()`). */
export const aiRequestsTotal = new Counter({
  name: 'ai_requests_total',
  help: 'AI model calls by feature, provider and status (ok | rate_limited | blocked | unavailable | timeout | bad_output | aborted | error)',
  labelNames: ['feature', 'provider', 'status'] as const,
  registers: [metricsRegistry],
});

/** Thời gian mỗi lần gọi model (stream: từ chunk đầu tới hết), ghi bởi `lib/ai/instrumented.ts`. */
export const aiRequestDurationSeconds = new Histogram({
  name: 'ai_request_duration_seconds',
  help: 'AI provider call duration in seconds, by feature and provider',
  labelNames: ['feature', 'provider'] as const,
  buckets: AI_BUCKETS_SECONDS,
  registers: [metricsRegistry],
});

let areDefaultMetricsStarted = false;

/** Metrics của tiến trình Node (CPU, RAM, event loop lag, GC...). Chỉ gọi từ `server.ts`, không gọi trong test. */
export function startDefaultMetrics(): void {
  if (areDefaultMetricsStarted) return;
  areDefaultMetricsStarted = true;
  collectDefaultMetrics({ register: metricsRegistry });
}

export const UNMATCHED_ROUTE = 'unmatched';

type RouteSource = {
  baseUrl?: string;
  originalUrl?: string;
  route?: { path?: unknown };
};

function normalizePath(path: string): string {
  const collapsed = path.replace(/\/{2,}/g, '/');
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
}

function splitSegments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

/** Mẫu chỉ gồm chữ/số/`-`/`_`/`.`/`:param` (không có `*`, `?`, `{}`, `()`) -> đếm được số đoạn. */
const SIMPLE_ROUTE_PATTERN = /^[\w\-./:]*$/;

/**
 * Nhãn route đầy đủ = (đường dẫn mount của router) + (mẫu route). Không dùng `req.baseUrl` làm nguồn chính vì
 * Express/router RESET `baseUrl` khi lỗi đi ra khỏi router lồng nhau (`next(err)` -> errorHandler): lúc đó
 * request lỗi 4xx/5xx sẽ mất tiền tố `/api/v1` và nhãn không khớp với request thành công. Thay vào đó lấy
 * tiền tố từ chính URL: mẫu route luôn khớp phần ĐUÔI của đường dẫn nên bỏ đi số đoạn của mẫu là ra tiền tố mount
 * (hạ chữ thường vì router so khớp không phân biệt hoa/thường -> chặn việc tạo vô số nhãn bằng cách đổi hoa/thường).
 */
function buildRouteLabel(req: RouteSource, routePath: string): string {
  const pathname = (req.originalUrl ?? '').split('?')[0] ?? '';
  if (SIMPLE_ROUTE_PATTERN.test(routePath)) {
    const actual = splitSegments(pathname);
    const pattern = splitSegments(routePath);
    if (actual.length >= pattern.length) {
      const prefix = actual
        .slice(0, actual.length - pattern.length)
        .join('/')
        .toLowerCase();
      return normalizePath(`/${prefix}/${pattern.join('/')}`);
    }
  }
  return normalizePath(`${(req.baseUrl ?? '').toLowerCase()}${routePath}`);
}

/**
 * Chuẩn hóa request thành nhãn `route`:
 * - route Express đã khớp -> mẫu đầy đủ (vd. `/api/v1/courses/:id`, bỏ dấu `/` cuối);
 * - file tĩnh `/static/*`, `/uploads/*` -> gom thành một nhãn;
 * - còn lại (404, bot quét đường dẫn lạ, bị chặn trước khi vào router) -> `unmatched`.
 */
export function resolveRouteLabel(req: RouteSource): string {
  const routePath = req.route?.path;
  if (typeof routePath === 'string') return buildRouteLabel(req, routePath);
  if (req.route) return UNMATCHED_ROUTE; // route khai báo bằng RegExp/mảng: không có mẫu chuỗi an toàn
  const pathname = (req.originalUrl ?? '').split('?')[0] ?? '';
  if (pathname.startsWith('/static/')) return '/static/*';
  if (pathname.startsWith('/uploads/')) return '/uploads/*';
  return UNMATCHED_ROUTE;
}

/**
 * Đo mọi request: số lượng, thời gian xử lý, số request đang chạy. Ghi nhận ở sự kiện `close`
 * (luôn xảy ra, kể cả khi client ngắt kết nối giữa chừng -> status 499 như nginx).
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const stopTimer = httpRequestDurationSeconds.startTimer();
  httpRequestsInFlight.inc();
  res.once('close', () => {
    httpRequestsInFlight.dec();
    const labels = {
      method: req.method,
      route: resolveRouteLabel(req),
      status: String(res.writableFinished ? res.statusCode : 499),
    };
    stopTimer(labels);
    httpRequestsTotal.inc(labels);
  });
  next();
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** So sánh token theo thời gian hằng số (băm trước để hai chuỗi luôn cùng độ dài). */
export function isMetricsTokenValid(authorization: string | undefined, token: string): boolean {
  const match = /^Bearer (.+)$/.exec(authorization ?? '');
  if (!match?.[1]) return false;
  return timingSafeEqual(sha256(match[1]), sha256(token));
}

/** Handler của `GET /metrics`. Có `token` -> bắt buộc header `Authorization: Bearer <token>`. */
export function createMetricsHandler(token?: string): RequestHandler {
  return async (req, res) => {
    if (token && !isMetricsTokenValid(req.headers.authorization, token)) {
      res.status(401).set('WWW-Authenticate', 'Bearer').end();
      return;
    }
    res.set('Content-Type', metricsRegistry.contentType);
    res.send(await metricsRegistry.metrics());
  };
}

/** App Express tối thiểu chỉ có `GET /metrics` (mọi đường dẫn khác -> 404). */
export function createMetricsApp(token?: string): Express {
  const app = express();
  app.disable('x-powered-by');
  app.get('/metrics', createMetricsHandler(token));
  return app;
}

/**
 * Mở cổng RIÊNG cho `/metrics`, tách khỏi cổng API công khai. Cổng này không được publish ra ngoài
 * (docker-compose) và Caddy không proxy tới nó -> Internet không thể chạm vào, chỉ Prometheus
 * trong mạng Docker nội bộ scrape được.
 */
export function startMetricsServer(port: number, host: string, token?: string): Server {
  return createMetricsApp(token).listen(port, host);
}

export type MetricsServerConfig = {
  /** `METRICS_PORT`; không đặt -> không phục vụ /metrics. */
  port?: number;
  /** Cổng của API công khai (`PORT`) - cổng metrics phải khác. */
  apiPort: number;
  host: string;
  token?: string;
};

export type MetricsServerResult =
  { status: 'started'; server: Server } | { status: 'disabled' } | { status: 'port-conflict' };

/**
 * Quyết định có mở cổng /metrics hay không (gọi từ `server.ts`):
 * - không đặt `METRICS_PORT` -> `disabled` (mặc định an toàn: không có endpoint metrics nào);
 * - trùng cổng API -> `port-conflict` (từ chối, để /metrics không lọt ra cổng công khai);
 * - còn lại -> bật metrics của tiến trình Node và mở cổng riêng.
 */
export function startMetricsIfEnabled(config: MetricsServerConfig): MetricsServerResult {
  if (config.port === undefined) return { status: 'disabled' };
  if (config.port === config.apiPort) return { status: 'port-conflict' };
  startDefaultMetrics();
  return { status: 'started', server: startMetricsServer(config.port, config.host, config.token) };
}
