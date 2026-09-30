import { onlineManager } from '@tanstack/react-query';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { api, apiClient, setAccessToken, setUnauthorizedHandler } from './apiClient';
import { AppError, getErrorMessage, isAppError } from './appError';

type MockReply = { status: number; data?: unknown };

/** Replace the network layer of the shared axios instance with a scripted reply. */
function mockNetwork(handler: (config: InternalAxiosRequestConfig) => MockReply | 'network-error') {
  apiClient.defaults.adapter = async (config) => {
    const reply = handler(config);
    if (reply === 'network-error') {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    }
    const response = {
      data: reply.data,
      status: reply.status,
      statusText: '',
      headers: {},
      config,
    };
    if (reply.status >= 200 && reply.status < 300) return response;
    throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, response);
  };
}

describe('apiClient', () => {
  const onUnauthorized = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setAccessToken(null);
    setUnauthorizedHandler(onUnauthorized);
    onlineManager.setOnline(true);
  });

  afterAll(() => {
    setUnauthorizedHandler(null);
  });

  it('unwraps the { data } envelope', async () => {
    mockNetwork(() => ({ status: 200, data: { data: { id: 'u1' } } }));
    await expect(api.get<{ id: string }>('/auth/me')).resolves.toEqual({ id: 'u1' });
  });

  it('attaches the Bearer token', async () => {
    let authorization: unknown;
    mockNetwork((config) => {
      authorization = config.headers.get('Authorization');
      return { status: 200, data: { data: null } };
    });

    setAccessToken('abc.def');
    await api.get('/home');
    expect(authorization).toBe('Bearer abc.def');
  });

  it('drops empty query params', async () => {
    let params: unknown;
    mockNetwork((config) => {
      params = config.params;
      return { status: 200, data: { data: [] } };
    });

    await api.get('/courses', { q: '', page: 1, categoryId: undefined, isFree: false });
    expect(params).toEqual({ page: 1, isFree: false });
  });

  it('returns pagination meta from getPage', async () => {
    const meta = { page: 1, limit: 20, total: 1, totalPages: 1 };
    mockNetwork(() => ({ status: 200, data: { data: [{ id: 'c1' }], meta } }));
    await expect(api.getPage('/courses')).resolves.toEqual({ data: [{ id: 'c1' }], meta });
  });

  it('normalizes server errors into AppError', async () => {
    mockNetwork(() => ({
      status: 409,
      data: { error: { code: 'EMAIL_TAKEN', message: 'Email already used' } },
    }));

    const error = await api.post('/auth/register', {}).catch((e: unknown) => e);
    expect(isAppError(error)).toBe(true);
    expect(error).toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
      message: 'Email already used',
    });
    expect(getErrorMessage(error)).toBe('This email is already registered.');
  });

  it('normalizes a missing response into a network AppError', async () => {
    mockNetwork(() => 'network-error');
    const error = await api.get('/home').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect((error as AppError).isNetworkError).toBe(true);
  });

  it('logs out on 401 for authenticated requests only', async () => {
    mockNetwork(() => ({
      status: 401,
      data: { error: { code: 'UNAUTHORIZED', message: 'Token expired' } },
    }));

    // No token (e.g. wrong password on the login form): must NOT trigger a logout.
    await api.post('/auth/login', {}).catch(() => undefined);
    expect(onUnauthorized).not.toHaveBeenCalled();

    setAccessToken('expired.token');
    await api.get('/home').catch(() => undefined);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('blocks writes while offline but still allows reads', async () => {
    mockNetwork(() => ({ status: 200, data: { data: 'ok' } }));
    onlineManager.setOnline(false);

    const error = await api.post('/cart/items', { courseId: 'c1' }).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'OFFLINE', status: 0 });
    await expect(api.get('/home')).resolves.toBe('ok');
  });
});
