import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';

import { getCachedCourseImage } from './cachedCourseImage';

describe('getCachedCourseImage', () => {
  afterEach(() => queryClient.clear());

  it('returns null when the course is not in the cache', () => {
    expect(getCachedCourseImage('missing')).toBeNull();
  });

  it('returns the thumbnail of a cached course', () => {
    queryClient.setQueryData(queryKeys.course('c1'), {
      id: 'c1',
      thumbnailUrl: 'https://img/t.jpg',
      bannerUrl: 'https://img/b.jpg',
    });
    expect(getCachedCourseImage('c1')).toBe('https://img/t.jpg');
  });

  it('falls back to the banner, then to null', () => {
    queryClient.setQueryData(queryKeys.course('c2'), { id: 'c2', bannerUrl: 'https://img/b.jpg' });
    expect(getCachedCourseImage('c2')).toBe('https://img/b.jpg');
    queryClient.setQueryData(queryKeys.course('c3'), { id: 'c3' });
    expect(getCachedCourseImage('c3')).toBeNull();
  });
});
