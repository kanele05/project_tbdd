import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Share } from 'react-native';

import { learningApi } from '@/features/learning/api';
import { useTranslation } from '@/i18n';
import { queryKeys } from '@/lib/queryKeys';
import type { CourseDetail, ShareResponse } from '@/types/api';

/**
 * Opens the system share sheet with a translated message and, when the user really shared, counts
 * it with `POST /courses/:id/share`. A failed count (offline...) is silent: the share itself worked.
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

  return useCallback(async () => {
    if (!course) return;
    try {
      const result = await Share.share({
        message: t('course:shareMessage', {
          title: course.title,
          teacher: course.teacher.fullName,
          app: t('common:appName'),
        }),
      });
      if (result.action === Share.sharedAction) countShare();
    } catch {
      // The share sheet failed to open or was dismissed: nothing to recover.
    }
  }, [countShare, course, t]);
}
