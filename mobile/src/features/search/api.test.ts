import { api } from '@/lib/apiClient';

import { searchApi } from './api';

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

describe('searchApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('passes the filter params straight to GET /courses', async () => {
    const params = { q: 'java', page: 1, limit: 20 };
    await searchApi.courses(params);
    expect(mocked.getPage).toHaveBeenCalledWith('/courses', params);
  });

  it('loads categories and hot tags', async () => {
    await searchApi.categories();
    await searchApi.hotTags();
    expect(mocked.get).toHaveBeenNthCalledWith(1, '/categories');
    expect(mocked.get).toHaveBeenNthCalledWith(2, '/tags/hot');
  });
});
