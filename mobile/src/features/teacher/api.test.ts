import { api } from '@/lib/apiClient';

import { teacherApi } from './api';

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

describe('teacherApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists top teachers, letting the caller add page params', async () => {
    await teacherApi.list();
    await teacherApi.list({ page: 2, limit: 10 });
    expect(mocked.getPage).toHaveBeenNthCalledWith(1, '/teachers', { sort: 'top' });
    expect(mocked.getPage).toHaveBeenNthCalledWith(2, '/teachers', {
      sort: 'top',
      page: 2,
      limit: 10,
    });
  });

  it('reads detail, courses and reviews of a teacher', async () => {
    await teacherApi.detail('t1');
    await teacherApi.courses('t1');
    await teacherApi.reviews('t1', { page: 2 });
    expect(mocked.get).toHaveBeenNthCalledWith(1, '/teachers/t1');
    expect(mocked.get).toHaveBeenNthCalledWith(2, '/teachers/t1/courses');
    expect(mocked.getPage).toHaveBeenCalledWith('/teachers/t1/reviews', { page: 2 });
  });

  it('follows with PUT and unfollows with DELETE', async () => {
    await teacherApi.follow('t1');
    await teacherApi.unfollow('t1');
    expect(mocked.put).toHaveBeenCalledWith('/teachers/t1/follow');
    expect(mocked.delete).toHaveBeenCalledWith('/teachers/t1/follow');
  });
});
