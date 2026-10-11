import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';
import type { CourseMissingItemDto, StudioCourseDetailDto } from '@/types/api';

import type { CourseFormValues } from '../../courseForm';
import { countLessons, fromPayload, fromSections, totalDurationSec } from '../../curriculumModel';
import type { CourseEditMode } from '../../editMode';
import { parseUsdToCents } from '../../money';
import { useCourseStatusActions } from '../../useCourseStatusActions';
import type { WizardStep } from '../../wizardSteps';
import { MissingList } from '../MissingList';
import { Notice } from '../Notice';
import { CoursePreviewCard } from './CoursePreviewCard';
import { WizardPage, type WizardAction } from './WizardPage';

export type ReviewStepProps = {
  detail: StudioCourseDetailDto;
  mode: CourseEditMode;
  values: CourseFormValues;
  banner: ReactNode;
  isBusy: boolean;
  onSelectStep: (step: WizardStep) => void;
  onBack: () => void;
  /** Saves every pending field (validated); `false` = something needs fixing first. */
  saveAll: () => Promise<boolean>;
};

type SubmitKind = 'course' | 'revision' | 'none';

function getSubmitKind(mode: CourseEditMode): SubmitKind {
  if (mode.kind === 'direct') return 'course';
  if (mode.kind === 'published' && mode.revisionState === 'editable') return 'revision';
  return 'none';
}

function priceOrZero(text: string): number {
  const cents = parseUsdToCents(text, 0);
  return Number.isFinite(cents) ? cents : 0;
}

/**
 * Step 5 - preview card, the BR-20 checklist (each item jumps to the step that fixes it) and the
 * primary action: submit the course (DRAFT / REJECTED) or the revision (PUBLISHED). Pending
 * fields are saved first; after a successful submit the course status screen opens.
 */
export function ReviewStep({
  detail,
  mode,
  values,
  banner,
  isBusy,
  onSelectStep,
  onBack,
  saveAll,
}: ReviewStepProps) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const { isWide } = useBreakpoint();
  const actions = useCourseStatusActions(detail);
  const [localError, setLocalError] = useState<string | null>(null);
  const kind = getSubmitKind(mode);
  const revision = detail.revision;
  const sections =
    kind === 'revision' && revision ? fromPayload(revision.payload) : fromSections(detail.sections);
  const liveMissing = kind === 'revision' ? (revision?.missing ?? []) : detail.missing;
  const missing: readonly CourseMissingItemDto[] = actions.missingFromError ?? liveMissing;
  const isRejected =
    kind === 'revision' ? revision?.status === 'REJECTED' : detail.status === 'REJECTED';

  const openStatus = () => router.replace({ pathname: '/studio/[id]', params: { id: detail.id } });

  const submit = async () => {
    setLocalError(null);
    if (!(await saveAll())) {
      setLocalError(t('wizard.invalid'));
      return;
    }
    const isSubmitted = await (kind === 'revision' ? actions.submitRevision() : actions.submit());
    if (isSubmitted) openStatus();
  };

  const primary: WizardAction =
    kind === 'none'
      ? { title: t('wizard.done'), onPress: openStatus, testID: 'wizard-done' }
      : {
          title: isRejected
            ? t('status.resubmit')
            : kind === 'revision'
              ? t('revision.submit')
              : t('status.submit'),
          onPress: () => void submit(),
          loading: actions.isBusy || isBusy,
          disabled: missing.length > 0,
          testID: 'wizard-submit',
        };

  const previewBlock = (
    <View style={styles.block}>
      <AppText variant="label">{t('wizard.review.preview')}</AppText>
      <CoursePreviewCard
        title={values.title}
        subtitle={values.subtitle}
        thumbnailUrl={values.thumbnailUrl}
        priceCents={priceOrZero(values.price)}
        originalPriceCents={values.originalPrice.trim() ? priceOrZero(values.originalPrice) : null}
        lessonCount={countLessons(sections)}
        durationSec={totalDurationSec(sections)}
      />
    </View>
  );
  const checklistBlock =
    kind !== 'none' ? (
      <View style={styles.block}>
        <AppText variant="h3" accessibilityRole="header">
          {t('status.checklistTitle')}
        </AppText>
        {missing.length === 0 ? (
          <Notice
            tone="success"
            message={kind === 'revision' ? t('revision.ready') : t('status.ready')}
            testID="review-ready"
          />
        ) : (
          <>
            <AppText variant="caption">
              {t('status.missingIntro', { count: missing.length })}
            </AppText>
            <MissingList courseId={detail.id} items={missing} onSelectStep={onSelectStep} />
          </>
        )}
      </View>
    ) : null;

  return (
    <WizardPage
      title={t('wizard.review.title')}
      banner={banner}
      error={localError ?? actions.error}
      backLabel={t('wizard.back')}
      onBack={onBack}
      primary={primary}
      isBusy={isBusy}
    >
      {isWide ? (
        <View style={styles.split}>
          <View style={styles.previewColumn}>{previewBlock}</View>
          {checklistBlock ? <View style={styles.checklistColumn}>{checklistBlock}</View> : null}
        </View>
      ) : (
        <>
          {previewBlock}
          {checklistBlock}
        </>
      )}
    </WizardPage>
  );
}

const PREVIEW_WIDTH = 320;

const useStyles = makeStyles(() => ({
  block: { gap: spacing.sm },
  // Desktop: the preview card and the checklist side by side.
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xxl },
  previewColumn: { width: PREVIEW_WIDTH, flexShrink: 0 },
  checklistColumn: { flex: 1, minWidth: 0 },
}));
