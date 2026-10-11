import { api } from '@/lib/apiClient';

import { adminApi } from './api';

jest.mock('@/lib/apiClient', () => ({
  api: { get: jest.fn(), getPage: jest.fn(), post: jest.fn() },
}));

const mocked = jest.mocked(api);

describe('adminApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads the stats and the queue', async () => {
    await adminApi.stats();
    await adminApi.courses({ type: 'revision', status: 'PENDING_REVIEW', page: 2 });
    expect(mocked.get).toHaveBeenCalledWith('/admin/stats');
    expect(mocked.getPage).toHaveBeenCalledWith('/admin/courses', {
      type: 'revision',
      status: 'PENDING_REVIEW',
      page: 2,
    });
  });

  it('posts the moderation decisions', async () => {
    await adminApi.approve('c1');
    await adminApi.reject('c1', { reason: 'Not good enough' });
    await adminApi.archive('c1');
    await adminApi.restore('c1', { reason: 'Fixed now' });
    expect(mocked.post).toHaveBeenNthCalledWith(1, '/admin/courses/c1/approve');
    expect(mocked.post).toHaveBeenNthCalledWith(2, '/admin/courses/c1/reject', {
      reason: 'Not good enough',
    });
    expect(mocked.post).toHaveBeenNthCalledWith(3, '/admin/courses/c1/archive', {});
    expect(mocked.post).toHaveBeenNthCalledWith(4, '/admin/courses/c1/restore', {
      reason: 'Fixed now',
    });
  });

  it('asks the AI review in the given language with the long AI timeout', async () => {
    await adminApi.aiReview('c1', 'vi');
    expect(mocked.get).toHaveBeenCalledWith(
      '/admin/courses/c1/ai-review',
      { lang: 'vi' },
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });

  it('lists, disables and enables users', async () => {
    await adminApi.users({ search: 'lan', status: 'active' });
    await adminApi.disableUser('u1', { reason: 'Spam account' });
    await adminApi.enableUser('u1');
    expect(mocked.getPage).toHaveBeenCalledWith('/admin/users', {
      search: 'lan',
      status: 'active',
    });
    expect(mocked.post).toHaveBeenCalledWith('/admin/users/u1/disable', { reason: 'Spam account' });
    expect(mocked.post).toHaveBeenCalledWith('/admin/users/u1/enable');
  });
});
