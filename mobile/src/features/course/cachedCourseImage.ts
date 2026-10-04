import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Thumbnail of a course that is already in the query cache (the user usually comes from its detail
 * screen). Used as the blurred photo of the cinematic form headers; `null` falls back to a bundled
 * poster. Reads the cache only: it never triggers a request.
 */
export function getCachedCourseImage(courseId: string): string | null {
  const data: unknown = queryClient.getQueryData(queryKeys.course(courseId));
  if (typeof data !== 'object' || data === null) return null;
  const { thumbnailUrl, bannerUrl } = data as { thumbnailUrl?: unknown; bannerUrl?: unknown };
  if (typeof thumbnailUrl === 'string' && thumbnailUrl) return thumbnailUrl;
  return typeof bannerUrl === 'string' && bannerUrl ? bannerUrl : null;
}
