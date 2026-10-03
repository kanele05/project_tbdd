import { api } from '@/lib/apiClient';

import { learningApi } from './api';

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

describe('learningApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads the curriculum and a lesson', async () => {
    await learningApi.curriculum('c1');
    await learningApi.lesson('l1');
    expect(mocked.get).toHaveBeenNthCalledWith(1, '/courses/c1/curriculum');
    expect(mocked.get).toHaveBeenNthCalledWith(2, '/lessons/l1');
  });

  it('saves progress with PUT /lessons/:id/progress and the given body', async () => {
    const body = { positionSec: 120, isCompleted: true };
    await learningApi.saveProgress('l1', body);
    expect(mocked.put).toHaveBeenCalledWith('/lessons/l1/progress', body);
  });

  it('likes, unlikes and shares a course', async () => {
    await learningApi.like('c1');
    await learningApi.unlike('c1');
    await learningApi.share('c1');
    expect(mocked.put).toHaveBeenCalledWith('/courses/c1/like');
    expect(mocked.delete).toHaveBeenCalledWith('/courses/c1/like');
    expect(mocked.post).toHaveBeenCalledWith('/courses/c1/share');
  });
});
