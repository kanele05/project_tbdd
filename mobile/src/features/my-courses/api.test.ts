import { api } from '@/lib/apiClient';

import { myCoursesApi } from './api';

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

describe('myCoursesApi', () => {
  it('sends the status filter as a query param', async () => {
    await myCoursesApi.list('ongoing');
    expect(mocked.get).toHaveBeenCalledWith('/me/courses', { status: 'ongoing' });
  });
});
