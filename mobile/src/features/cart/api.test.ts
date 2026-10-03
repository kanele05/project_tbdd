import { api } from '@/lib/apiClient';

import { cartApi } from './api';

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

describe('cartApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads the cart with GET /cart', async () => {
    mocked.get.mockResolvedValue({ items: [], totalCents: 0 });
    await expect(cartApi.get()).resolves.toEqual({ items: [], totalCents: 0 });
    expect(mocked.get).toHaveBeenCalledWith('/cart');
  });

  it('adds a course with POST /cart/items { courseId }', async () => {
    await cartApi.add('c1');
    expect(mocked.post).toHaveBeenCalledWith('/cart/items', { courseId: 'c1' });
  });

  it('removes a course with DELETE /cart/items/:courseId', async () => {
    await cartApi.remove('c1');
    expect(mocked.delete).toHaveBeenCalledWith('/cart/items/c1');
  });

  it('checks out with POST /orders/checkout and forwards the body', async () => {
    const body = { paymentMethod: 'MOCK_CARD', simulateFailure: true } as const;
    await cartApi.checkout(body);
    expect(mocked.post).toHaveBeenCalledWith('/orders/checkout', body);
  });
});
