import { api } from '@/lib/apiClient';

import { courseApi } from './api';

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

describe('courseApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls the detail, similar, enroll and lesson endpoints', async () => {
    await courseApi.detail('c1');
    await courseApi.similar('c1');
    await courseApi.enroll('c1');
    await courseApi.lesson('l1');

    expect(mocked.get).toHaveBeenNthCalledWith(1, '/courses/c1');
    expect(mocked.get).toHaveBeenNthCalledWith(2, '/courses/c1/similar');
    expect(mocked.post).toHaveBeenCalledWith('/courses/c1/enroll');
    expect(mocked.get).toHaveBeenNthCalledWith(3, '/lessons/l1');
  });
});
