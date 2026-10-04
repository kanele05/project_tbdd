import fs from 'node:fs';
import path from 'node:path';

import express, { type Express, Router } from 'express';
import request from 'supertest';

import {
  aiRequestDurationSeconds,
  aiRequestsTotal,
  createMetricsApp,
  isMetricsTokenValid,
  metricsMiddleware,
  metricsRegistry,
  resolveRouteLabel,
  startDefaultMetrics,
  startMetricsIfEnabled,
  UNMATCHED_ROUTE,
} from '@/lib/metrics';

describe('resolveRouteLabel', () => {
  it('joins baseUrl and the matched route pattern (never the real URL)', () => {
    expect(
      resolveRouteLabel({
        baseUrl: '/api/v1',
        originalUrl: '/api/v1/courses/ck123',
        route: { path: '/courses/:id' },
      }),
    ).toBe('/api/v1/courses/:id');
  });

  it('still includes the mount prefix when Express has reset baseUrl (error path)', () => {
    expect(
      resolveRouteLabel({
        baseUrl: '',
        originalUrl: '/api/v1/courses/ck123?x=1',
        route: { path: '/courses/:id' },
      }),
    ).toBe('/api/v1/courses/:id');
  });

  it('lowercases the mount prefix so case variants cannot create new labels', () => {
    expect(
      resolveRouteLabel({
        baseUrl: '',
        originalUrl: '/API/V1/courses/ck123',
        route: { path: '/courses/:id' },
      }),
    ).toBe('/api/v1/courses/:id');
  });

  it('falls back to baseUrl + pattern for patterns it cannot count', () => {
    expect(
      resolveRouteLabel({
        baseUrl: '/api/v1',
        originalUrl: '/api/v1/files/a/b/c',
        route: { path: '/files/*splat' },
      }),
    ).toBe('/api/v1/files/*splat');
  });

  it('drops the trailing slash of a router root route', () => {
    expect(
      resolveRouteLabel({
        baseUrl: '/api/v1/health',
        originalUrl: '/api/v1/health',
        route: { path: '/' },
      }),
    ).toBe('/api/v1/health');
    expect(resolveRouteLabel({ baseUrl: '', originalUrl: '/', route: { path: '/' } })).toBe('/');
  });

  it('collapses duplicate slashes', () => {
    expect(
      resolveRouteLabel({
        baseUrl: '/api/v1/',
        originalUrl: '/api/v1//me',
        route: { path: '/me' },
      }),
    ).toBe('/api/v1/me');
  });

  it('groups static and upload files into one label each', () => {
    expect(resolveRouteLabel({ originalUrl: '/static/resources/Document%201.txt?x=1' })).toBe(
      '/static/*',
    );
    expect(resolveRouteLabel({ originalUrl: '/uploads/a/b.png' })).toBe('/uploads/*');
  });

  it('uses "unmatched" for unknown paths so scanners cannot explode the label set', () => {
    expect(resolveRouteLabel({ originalUrl: '/wp-login.php' })).toBe(UNMATCHED_ROUTE);
    expect(resolveRouteLabel({ originalUrl: '/api/v1/nope/ck999' })).toBe(UNMATCHED_ROUTE);
    expect(resolveRouteLabel({})).toBe(UNMATCHED_ROUTE);
  });

  it('uses "unmatched" for routes declared with a RegExp', () => {
    expect(resolveRouteLabel({ baseUrl: '/x', route: { path: /^\/a/ } })).toBe(UNMATCHED_ROUTE);
  });
});

function buildApp(): Express {
  const app = express();
  app.use(metricsMiddleware);
  const api = Router();
  api.get('/courses/:id', (req, res) => {
    res.json({ id: req.params.id });
  });
  api.get('/boom', () => {
    throw new Error('boom');
  });
  app.use('/api/v1', api);
  app.use((_req, res) => {
    res.status(404).json({ error: 'not found' });
  });
  app.use(
    (_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: 'internal' });
    },
  );
  return app;
}

/** Sự kiện `close` của response có thể đến chậm hơn một nhịp so với lúc client nhận xong -> đợi tới khi có. */
async function renderMetrics(waitFor = ''): Promise<string> {
  const deadline = Date.now() + 1000;
  let text = await metricsRegistry.metrics();
  while (!text.includes(waitFor) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    text = await metricsRegistry.metrics();
  }
  return text;
}

describe('metricsMiddleware', () => {
  beforeEach(() => {
    metricsRegistry.resetMetrics();
  });

  it('records requests by route pattern, not by the real URL', async () => {
    const app = buildApp();
    await request(app).get('/api/v1/courses/ck_abc123');
    await request(app).get('/api/v1/courses/ck_def456');
    const text = await renderMetrics('route="/api/v1/courses/:id",status="200"} 2');
    expect(text).toContain(
      'http_requests_total{method="GET",route="/api/v1/courses/:id",status="200"} 2',
    );
    expect(text).not.toContain('ck_abc123');
    expect(text).not.toContain('ck_def456');
    expect(text).toContain(
      'http_request_duration_seconds_count{method="GET",route="/api/v1/courses/:id",status="200"} 2',
    );
  });

  it('labels unknown paths as "unmatched" with their status code', async () => {
    await request(buildApp()).get('/api/v1/does-not-exist/ck777');
    const text = await renderMetrics('route="unmatched"');
    expect(text).toContain('http_requests_total{method="GET",route="unmatched",status="404"} 1');
    expect(text).not.toContain('ck777');
  });

  it('records 5xx responses', async () => {
    await request(buildApp()).get('/api/v1/boom');
    const text = await renderMetrics('status="500"');
    expect(text).toContain('http_requests_total{method="GET",route="/api/v1/boom",status="500"} 1');
  });

  it('returns the in-flight gauge to zero after the response', async () => {
    await request(buildApp()).get('/api/v1/courses/1');
    const text = await renderMetrics('http_requests_total{');
    expect(text).toMatch(/^http_requests_in_flight 0$/m);
  });
});

describe('AI metrics (exported for the AI module)', () => {
  it('registers ai_requests_total and ai_request_duration_seconds', async () => {
    metricsRegistry.resetMetrics();
    aiRequestsTotal.inc({ feature: 'chat', provider: 'mock', status: 'ok' });
    aiRequestDurationSeconds.observe({ feature: 'chat', provider: 'mock' }, 0.4);
    const text = await renderMetrics();
    expect(text).toContain('ai_requests_total{feature="chat",provider="mock",status="ok"} 1');
    expect(text).toContain('ai_request_duration_seconds_count{feature="chat",provider="mock"} 1');
  });
});

describe('isMetricsTokenValid', () => {
  const token = 'a-very-long-metrics-token';

  it('accepts only the exact bearer token', () => {
    expect(isMetricsTokenValid(`Bearer ${token}`, token)).toBe(true);
    expect(isMetricsTokenValid(`Bearer ${token}x`, token)).toBe(false);
    expect(isMetricsTokenValid(token, token)).toBe(false);
    expect(isMetricsTokenValid(undefined, token)).toBe(false);
  });
});

describe('GET /metrics (internal metrics app)', () => {
  it('serves Prometheus text format when no token is configured', async () => {
    const res = await request(createMetricsApp()).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('# TYPE http_request_duration_seconds histogram');
  });

  it('returns 401 without a valid bearer token when METRICS_TOKEN is set', async () => {
    const app = createMetricsApp('a-very-long-metrics-token');
    expect((await request(app).get('/metrics')).status).toBe(401);
    expect(
      (await request(app).get('/metrics').set('Authorization', 'Bearer wrong-token-value')).status,
    ).toBe(401);
    const ok = await request(app)
      .get('/metrics')
      .set('Authorization', 'Bearer a-very-long-metrics-token');
    expect(ok.status).toBe(200);
  });

  it('exposes nothing but /metrics', async () => {
    const res = await request(createMetricsApp()).get('/api/v1/health');
    expect(res.status).toBe(404);
  });
});

describe('route label cardinality', () => {
  beforeEach(() => {
    metricsRegistry.resetMetrics();
  });

  it('keeps the label set constant no matter how many different URLs are requested', async () => {
    const app = buildApp();
    for (let i = 0; i < 25; i += 1) {
      await request(app).get(`/api/v1/courses/ck_${i}`);
      await request(app).get(`/api/v1/scanner-${i}/.env`);
    }
    // Biến thể hoa/thường, dấu / cuối, query string -> vẫn cùng một nhãn.
    await request(app).get('/API/V1/courses/UPPER?utm=1');
    await request(app).get('/api/v1/courses/trailing/');
    const text = await renderMetrics('route="unmatched"');
    const routes = new Set(
      [...text.matchAll(/^http_requests_total\{[^}]*route="([^"]*)"/gm)].map((match) => match[1]),
    );
    expect([...routes].sort()).toEqual(['/api/v1/courses/:id', UNMATCHED_ROUTE]);
    expect(text).toContain(
      'http_requests_total{method="GET",route="/api/v1/courses/:id",status="200"} 27',
    );
    expect(text).toContain('http_requests_total{method="GET",route="unmatched",status="404"} 25');
  });

  it('does not use the HTTP method of unknown verbs as an unbounded label', async () => {
    const app = buildApp();
    await request(app).post('/api/v1/courses/ck1');
    const text = await renderMetrics('method="POST"');
    expect(text).toContain('http_requests_total{method="POST",route="unmatched",status="404"} 1');
  });
});

describe('startMetricsIfEnabled', () => {
  const API_PORT = 4999;

  it('is disabled (no listener at all) when METRICS_PORT is not set', () => {
    expect(startMetricsIfEnabled({ apiPort: API_PORT, host: '127.0.0.1' })).toEqual({
      status: 'disabled',
    });
  });

  it('refuses to reuse the public API port', () => {
    expect(startMetricsIfEnabled({ port: API_PORT, apiPort: API_PORT, host: '127.0.0.1' })).toEqual(
      { status: 'port-conflict' },
    );
  });

  it('opens a separate listener that serves process metrics and nothing else', async () => {
    const result = startMetricsIfEnabled({ port: 0, apiPort: API_PORT, host: '127.0.0.1' });
    if (result.status !== 'started') throw new Error(`unexpected status ${result.status}`);
    try {
      const metrics = await request(result.server).get('/metrics');
      expect(metrics.status).toBe(200);
      expect(metrics.text).toContain('process_cpu_seconds_total');
      expect(metrics.text).toContain('nodejs_eventloop_lag_seconds');
      expect((await request(result.server).get('/api/v1/health')).status).toBe(404);
    } finally {
      await new Promise((resolve) => result.server.close(resolve));
    }
  });

  it('requires the bearer token when METRICS_TOKEN is set', async () => {
    const token = 'metrics-token-with-16-plus-chars';
    const result = startMetricsIfEnabled({ port: 0, apiPort: API_PORT, host: '127.0.0.1', token });
    if (result.status !== 'started') throw new Error(`unexpected status ${result.status}`);
    try {
      expect((await request(result.server).get('/metrics')).status).toBe(401);
      const ok = await request(result.server)
        .get('/metrics')
        .set('Authorization', `Bearer ${token}`);
      expect(ok.status).toBe(200);
    } finally {
      await new Promise((resolve) => result.server.close(resolve));
    }
  });
});

describe('Grafana API dashboard', () => {
  const dashboardPath = path.resolve(__dirname, '../../../deploy/grafana/dashboards/api.json');
  // Các metric mặc định chỉ có trên Linux (container production) nên không có trong registry khi test trên Windows/macOS.
  const LINUX_ONLY = new Set([
    'process_open_fds',
    'process_max_fds',
    'process_virtual_memory_bytes',
    'process_heap_bytes',
  ]);
  const maybeIt = fs.existsSync(dashboardPath) ? it : it.skip;

  maybeIt('only queries metrics that the server really exposes', async () => {
    startDefaultMetrics();
    const exposed = new Set(
      [...(await metricsRegistry.metrics()).matchAll(/^# TYPE (\S+) /gm)].map((match) => match[1]),
    );
    const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8')) as {
      panels: { targets?: { expr: string }[] }[];
    };
    const used = new Set<string>();
    for (const panel of dashboard.panels) {
      for (const target of panel.targets ?? []) {
        for (const match of target.expr.matchAll(/\b((?:http|ai|nodejs|process)_[a-z0-9_]+)/g)) {
          used.add((match[1] as string).replace(/_(bucket|sum|count)$/, ''));
        }
      }
    }
    expect(used.size).toBeGreaterThan(5);
    const missing = [...used].filter((name) => !exposed.has(name) && !LINUX_ONLY.has(name));
    expect(missing).toEqual([]);
  });
});
