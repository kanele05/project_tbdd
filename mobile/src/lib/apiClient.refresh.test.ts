import { onlineManager } from '@tanstack/react-query';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import {
  api,
  apiClient,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  refreshClient,
  setAuthTokens,
  setTokensRefreshedHandler,
  setUnauthorizedHandler,
} from './apiClient';

type Reply = { status: number; data?: unknown };
type Adapter = NonNullable<typeof apiClient.defaults.adapter>;

function toResponse(config: InternalAxiosRequestConfig, reply: Reply) {
  const response = { data: reply.data, status: reply.status, statusText: '', headers: {}, config };
  if (reply.status >= 200 && reply.status < 300) return response;
  throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, response);
}

const UNAUTHORIZED: Reply = {
  status: 401,
  data: { error: { code: 'UNAUTHORIZED', message: 'Token expired' } },
};

function session(accessToken: string, refreshToken: string): Reply {
  return {
    status: 200,
    data: { data: { accessToken, refreshToken, accessTokenExpiresIn: 900, user: {} } },
  };
}

/** Requests the API answered, in order: `"GET /home (Bearer old)"`. */
let apiCalls: string[];
let refreshBodies: unknown[];
let refreshHeaders: unknown[];

function describeCall(config: InternalAxiosRequestConfig): string {
  const auth = String(config.headers.get('Authorization') ?? '');
  const bearer = auth ? ` (${auth.replace('Bearer ', 'Bearer ')})` : '';
  return `${(config.method ?? 'get').toUpperCase()} ${config.url}${bearer}`;
}

/** The API rejects `Bearer old*` with 401 and accepts anything else. */
function mockApi(
  handler?: (config: InternalAxiosRequestConfig) => Promise<Reply> | Reply | undefined,
) {
  const adapter: Adapter = async (config) => {
    apiCalls.push(describeCall(config));
    const custom = handler ? await handler(config) : undefined;
    if (custom) return toResponse(config, custom);
    const isOld = String(config.headers.get('Authorization') ?? '').startsWith('Bearer old');
    return toResponse(config, isOld ? UNAUTHORIZED : { status: 200, data: { data: 'ok' } });
  };
  apiClient.defaults.adapter = adapter;
}

function mockRefresh(handler: (config: InternalAxiosRequestConfig) => Promise<Reply> | Reply) {
  const adapter: Adapter = async (config) => {
    refreshBodies.push(JSON.parse(String(config.data)));
    refreshHeaders.push(config.headers.get('Authorization') ?? null);
    return toResponse(config, await handler(config));
  };
  refreshClient.defaults.adapter = adapter;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('apiClient token refresh', () => {
  const onUnauthorized = jest.fn();
  const onRefreshed = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    apiCalls = [];
    refreshBodies = [];
    refreshHeaders = [];
    onlineManager.setOnline(true);
    setAuthTokens({ accessToken: 'old', refreshToken: 'r1' });
    setUnauthorizedHandler(onUnauthorized);
    setTokensRefreshedHandler(onRefreshed);
    mockApi();
    mockRefresh(() => session('new', 'r2'));
  });

  afterAll(() => {
    setAuthTokens(null);
    setUnauthorizedHandler(null);
    setTokensRefreshedHandler(null);
  });

  it('refreshes after a 401, stores the rotated pair and replays the request once', async () => {
    await expect(api.get('/home')).resolves.toBe('ok');

    expect(apiCalls).toEqual(['GET /home (Bearer old)', 'GET /home (Bearer new)']);
    expect(refreshBodies).toEqual([{ refreshToken: 'r1' }]);
    expect(onRefreshed).toHaveBeenCalledWith({ accessToken: 'new', refreshToken: 'r2' });
    expect(getAccessToken()).toBe('new');
    expect(getRefreshToken()).toBe('r2');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('sends the refresh request without the expired Bearer token', async () => {
    await api.get('/home');
    expect(refreshHeaders).toEqual([null]);
  });

  it('shares ONE refresh between concurrent 401s and replays every request', async () => {
    const gate = deferred<Reply>();
    mockRefresh(() => gate.promise);

    const requests = Promise.all([
      api.get('/a'),
      api.get('/b'),
      api.get('/c'),
      api.get('/d'),
      api.get('/e'),
    ]);
    // Let all five hit the 401 and queue on the same refresh before it answers.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(refreshBodies).toHaveLength(1);
    gate.resolve(session('new', 'r2'));

    await expect(requests).resolves.toEqual(['ok', 'ok', 'ok', 'ok', 'ok']);
    expect(refreshBodies).toHaveLength(1);
    expect(onRefreshed).toHaveBeenCalledTimes(1);
    expect(apiCalls.filter((call) => call.includes('Bearer new'))).toHaveLength(5);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('replays a late 401 with the already refreshed token instead of refreshing again', async () => {
    const lateReply = deferred<Reply>();
    mockApi((config) => {
      const isOld = String(config.headers.get('Authorization') ?? '').startsWith('Bearer old');
      // The second request was sent before the refresh finished but its 401 arrives after it.
      return isOld && config.url === '/slow' ? lateReply.promise : undefined;
    });

    const slow = api.get('/slow');
    const fast = api.get('/fast');
    await expect(fast).resolves.toBe('ok');
    expect(refreshBodies).toHaveLength(1);

    lateReply.resolve(UNAUTHORIZED);
    await expect(slow).resolves.toBe('ok');

    expect(refreshBodies).toHaveLength(1);
    expect(apiCalls).toContain('GET /slow (Bearer new)');
  });

  it('does not replay a request more than once (no infinite loop)', async () => {
    mockApi(() => UNAUTHORIZED);

    const error = await api.get('/home').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 401 });
    expect(apiCalls).toEqual(['GET /home (Bearer old)', 'GET /home (Bearer new)']);
    expect(refreshBodies).toHaveLength(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('ends the session once when the refresh token is refused, however many requests wait', async () => {
    mockRefresh(() => ({
      status: 401,
      data: { error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' } },
    }));

    const results = await Promise.all([
      api.get('/a').catch((e: unknown) => e),
      api.get('/b').catch((e: unknown) => e),
      api.get('/c').catch((e: unknown) => e),
    ]);

    for (const result of results) expect(result).toMatchObject({ status: 401 });
    expect(refreshBodies).toHaveLength(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onRefreshed).not.toHaveBeenCalled();
  });

  it('keeps the session when the refresh fails because of the network', async () => {
    refreshClient.defaults.adapter = async (config) => {
      refreshBodies.push(JSON.parse(String(config.data)));
      throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    };

    const error = await api.get('/home').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(getRefreshToken()).toBe('r1');

    // The next request is allowed to try again (the failed refresh is not cached).
    mockRefresh(() => session('new', 'r2'));
    await expect(api.get('/home')).resolves.toBe('ok');
    expect(refreshBodies).toHaveLength(2);
  });

  it('keeps the session when the refresh endpoint answers 5xx or 429', async () => {
    for (const status of [503, 429]) {
      mockRefresh(() => ({ status, data: { error: { code: 'X', message: 'later' } } }));
      const error = await api.get('/home').catch((e: unknown) => e);
      expect(error).toMatchObject({ status });
    }
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not refresh a request that never had a token', async () => {
    setAuthTokens(null);
    mockApi(() => UNAUTHORIZED);

    const error = await api.get('/home').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 401 });
    expect(refreshBodies).toHaveLength(0);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not treat a wrong password as an expired session (auth entry endpoints)', async () => {
    mockApi(() => UNAUTHORIZED);

    for (const path of ['/auth/login', '/auth/2fa/verify', '/auth/verify-email']) {
      await api.post(path, {}).catch(() => undefined);
    }

    expect(refreshBodies).toHaveLength(0);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('logs out straight away when the session has no refresh token (legacy access-only)', async () => {
    setAuthTokens({ accessToken: 'old-legacy', refreshToken: null });

    const error = await api.get('/home').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 401 });
    expect(refreshBodies).toHaveLength(0);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('drops the refresh result when the user logged out while it was in flight', async () => {
    const gate = deferred<Reply>();
    mockRefresh(() => gate.promise);

    const request = api.get('/home').catch((e: unknown) => e);
    await new Promise((resolve) => setTimeout(resolve, 20));
    setAuthTokens(null); // logout while POST /auth/refresh is pending
    gate.resolve(session('new', 'r2'));

    await expect(request).resolves.toMatchObject({ status: 401 });
    expect(onRefreshed).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('waits for the new tokens to be persisted before replaying', async () => {
    const order: string[] = [];
    setTokensRefreshedHandler(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push('persisted');
    });
    const adapter: Adapter = async (config) => {
      const call = describeCall(config);
      if (call.includes('Bearer new')) order.push('replayed');
      const isOld = call.includes('Bearer old');
      return toResponse(config, isOld ? UNAUTHORIZED : { status: 200, data: { data: 'ok' } });
    };
    apiClient.defaults.adapter = adapter;

    await api.get('/home');

    expect(order).toEqual(['persisted', 'replayed']);
  });

  it('survives a persistence failure: the in-memory session keeps working', async () => {
    setTokensRefreshedHandler(() => {
      throw new Error('storage full');
    });

    await expect(api.get('/home')).resolves.toBe('ok');
    expect(getAccessToken()).toBe('new');
  });

  describe('refreshAccessToken (bootstrap / non-axios callers)', () => {
    it('resolves the new access token and rotates the pair', async () => {
      await expect(refreshAccessToken()).resolves.toBe('new');
      expect(getRefreshToken()).toBe('r2');
      expect(onRefreshed).toHaveBeenCalledTimes(1);
    });

    it('shares the in-flight refresh with the interceptor', async () => {
      const gate = deferred<Reply>();
      mockRefresh(() => gate.promise);

      const viaRequest = api.get('/home');
      await new Promise((resolve) => setTimeout(resolve, 20));
      const direct = refreshAccessToken();
      gate.resolve(session('new', 'r2'));

      await expect(Promise.all([viaRequest, direct])).resolves.toEqual(['ok', 'new']);
      expect(refreshBodies).toHaveLength(1);
    });

    it('rejects with the 401 and ends the session when the refresh token is refused', async () => {
      mockRefresh(() => ({
        status: 401,
        data: { error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' } },
      }));

      await expect(refreshAccessToken()).rejects.toMatchObject({
        status: 401,
        code: 'INVALID_REFRESH_TOKEN',
      });
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('rejects without ending the session on a network failure', async () => {
      refreshClient.defaults.adapter = async (config) => {
        throw new AxiosError('Network Error', 'ERR_NETWORK', config);
      };

      await expect(refreshAccessToken()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
      expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it('rejects when there is no refresh token', async () => {
      setAuthTokens({ accessToken: 'old', refreshToken: null });
      await expect(refreshAccessToken()).rejects.toMatchObject({ status: 401 });
    });
  });
});
