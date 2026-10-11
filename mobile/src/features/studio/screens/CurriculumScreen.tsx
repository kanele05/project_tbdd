import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/ui/Toast';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/appError';
import { layout, makeStyles, spacing } from '@/theme';
import type { StudioCourseDetailDto, StudioRevisionDto } from '@/types/api';

import { CurriculumBody } from '../components/CurriculumBody';
import { Notice } from '../components/Notice';
import { getCurriculumTarget } from '../editMode';
import { useCourseWorkflow, useStudioCourse } from '../hooks';
import { useDirectCurriculum, useRevisionCurriculum } from '../useCurriculumEditor';
import { useUnsavedChangesGuard } from '../useUnsavedChangesGuard';

function DirectCurriculum({ detail }: { detail: StudioCourseDetailDto }) {
  const { sections, actions, isBusy } = useDirectCurriculum(detail);
  return <CurriculumBody sections={sections} actions={actions} isBusy={isBusy} />;
}

function RevisionCurriculum({
  courseId,
  revision,
}: {
  courseId: string;
  revision: StudioRevisionDto;
}) {
  const { t } = useTranslation('studio');
  const { sections, actions, isDirty, isSaving, save } = useRevisionCurriculum(courseId, revision);
  const { allowLeave } = useUnsavedChangesGuard(isDirty);
  const styles = useStyles();

  const handleSave = async () => {
    try {
      await save();
      allowLeave();
      showToast(t('curriculum.revisionSaved'), { type: 'success' });
    } catch (error) {
      showToast(getErrorMessage(error), { type: 'error' });
    }
  };

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

/**
 * SC-25 Curriculum editor (FR-40). Sections and lessons are edited on the course itself while it
 * is a DRAFT / REJECTED; on a PUBLISHED course they live in the open revision (BR-21), which is
 * created from here if needed. A course in review or hidden is read-only.
 */
export function CurriculumScreen({ courseId }: { courseId: string }) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const query = useStudioCourse(courseId);
  const detail = query.data;

  let body;
  if (isOfflineWithoutData(query)) {
    body = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={() => void query.refetch()} />;
  } else if (query.isPending) {
    body = (
      <View style={styles.stack} testID="curriculum-skeleton">
        <Skeleton height={20} width="60%" />
        <Skeleton height={140} />
        <Skeleton height={140} />
      </View>
    );
  } else if (query.isError) {
    body = (
      <ErrorState
        error={query.error}
        title={t('loadFailed')}
        onRetry={() => void query.refetch()}
      />
    );
  } else if (detail) {
    const target = getCurriculumTarget(detail);
    if (target === 'course') body = <DirectCurriculum detail={detail} />;
    else if (target === 'revision' && detail.revision) {
      body = (
        <RevisionCurriculum
          key={detail.revision.id}
          courseId={detail.id}
          revision={detail.revision}
        />
      );
    } else if (target === 'needsRevision') body = <NeedsRevision courseId={detail.id} />;
    else {
      body = (
        <Notice
          tone="warning"
          icon="lock"
          title={t('curriculum.lockedTitle')}
          message={t('curriculum.lockedMessage')}
          testID="curriculum-locked"
        />
      );
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('curriculum.title')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.huge }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {body}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.md },
  stack: { gap: spacing.lg },
}));
