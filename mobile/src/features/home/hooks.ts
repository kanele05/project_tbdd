import { useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/constants/config';
import { queryKeys } from '@/lib/queryKeys';

import { homeApi } from './api';

/**
 * `GET /home` - persisted (opens instantly from cache, then refreshes in the background),
 * staleTime 5 min. Shared by Home (SC-04) and the "Recommended for you" list of Search (SC-05).
 */
export function useHome() {
  return useQuery({
    queryKey: queryKeys.home(),
    queryFn: homeApi.get,
    staleTime: STALE_TIME.home,
  });
}
