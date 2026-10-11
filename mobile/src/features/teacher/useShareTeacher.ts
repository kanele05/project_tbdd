import { useCallback } from 'react';
import { Share } from 'react-native';

import { useTranslation } from '@/i18n';
import type { TeacherDetail } from '@/types/api';

/** "Share profile" of SC-18: opens the system share sheet (a failed / cancelled share is ignored). */
export function useShareTeacher(
  teacher: Pick<TeacherDetail, 'fullName' | 'jobTitle'> | undefined,
): () => void {
  const { t } = useTranslation(['teacher', 'common']);
  return useCallback(() => {
    if (!teacher) return;
    const message = t('teacher:share.message', {
      name: teacher.fullName,
      job: teacher.jobTitle,
      app: t('common:appName'),
    });
    void Share.share({ message }).catch(() => undefined);
  }, [teacher, t]);
}
