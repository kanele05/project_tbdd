import { PAGE_SIZE } from '@/constants/config';
import { api } from '@/lib/apiClient';

import { reviewApi } from './api';

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

describe('reviewApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists reviews with the star filter and page size', async () => {
    await reviewApi.list('c1', { rating: 4, page: 2 });
    expect(mocked.getPage).toHaveBeenCalledWith('/courses/c1/reviews', {
      rating: 4,
      page: 2,
      limit: PAGE_SIZE,
    });
  });

  it('returns my review, or null when the server has none', async () => {
    mocked.get.mockResolvedValueOnce({ id: 'r1' });
    await expect(reviewApi.mine('c1')).resolves.toEqual({ id: 'r1' });
    mocked.get.mockResolvedValueOnce(undefined);
    await expect(reviewApi.mine('c1')).resolves.toBeNull();
    expect(mocked.get).toHaveBeenCalledWith('/courses/c1/reviews/me');
  });

  it('saves with PUT /courses/:id/reviews/me', async () => {
    const input = { rating: 5, content: 'Great course, learned a lot' };
    await reviewApi.save('c1', input);
    expect(mocked.put).toHaveBeenCalledWith('/courses/c1/reviews/me', input);
  });
});
