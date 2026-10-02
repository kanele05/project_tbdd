import { api } from '@/lib/apiClient';
import type { HomeResponse } from '@/types/api';

export const homeApi = {
  /** `GET /home` - banners, categories, popular, recommended, inspires, topTeachers in 1 request. */
  get: () => api.get<HomeResponse>('/home'),
};
