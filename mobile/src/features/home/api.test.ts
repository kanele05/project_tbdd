import { api } from '@/lib/apiClient';

import { homeApi } from './api';

jest.mock('@/lib/apiClient', () => ({
  api: {
    get: jest.fn(),
    getPage: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    postForm: jest.fn(),
  },
}));

const mocked = api as jest.Mocked<typeof api>;

describe('homeApi', () => {
  it('loads the whole home screen with a single GET /home', async () => {
    mocked.get.mockResolvedValue({ banners: [] });
    await expect(homeApi.get()).resolves.toEqual({ banners: [] });
    expect(mocked.get).toHaveBeenCalledTimes(1);
    expect(mocked.get).toHaveBeenCalledWith('/home');
  });
});
