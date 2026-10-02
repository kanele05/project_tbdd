import { env } from '@/config/env';

/**
 * Chuyển đường dẫn tương đối (`/static/...`, `/uploads/...`) thành URL tuyệt đối bằng PUBLIC_BASE_URL.
 * URL đã tuyệt đối (http/https) được giữ nguyên. Mobile luôn nhận URL tuyệt đối.
 */
export function toAbsoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const normalized = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${env.PUBLIC_BASE_URL}${normalized}`;
}

/** Giống `toAbsoluteUrl` nhưng cho phép `null`/`undefined`. */
export function toAbsoluteUrlOrNull(pathOrUrl: string | null | undefined): string | null {
  return pathOrUrl ? toAbsoluteUrl(pathOrUrl) : null;
}
