// Ảnh bìa: chỉ nhận đúng url do POST /teacher/uploads/image trả về (BR/FR-39), lưu dạng tương đối.
import { env } from '@/config/env';
import { toAbsoluteUrl } from '@/lib/url';

export const COURSE_UPLOAD_PREFIX = '/uploads/courses/';
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(png|jpe?g)$/i;

function relativePath(url: string): string | null {
  if (url.startsWith('/')) return url;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== new URL(env.PUBLIC_BASE_URL).origin) return null;
    if (parsed.search || parsed.hash) return null;
    return parsed.pathname;
  } catch {
    return null;
  }
}

/** Đường dẫn lưu DB (`/uploads/courses/<file>`) hoặc `null` nếu url không phải ảnh upload của app. */
export function toStoredThumbnail(url: string): string | null {
  const path = relativePath(url.trim());
  if (!path?.startsWith(COURSE_UPLOAD_PREFIX)) return null;
  const file = path.slice(COURSE_UPLOAD_PREFIX.length);
  return FILE_NAME.test(file) ? path : null;
}

export function isOwnUploadUrl(url: string): boolean {
  return toStoredThumbnail(url) !== null;
}

/** `""` (chưa có ảnh bìa) giữ nguyên; còn lại đổi thành URL tuyệt đối. */
export function thumbnailToDto(stored: string): string {
  return stored === '' ? '' : toAbsoluteUrl(stored);
}
