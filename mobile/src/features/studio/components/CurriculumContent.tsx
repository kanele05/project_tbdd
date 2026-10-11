import { useEffect } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/appError';
import { makeStyles, spacing } from '@/theme';
import type { StudioCourseDetailDto, StudioRevisionDto } from '@/types/api';

import { getCurriculumTarget } from '../editMode';
import { useCourseWorkflow } from '../hooks';
import type { FlushCurriculum } from '../useCourseWizard';
import { useDirectCurriculum, useRevisionCurriculum } from '../useCurriculumEditor';
import { useUnsavedChangesGuard } from '../useUnsavedChangesGuard';
import { CurriculumBody } from './CurriculumBody';
import { Notice } from './Notice';

type RegisterFlush = (flush: FlushCurriculum | null) => void;

function DirectCurriculum({ detail }: { detail: StudioCourseDetailDto }) {
  const { sections, actions, isBusy } = useDirectCurriculum(detail);
  return <CurriculumBody sections={sections} actions={actions} isBusy={isBusy} />;
}

function RevisionCurriculum({
  courseId,
  revision,
  registerFlush,
}: {
  courseId: string;
  revision: StudioRevisionDto;
  registerFlush?: RegisterFlush;
}) {
  const { t } = useTranslation('studio');
  const { sections, actions, isDirty, isSaving, save } = useRevisionCurriculum(courseId, revision);
  const { allowLeave } = useUnsavedChangesGuard(isDirty);
  const styles = useStyles();

  const handleSave = async (): Promise<boolean> => {
    try {
      await save();
      allowLeave();
      showToast(t('curriculum.revisionSaved'), { type: 'success' });
      return true;
    } catch (error) {
      showToast(getErrorMessage(error), { type: 'error' });
      return false;
    }
  };

  // Inside the wizard, leaving the Lessons step saves the revision draft (autosave on Next).
  const flush = isDirty ? handleSave : null;
  useEffect(() => {
    registerFlush?.(flush);
    return () => registerFlush?.(null);
  });

  return (
    <View style={styles.stack}>
      <Notice
        tone="info"
        icon="edit-3"
        title={t('curriculum.revisionTitle')}
        message={t('curriculum.revisionMessage')}
        testID="curriculum-revision-notice"
      />
      <CurriculumBody sections={sections} actions={actions} isBusy={isSaving} />
      <Button
        title={t('curriculum.saveRevision')}
        onPress={() => void handleSave()}
        loading={isSaving}
        disabled={!isDirty}
        fullWidth
        testID="curriculum-save-revision"
      />
    </View>
  );
}

function NeedsRevision({ courseId }: { courseId: string }) {
  const { t } = useTranslation('studio');
  const workflow = useCourseWorkflow(courseId);
  const start = async () => {
    try {
      await workflow.mutateAsync('createRevision');
      showToast(t('revision.created'), { type: 'success' });
    } catch (error) {
      showToast(getErrorMessage(error), { type: 'error' });
    }
  };
  return (
    <Notice
      tone="info"
      title={t('curriculum.needsRevisionTitle')}
      message={t('curriculum.needsRevisionMessage')}
      testID="curriculum-needs-revision"
    >
      <Button
        title={t('revision.start')}
        variant="outline"
        size="sm"
        leftIcon="edit-3"
        loading={workflow.isPending}
        onPress={() => void start()}
        testID="curriculum-start-revision"
      />
    </Notice>
  );
}

export type CurriculumContentProps = {
  detail: StudioCourseDetailDto;
  /** Wizard only: lets the wizard save an unsaved revision draft when the step is left. */
  registerFlush?: RegisterFlush;
};

/**
 * The curriculum editor of SC-25 / wizard step 4 (FR-40). Sections and lessons are edited on the
 * course itself while it is a DRAFT / REJECTED; on a PUBLISHED course they live in the open
 * revision (BR-21), which is created from here if needed. A course in review or hidden is
 * read-only.
 */
export function CurriculumContent({ detail, registerFlush }: CurriculumContentProps) {
  const { t } = useTranslation('studio');
  const target = getCurriculumTarget(detail);
  if (target === 'course') return <DirectCurriculum detail={detail} />;
  if (target === 'revision' && detail.revision) {
    return (
      <RevisionCurriculum
        key={detail.revision.id}
        courseId={detail.id}
        revision={detail.revision}
        registerFlush={registerFlush}
      />
    );
  }
  if (target === 'needsRevision') return <NeedsRevision courseId={detail.id} />;
  return (
    <Notice
      tone="warning"
      icon="lock"
      title={t('curriculum.lockedTitle')}
      message={t('curriculum.lockedMessage')}
      testID="curriculum-locked"
    />
  );
}

const useStyles = makeStyles(() => ({ stack: { gap: spacing.lg } }));
