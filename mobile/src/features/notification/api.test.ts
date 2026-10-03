import { api } from '@/lib/apiClient';

import { notificationApi } from './api';

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

describe('notificationApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists notifications with page params (defaults to none)', async () => {
    await notificationApi.list();
    await notificationApi.list({ page: 2, limit: 20 });
    expect(mocked.getPage).toHaveBeenNthCalledWith(1, '/notifications', {});
    expect(mocked.getPage).toHaveBeenNthCalledWith(2, '/notifications', { page: 2, limit: 20 });
  });

  it('reads the unread counter', async () => {
    await notificationApi.unreadCount();
    expect(mocked.get).toHaveBeenCalledWith('/notifications/unread-count');
  });

  it('marks one or all notifications as read with PATCH', async () => {
    await notificationApi.markRead('n1');
    await notificationApi.markAllRead();
    expect(mocked.patch).toHaveBeenNthCalledWith(1, '/notifications/n1/read');
    expect(mocked.patch).toHaveBeenNthCalledWith(2, '/notifications/read-all');
  });
});
