import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@/components/ui/Toast';
import { STALE_TIME } from '@/constants/config';
import { getErrorMessage, type AppError } from '@/lib/appError';
import { queryKeys } from '@/lib/queryKeys';
import { selectIsLoggedIn, useAuthStore } from '@/stores/authStore';

import { notificationApi } from './api';
import {
  applyMarkAllRead,
  applyMarkRead,
  restoreSnapshot,
  takeSnapshot,
  type NotificationsSnapshot,
} from './notificationCache';

/**
 * Number on the Home bell badge (SC-04), from `GET /notifications/unread-count`.
 * `0` while loading, offline without cache, or logged out. Kept in sync optimistically by
 * `useMarkRead` / `useMarkAllRead`.
 */
export function useUnreadNotificationCount(): number {
  const isLoggedIn = useAuthStore(selectIsLoggedIn);
  const { data } = useQuery({
    queryKey: queryKeys.notificationsUnreadCount(),
    queryFn: () => notificationApi.unreadCount(),
    staleTime: STALE_TIME.notifications,
    enabled: isLoggedIn,
    select: (response) => response.count,
  });
  return data ?? 0;
}

/** `GET /notifications` (SC-22), infinite, newest first. */
export function useNotificationsInfinite() {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications(),
    queryFn: ({ pageParam }) => notificationApi.list({ page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: ({ meta }) => (meta.page < meta.totalPages ? meta.page + 1 : undefined),
    staleTime: STALE_TIME.notifications,
  });
}

type Context = { snapshot: NotificationsSnapshot };

/** `PATCH /notifications/:id/read` with an optimistic list + badge update; rolls back on error. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation<void, AppError, string, Context>({
    mutationFn: (notificationId) => notificationApi.markRead(notificationId),
    onMutate: async (notificationId) => {
      // `notifications()` is a prefix of the badge key, so this also stops a badge refetch.
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications() });
      const snapshot = takeSnapshot(queryClient);
      applyMarkRead(queryClient, notificationId);
      return { snapshot };
    },
    onError: (error, _id, context) => {
      if (context) restoreSnapshot(queryClient, context.snapshot);
      showToast(getErrorMessage(error), { type: 'error' });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
  });
}

/** `PATCH /notifications/read-all` with an optimistic update; rolls back on error. */
export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation<void, AppError, void, Context>({
    mutationFn: () => notificationApi.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications() });
      const snapshot = takeSnapshot(queryClient);
      applyMarkAllRead(queryClient);
      return { snapshot };
    },
    onError: (error, _vars, context) => {
      if (context) restoreSnapshot(queryClient, context.snapshot);
      showToast(getErrorMessage(error), { type: 'error' });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
  });
}
