import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/stores/authStore';
import { createQueryWrapper, createTestQueryClient, flushNotifications } from '@/test/queryWrapper';
import type { NotificationDto, NotificationsPage } from '@/types/api';

import { notificationApi } from './api';
import { useNotificationsInfinite, useUnreadNotificationCount } from './hooks';

jest.mock('./api', () => ({
  notificationApi: {
    list: jest.fn(),
    unreadCount: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  },
}));
jest.mock('@/components/ui/Toast', () => ({ showToast: jest.fn() }));

const api = jest.mocked(notificationApi);

function notification(id: string): NotificationDto {
  return {
    id,
    type: 'ORDER_PAID',
    title: 't',
    body: 'b',
    data: null,
    isRead: false,
    createdAt: '2026-10-01T00:00:00.000Z',
  };
}

function page(ids: string[], pageNumber: number, totalPages: number): NotificationsPage {
  return {
    data: ids.map(notification),
    meta: { page: pageNumber, limit: 20, total: 3, totalPages, unreadCount: 3 },
  };
}

afterEach(async () => {
  await act(flushNotifications);
  await act(async () => {
    useAuthStore.setState({ status: 'idle' });
  });
});

describe('useUnreadNotificationCount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is 0 and never calls the server for a logged-out user', async () => {
    useAuthStore.setState({ status: 'unauthenticated' });
    const { result } = await renderHook(() => useUnreadNotificationCount(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    expect(result.current).toBe(0);
    expect(api.unreadCount).not.toHaveBeenCalled();
  });

  it('shows the server count for a logged-in user', async () => {
    useAuthStore.setState({ status: 'authenticated' });
    api.unreadCount.mockResolvedValue({ count: 7 });
    const { result } = await renderHook(() => useUnreadNotificationCount(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current).toBe(7));
  });
});

describe('useNotificationsInfinite', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads page 1, then page 2, and stops after the last page', async () => {
    api.list
      .mockResolvedValueOnce(page(['n1', 'n2'], 1, 2))
      .mockResolvedValueOnce(page(['n3'], 2, 2));
    const { result } = await renderHook(() => useNotificationsInfinite(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(api.list).toHaveBeenNthCalledWith(1, { page: 1 });
    expect(api.list).toHaveBeenNthCalledWith(2, { page: 2 });
    expect(result.current.hasNextPage).toBe(false);
  });
});
