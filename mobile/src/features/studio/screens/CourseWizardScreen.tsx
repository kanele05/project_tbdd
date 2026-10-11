import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { WorkHeader, WorkShell } from '@/components/layout/work';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';

import { WizardProgress } from '../components/wizard/WizardProgress';
import { WizardStepRail } from '../components/wizard/WizardStepRail';
import { WizardStepView } from '../components/wizard/WizardStepView';
import { useCourseWizard } from '../useCourseWizard';
import { parseStep, type WizardStep } from '../wizardSteps';

export type CourseWizardScreenProps = {
  /** Course id, or `new` to create one. */
  courseId: string;
  /** `?step=` of the route: which step to open (default: the first). */
  step?: string;
};

/**
 * SC-24 Course wizard (FR-39 / FR-42): five steps in one column - Idea, Intro, Price & tags,
 * Lessons, Review - for a new course (`courseId = new`) and for editing one. Leaving a step
 * autosaves it (Next, Back or the progress bar); the first Next of a new course creates the
 * draft. Which fields are editable depends on the mode (see `getCourseEditMode`).
 */
export function CourseWizardScreen({ courseId, step }: CourseWizardScreenProps) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const { isWide, isDesktop } = useBreakpoint();
  const wizard = useCourseWizard(courseId, parseStep(step));
  const { detailQuery, mode, isCreate } = wizard;

  let body;
  if (!isCreate && isOfflineWithoutData(detailQuery)) {
    body = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={() => void detailQuery.refetch()} />;
  } else if (!isCreate && detailQuery.isPending) {
    body = (
      <View style={styles.skeleton} testID="edit-skeleton">
        <Skeleton height={52} />
        <Skeleton height={32} width="70%" />
        <Skeleton height={120} />
      </View>
    );
  } else if (!isCreate && detailQuery.isError) {
    body = (
      <ErrorState
        error={detailQuery.error}
        title={t('loadFailed')}
        onRetry={() => void detailQuery.refetch()}
      />
    );
  } else if (mode) {
    body = <WizardStepView wizard={wizard} mode={mode} />;
  }

  const progress = {
    current: wizard.step,
    onSelect: (target: WizardStep) => void wizard.goTo(target),
    canJump: wizard.canJump,
    isBusy: wizard.isBusy,
  };

  if (isWide) {
    // PC: step list on the left (desktop) or the progress bar (tablet), the step in a readable column.
    return (
      <KeyboardAvoidingView style={styles.screen}>
        <WorkShell maxWidth={WIZARD_MAX_WIDTH} testID="wizard-desktop">
          <WorkHeader title={isCreate ? t('edit.createTitle') : t('edit.title')} hasBack />
          {isDesktop ? null : <WizardProgress {...progress} />}
          <View style={isDesktop ? styles.row : styles.column}>
            {isDesktop ? <WizardStepRail {...progress} /> : null}
            <View
              style={[
                isDesktop ? styles.content : styles.contentCentered,
                wizard.step === 'review' ? styles.contentWide : null,
              ]}
            >
              {body}
            </View>
          </View>
        </WorkShell>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title={isCreate ? t('edit.createTitle') : t('edit.title')} />
      <WizardProgress {...progress} />
      {body}
    </KeyboardAvoidingView>
  );
}

const WIZARD_MAX_WIDTH = 1240;
const CONTENT_MAX_WIDTH = 720;
const CONTENT_WIDE_MAX_WIDTH = 860;

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  skeleton: { gap: spacing.lg, padding: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.huge },
  column: { marginTop: spacing.sm },
  content: { flex: 1, minWidth: 0, maxWidth: CONTENT_MAX_WIDTH },
  contentCentered: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
  contentWide: { maxWidth: CONTENT_WIDE_MAX_WIDTH },
}));
