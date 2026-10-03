import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/** Test helper: a QueryClient with no retries and no gc timers, plus a provider wrapper for hooks. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

export function createQueryWrapper(client: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

export function makePage<T>(data: T[], page = 1, totalPages = 1) {
  return { data, meta: { page, limit: 20, total: data.length, totalPages } };
}

/** Resolves after TanStack Query's 0 ms notify timer. Await it inside `act()` to avoid act warnings. */
export function flushNotifications(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
