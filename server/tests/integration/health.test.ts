import { API, createTestApi } from '../helpers/testApp';

describe('GET /api/v1/health', () => {
  const api = createTestApi();

  it('returns 200 with server and database status', async () => {
    const res = await api.get(`${API}/health`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: 'ok', db: 'ok' } });
  });

  it('sets an X-Request-Id header and security headers', async () => {
    const res = await api.get(`${API}/health`);
    expect(res.headers['x-request-id']).toBeTruthy();
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns 404 NOT_FOUND in the standard error format for unknown routes', async () => {
    const res = await api.get(`${API}/does-not-exist`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: expect.any(String) },
    });
  });

  it('serves files from /static', async () => {
    const res = await api.get('/static/resources/Document%201.txt');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
  });
});
