import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';

import type { CourseEditMode } from '../editMode';
import { Notice } from './Notice';

export type CourseEditModeNoticeProps = {
  mode: CourseEditMode;
  isStartingRevision: boolean;
  onStartRevision: () => void;
};

/**
 * Says which mode the editor is in (BR-21): a published course saves minor fields right away and
 * needs a revision for the major ones; a course in review or hidden is locked. Nothing is shown
 * for a new course or a draft (everything is editable and saved on the course itself).
 */
export function CourseEditModeNotice({
  mode,
  isStartingRevision,
  onStartRevision,
}: CourseEditModeNoticeProps) {
  const { t } = useTranslation('studio');
  if (mode.kind === 'locked') {
    return (
      <Notice
        tone="warning"
        icon="lock"
        title={t(`edit.locked.${mode.reason}.title`)}
        message={t(`edit.locked.${mode.reason}.message`)}
        testID="edit-notice-locked"
      />
    );
  }
  if (mode.kind !== 'published') return null;
  if (mode.revisionState === 'editable') {
    return (
      <Notice
        tone="info"
        icon="edit-3"
        title={t('edit.published.revisionTitle')}
        message={t('edit.published.revisionMessage')}
        testID="edit-notice-revision"
      />
    );
  }
  if (mode.revisionState === 'pending') {
    return (
      <Notice
        tone="warning"
        icon="clock"
        title={t('edit.published.pendingTitle')}
        message={t('edit.published.pendingMessage')}
        testID="edit-notice-pending"
      />
    );
  }
  return (
    <Notice
      tone="info"
      icon="info"
      title={t('edit.published.title')}
      message={t('edit.published.message')}
      testID="edit-notice-published"
    >
      <Button
        title={t('revision.start')}
        variant="outline"
        size="sm"
        leftIcon="edit-3"
        loading={isStartingRevision}
        onPress={onStartRevision}
        testID="edit-start-revision"
      />
    </Notice>
  );
}
