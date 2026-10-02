import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { showToast } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import type { NotificationDto } from '@/types/api';

import { notificationApi } from './api';
import { useMarkAllRead, useMarkRead, useUnreadNotificationCount } from './hooks';
import type { NotificationsData } from './notificationCache';

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
const clients: QueryClient[] = [];

function notification(id: string, isRead: boolean): NotificationDto {
  return {
    id,
    type: 'ORDER_PAID',
    title: 't',
    body: 'b',
    data: null,
    isRead,
    createdAt: '2026-10-01T00:00:00.000Z',
  };
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.push(queryClient);
  const list: NotificationsData = {
    pageParams: [1],
    pages: [
      {
        data: [notification('a', false), notification('b', false)],
        meta: { page: 1, limit: 20, total: 2, totalPages: 1, unreadCount: 2 },
      },
    ],
  };
  queryClient.setQueryData(queryKeys.notifications(), list);
  queryClient.setQueryData(queryKeys.notificationsUnreadCount(), { count: 2 });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

const getList = (client: QueryClient) =>
  client.getQueryData<NotificationsData>(queryKeys.notifications());
const getCount = (client: QueryClient) =>
  client.getQueryData<{ count: number }>(queryKeys.notificationsUnreadCount())?.count;

describe('notification hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ status: 'authenticated' });
  });

  afterEach(() => {
    clients.forEach((client) => client.clear());
    clients.length = 0;
  });

  it('useUnreadNotificationCount returns the count from the server', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    clients.push(queryClient);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    api.unreadCount.mockResolvedValue({ count: 7 });
    const { result } = await renderHook(() => useUnreadNotificationCount(), { wrapper });

    await waitFor(() => expect(result.current).toBe(7));
  });

  it('useUnreadNotificationCount is 0 and does not fetch when logged out', async () => {
    useAuthStore.setState({ status: 'unauthenticated' });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    clients.push(queryClient);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = await renderHook(() => useUnreadNotificationCount(), { wrapper });

    expect(result.current).toBe(0);
    expect(api.unreadCount).not.toHaveBeenCalled();
  });

  it('useMarkRead updates the list and the badge immediately', async () => {
    const { queryClient, wrapper } = setup();
    let resolveRequest: () => void = () => undefined;
    api.markRead.mockReturnValue(new Promise<void>((resolve) => (resolveRequest = resolve)));
    const { result } = await renderHook(() => useMarkRead(), { wrapper });

    await act(async () => result.current.mutate('a'));

    await waitFor(() => expect(getCount(queryClient)).toBe(1));
    expect(getList(queryClient)?.pages[0]?.data[0]?.isRead).toBe(true);
    expect(getList(queryClient)?.pages[0]?.meta.unreadCount).toBe(1);
    expect(api.markRead).toHaveBeenCalledWith('a');

    await act(async () => resolveRequest());
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it('useMarkRead rolls back and shows a toast on error', async () => {
    const { queryClient, wrapper } = setup();
    api.markRead.mockRejectedValue(
      new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'x' }),
    );
    const { result } = await renderHook(() => useMarkRead(), { wrapper });

    await act(async () => result.current.mutate('a'));

    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(getCount(queryClient)).toBe(2);
    expect(getList(queryClient)?.pages[0]?.data[0]?.isRead).toBe(false);
  });

  it('useMarkAllRead clears everything optimistically', async () => {
    const { queryClient, wrapper } = setup();
    api.markAllRead.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useMarkAllRead(), { wrapper });

    await act(async () => result.current.mutate());

    await waitFor(() => expect(getCount(queryClient)).toBe(0));
    expect(getList(queryClient)?.pages[0]?.data.every((n) => n.isRead)).toBe(true);
    expect(getList(queryClient)?.pages[0]?.meta.unreadCount).toBe(0);
    expect(api.markAllRead).toHaveBeenCalled();
  });
});
