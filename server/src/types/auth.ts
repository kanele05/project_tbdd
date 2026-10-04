import type { Lang } from '@/lib/lang';

export type AuthUser = {
  id: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  /** Id phiên đăng nhập (claim `sid` của access token). */
  sessionId: string;
};

/** Thông tin về thiết bị/ngôn ngữ của request đang xử lý (rút từ `req` ở controller). */
export type ClientContext = {
  ip: string | null;
  userAgent: string | null;
  lang: Lang;
};
