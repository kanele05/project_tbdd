import type { FetchStatus } from '@tanstack/react-query';

import { i18n } from '@/i18n';
import { AppError } from '@/lib/appError';

/**
 * Error object handed to `ErrorState` when a query has nothing to show and cannot even start
 * because the device is offline (TanStack Query pauses it instead of failing).
 */
export const OFFLINE_QUERY_ERROR = new AppError({
  status: 0,
  code: 'NETWORK_ERROR',
  // Screens show the localized message mapped to the NETWORK_ERROR code; this is only a fallback.
  message: i18n.t('errors:network'),
});

/**
 * `true` when a query is still "pending" (no data) but paused - i.e. it is waiting for the
 * network. Screens should show the offline error state instead of an endless skeleton.
 */
export function isOfflineWithoutData(query: {
  isPending: boolean;
  fetchStatus: FetchStatus;
}): boolean {
  return query.isPending && query.fetchStatus === 'paused';
}
