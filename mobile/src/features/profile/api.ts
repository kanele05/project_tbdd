import { PAGE_SIZE } from '@/constants/config';
import { api } from '@/lib/apiClient';
import type { CourseSummary, MeStatsDto } from '@/types/api';

export const profileApi = {
  /** `GET /me/stats` - saved / on going / completed counts (BR-15). */
  stats: () => api.get<MeStatsDto>('/me/stats'),
  /** `GET /me/bookmarks` - one page of saved courses, newest first. */
  bookmarks: (page: number) =>
    api.getPage<CourseSummary>('/me/bookmarks', { page, limit: PAGE_SIZE }),
};
