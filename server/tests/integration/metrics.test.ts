import { metricsRegistry } from '@/lib/metrics';

import { API, createTestApi } from '../helpers/testApp';

/** `close` của response có thể đến chậm hơn một nhịp so với lúc client nhận xong -> đợi tới khi có. */
async function metricsText(waitFor: string): Promise<string> {
  const deadline = Date.now() + 1000;
  let text = await metricsRegistry.metrics();
  while (!text.includes(waitFor) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    text = await metricsRegistry.metrics();
  }
  return text;
}

describe('HTTP metrics on the real app', () => {
  const api = createTestApi();

  beforeEach(() => {
    metricsRegistry.resetMetrics();
  });

  it('labels a successful request with the full route pattern', async () => {
    await api.get(`${API}/health`);
    const text = await metricsText('route="/api/v1/health"');
    expect(text).toContain(
      'http_requests_total{method="GET",route="/api/v1/health",status="200"} 1',
    );
  });

  it('keeps the same prefix for errors raised inside a nested router (401 from requireAuth)', async () => {
    const res = await api.get(`${API}/auth/me`);
    expect(res.status).toBe(401);
    const text = await metricsText('route="/api/v1/auth/me"');
    expect(text).toContain(
      'http_requests_total{method="GET",route="/api/v1/auth/me",status="401"} 1',
    );
  });

  it('does not create a label per unknown URL', async () => {
    await api.get(`${API}/does-not-exist-123`);
    await api.get('/wp-login.php');
    const text = await metricsText('route="unmatched",status="404"} 2');
    expect(text).toContain('http_requests_total{method="GET",route="unmatched",status="404"} 2');
    expect(text).not.toContain('does-not-exist-123');
    expect(text).not.toContain('wp-login');
  });

  it('groups static files under one label', async () => {
    await api.get('/static/resources/Document%201.txt');
    const text = await metricsText('route="/static/*"');
    expect(text).toContain('http_requests_total{method="GET",route="/static/*",status="200"} 1');
  });

  it('uses one label for every id of a parameterised route (no per-id series, no id leaked)', async () => {
    for (const id of ['ck_aaa111', 'ck_bbb222', 'ck_ccc333']) {
      await api.get(`${API}/courses/${id}`);
    }
    const countFor = (text: string) =>
      [
        ...text.matchAll(
          /^http_requests_total\{[^}]*route="\/api\/v1\/courses\/:id"[^}]*\} (\d+)/gm,
        ),
      ].reduce((sum, match) => sum + Number(match[1]), 0);
    const deadline = Date.now() + 1000;
    let text = await metricsRegistry.metrics();
    while (countFor(text) < 3 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      text = await metricsRegistry.metrics();
    }
    expect(countFor(text)).toBe(3);
    expect(text).not.toMatch(/ck_(aaa111|bbb222|ccc333)/);
  });

  it('does not expose /metrics on the public API app', async () => {
    expect((await api.get('/metrics')).status).toBe(404);
    expect((await api.get(`${API}/metrics`)).status).toBe(404);
  });
});
