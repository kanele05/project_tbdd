import { onlineManager } from '@tanstack/react-query';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { api, apiClient, getAccessToken, setAccessToken } from './apiClient';

type Reply = { status: number; data?: unknown };

const seen: InternalAxiosRequestConfig[] = [];

function mockNetwork(reply: Reply) {
  apiClient.defaults.adapter = async (config) => {
    seen.push(config);
    return { data: reply.data, status: reply.status, statusText: '', headers: {}, config };
  };
}

describe('apiClient write helpers', () => {
  beforeEach(() => {
    seen.length = 0;
    setAccessToken(null);
    onlineManager.setOnline(true);
  });

  it('keeps the access token readable through getAccessToken', () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken('t');
    expect(getAccessToken()).toBe('t');
  });

  it('unwraps data for post, put and patch', async () => {
    mockNetwork({ status: 200, data: { data: { id: 1 } } });
    await expect(api.post('/x', { a: 1 })).resolves.toEqual({ id: 1 });
    await expect(api.put('/x', { a: 1 })).resolves.toEqual({ id: 1 });
    await expect(api.patch('/x', { a: 1 })).resolves.toEqual({ id: 1 });
    expect(seen.map((config) => config.method)).toEqual(['post', 'put', 'patch']);
  });

  it('resolves undefined on 204 No Content', async () => {
    mockNetwork({ status: 204 });
    await expect(api.delete('/cart/items/c1')).resolves.toBeUndefined();
    await expect(api.put('/courses/c1/bookmark')).resolves.toBeUndefined();
    expect(seen[0]?.method).toBe('delete');
  });

  it('returns data and meta together from getWithMeta', async () => {
    mockNetwork({ status: 200, data: { data: [1], meta: { unreadCount: 3 } } });
    await expect(api.getWithMeta('/notifications')).resolves.toEqual({
      data: [1],
      meta: { unreadCount: 3 },
    });
  });

  it('sends multipart uploads with a longer timeout and reports upload progress', async () => {
    apiClient.defaults.adapter = async (config) => {
      seen.push(config);
      config.onUploadProgress?.({ loaded: 25, total: 100, bytes: 25, lengthComputable: true });
      config.onUploadProgress?.({ loaded: 1, bytes: 1, lengthComputable: false });
      return {
        data: { data: { avatarUrl: 'u' } },
        status: 200,
        statusText: '',
        headers: {},
        config,
      };
    };
    const onProgress = jest.fn();

    const result = await api.postForm<{ avatarUrl: string }>(
      '/me/avatar',
      new FormData(),
      onProgress,
    );

    expect(result).toEqual({ avatarUrl: 'u' });
    expect(seen[0]?.timeout).toBe(60_000);
    expect(seen[0]?.headers.get('Content-Type')).toContain('multipart/form-data');
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(25);
  });

  it('blocks multipart uploads while offline', async () => {
    mockNetwork({ status: 200, data: { data: null } });
    onlineManager.setOnline(false);
    await expect(api.postForm('/me/avatar', new FormData())).rejects.toMatchObject({
      code: 'OFFLINE',
    });
    expect(seen).toHaveLength(0);
  });

  it('rejects a timeout as a network AppError', async () => {
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED', config);
    };
    await expect(api.get('/home')).rejects.toMatchObject({ status: 0, code: 'TIMEOUT' });
  });
});
