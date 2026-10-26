import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useCallback } from 'react';
import { Platform, Share } from 'react-native';

import { showToast } from '@/components/ui/Toast';
import { learningApi } from '@/features/learning/api';
import { useTranslation } from '@/i18n';
import { queryKeys } from '@/lib/queryKeys';
import type { CourseDetail, ShareResponse } from '@/types/api';

/** Public link of a course on the web build (`<origin>/course/<id>`). */
function courseWebLink(courseId: string): string {
  return `${globalThis.location?.origin ?? ''}/course/${courseId}`;
}

/** Web browsers without the Web Share API (most desktops): `navigator.share` is missing. */
function isWebShareUnavailable(): boolean {
  return Platform.OS === 'web' && typeof globalThis.navigator?.share !== 'function';
}

/**
 * Opens the system share sheet with a translated message and, when the user really shared, counts
 * it with `POST /courses/:id/share`. A failed count (offline...) is silent: the share itself worked.
 * The Web Share API resolves `undefined` (no `action`), which also counts as shared. When the
 * browser has no Web Share API the course link is copied to the clipboard instead.
 */
export function useShareCourse(course: Pick<CourseDetail, 'id' | 'title' | 'teacher'> | undefined) {
  const { t } = useTranslation(['course', 'common']);
  const queryClient = useQueryClient();
  const courseId = course?.id;
  const { mutate: countShare } = useMutation<ShareResponse, Error, void>({
    networkMode: 'always',
    mutationFn: () => learningApi.share(courseId ?? ''),
    onSuccess: (data) => {
      queryClient.setQueryData<CourseDetail>(queryKeys.course(courseId ?? ''), (old) =>
        old ? { ...old, shareCount: data.shareCount } : old,
      );
    },
  });

  const copyLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(courseWebLink(courseId ?? ''));
    } catch {
      showToast(t('course:linkCopyFailed'), { type: 'error' });
      return;
    }
    showToast(t('course:linkCopied'), { type: 'success' });
    countShare();
  }, [countShare, courseId, t]);

  return useCallback(async () => {
    if (!course) return;
    if (isWebShareUnavailable()) {
      await copyLink();
      return;
    }
    try {
      const result = await Share.share({
        message: t('course:shareMessage', {
          title: course.title,
          teacher: course.teacher.fullName,
          app: t('common:appName'),
        }),
      });
      // Native reports `{ action }`; the Web Share API resolves `undefined` once the user shared.
      if (!result || result.action === Share.sharedAction) countShare();
    } catch {
      // The share sheet failed to open or was dismissed: nothing to recover.
    }
  }, [copyLink, countShare, course, t]);
}
