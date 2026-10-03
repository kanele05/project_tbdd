import { api } from '@/lib/apiClient';

import { bookmarkApi } from './api';

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

describe('bookmarkApi', () => {
  it('saves with PUT and removes with DELETE on /courses/:id/bookmark', async () => {
    await bookmarkApi.add('c1');
    await bookmarkApi.remove('c1');
    expect(mocked.put).toHaveBeenCalledWith('/courses/c1/bookmark');
    expect(mocked.delete).toHaveBeenCalledWith('/courses/c1/bookmark');
  });
});
