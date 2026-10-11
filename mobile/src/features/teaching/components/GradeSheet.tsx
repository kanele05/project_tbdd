import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { showToast } from '@/components/ui/Toast';
import { applyAuthError } from '@/features/auth/authErrors';
import { FormError } from '@/features/auth/components/FormError';
import { useTranslation } from '@/i18n';
import { spacing } from '@/theme';
import type { TeacherSubmissionDto } from '@/types/api';

import { useGradeSubmission } from '../hooks';
import { FEEDBACK_MAX_LENGTH, gradeSchema, type GradeFormValues } from '../schemas';
import { SheetModal } from './SheetModal';

export type GradeSheetProps = {
  /** The submission being graded; the sheet is open while this is not null. */
  submission: TeacherSubmissionDto | null;
  courseId: string;
  onClose: () => void;
};

const FIELDS = ['grade', 'feedback'] as const;

const styles = StyleSheet.create({ counter: { marginTop: spacing.xs } });

function GradeForm({
  submission,
  courseId,
  onClose,
}: {
  submission: TeacherSubmissionDto;
  courseId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('teaching');
  const gradeSubmission = useGradeSubmission(courseId);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError } = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      grade: submission.grade === null ? '' : String(submission.grade),
      feedback: submission.feedback ?? '',
    },
  });
  const feedbackLength = useWatch({ control, name: 'feedback' }).length;

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await gradeSubmission.mutateAsync({
        submissionId: submission.id,
        grade: Number(values.grade),
        feedback: values.feedback.trim(),
      });
      onClose();
      showToast(t('submissions.sheet.saved'), { type: 'success' });
    } catch (error) {
      // Shown inline: a toast can sit behind the native modal.
      setFormError(applyAuthError(error, setError, FIELDS));
    }
  });

  return (
    <>
      <FormTextField
        control={control}
        name="grade"
        label={t('submissions.sheet.gradeLabel')}
        placeholder={t('submissions.sheet.gradePlaceholder')}
        keyboardType="number-pad"
        maxLength={3}
        returnKeyType="next"
        autoFocus
        testID="grade-input"
      />
      <View>
        <FormTextField
          control={control}
          name="feedback"
          label={t('submissions.sheet.feedbackLabel')}
          placeholder={t('submissions.sheet.feedbackPlaceholder')}
          multiline
          numberOfLines={5}
          maxLength={FEEDBACK_MAX_LENGTH}
          textAlignVertical="top"
          testID="feedback-input"
        />
        <AppText variant="caption" align="right" style={styles.counter}>
          {t('submissions.sheet.counter', { count: feedbackLength, max: FEEDBACK_MAX_LENGTH })}
        </AppText>
      </View>
      <FormError message={formError} />
      <Button
        title={t('submissions.sheet.save')}
        onPress={() => void submit()}
        loading={gradeSubmission.isPending}
        fullWidth
        testID="grade-save"
      />
    </>
  );
}

/** Sheet where the course teacher grades a project: whole grade 0-100 + feedback (BR-26); grading again overwrites. */
export function GradeSheet({ submission, courseId, onClose }: GradeSheetProps) {
  const { t } = useTranslation('teaching');
  return (
    <SheetModal
      isVisible={submission !== null}
      title={t('submissions.sheet.title')}
      subtitle={
        submission
          ? t('submissions.sheet.subtitle', {
              title: submission.title,
              name: submission.user.fullName,
            })
          : undefined
      }
      onClose={onClose}
      testID="grade-sheet"
    >
      {submission ? (
        <GradeForm
          key={submission.id}
          submission={submission}
          courseId={courseId}
          onClose={onClose}
        />
      ) : null}
    </SheetModal>
  );
}
