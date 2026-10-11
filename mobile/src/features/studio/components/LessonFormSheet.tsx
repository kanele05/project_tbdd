import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { FormError } from '@/features/auth/components/FormError';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing, useTheme } from '@/theme';

import type { LessonDraft } from '../curriculumModel';
import {
  EMPTY_LESSON_FORM,
  formValuesToLesson,
  lessonFormSchema,
  lessonToFormValues,
  type LessonFormValues,
} from '../lessonForm';
import { STUDIO_LIMITS } from '../limits';
import { normalizeYouTubeUrl } from '../youtube';
import { BottomSheet } from './BottomSheet';

export type LessonFormSheetProps = {
  visible: boolean;
  /** `null` = a new lesson. */
  initial: LessonDraft | null;
  /** Values for a new lesson (the AI outline gives a title and a summary). */
  prefill?: Partial<LessonDraft>;
  /** Preview lessons in the rest of the course (the limit is 3 in total). */
  otherPreviewCount: number;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (lesson: LessonDraft) => void;
};

function LessonForm({
  initial,
  prefill,
  otherPreviewCount,
  isSaving,
  error,
  onSubmit,
}: Omit<LessonFormSheetProps, 'visible' | 'onClose'>) {
  const { t } = useTranslation('studio');
  const { colors } = useTheme();
  const styles = useStyles();
  const { control, handleSubmit } = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: initial
      ? lessonToFormValues(initial)
      : { ...EMPTY_LESSON_FORM, title: prefill?.title ?? '', content: prefill?.content ?? '' },
  });
  const videoUrl = useWatch({ control, name: 'videoUrl' }) ?? '';
  const normalized = videoUrl.trim() ? normalizeYouTubeUrl(videoUrl) : null;
  const isPreviewBlocked = otherPreviewCount >= STUDIO_LIMITS.maxPreviewLessons;

  return (
    <View style={styles.form}>
      <FormTextField
        control={control}
        name="title"
        label={t('lesson.title')}
        placeholder={t('lesson.titlePlaceholder')}
        maxLength={STUDIO_LIMITS.lessonTitleMax}
        returnKeyType="next"
      />
      <View>
        <FormTextField
          control={control}
          name="videoUrl"
          label={t('lesson.videoUrl')}
          placeholder="https://www.youtube.com/watch?v=..."
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          leftIcon="youtube"
        />
        {normalized ? (
          <AppText
            variant="caption"
            color="primaryText"
            style={styles.normalized}
            testID="lesson-normalized"
          >
            {t('lesson.normalized', { url: normalized })}
          </AppText>
        ) : null}
      </View>
      <FormTextField
        control={control}
        name="duration"
        label={t('lesson.duration')}
        placeholder="12:34"
        helperText={t('lesson.durationHelper')}
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
      />
      <Controller
        control={control}
        name="isPreview"
        render={({ field }) => {
          const isDisabled = isPreviewBlocked && !field.value;
          return (
            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <AppText variant="label">{t('lesson.preview')}</AppText>
                <AppText variant="caption">
                  {isDisabled
                    ? t('lesson.previewLimit', { max: STUDIO_LIMITS.maxPreviewLessons })
                    : t('lesson.previewHelper', {
                        count: otherPreviewCount + (field.value ? 1 : 0),
                        max: STUDIO_LIMITS.maxPreviewLessons,
                      })}
                </AppText>
              </View>
              <Switch
                value={field.value}
                onValueChange={field.onChange}
                disabled={isDisabled}
                accessibilityLabel={t('lesson.preview')}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
                testID="lesson-preview-switch"
              />
            </View>
          );
        }}
      />
      <FormTextField
        control={control}
        name="content"
        label={t('lesson.content')}
        placeholder={t('lesson.contentPlaceholder')}
        helperText={t('lesson.contentHelper')}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
        maxLength={STUDIO_LIMITS.lessonContentMax}
      />
      <FormError message={error} />
      <Button
        title={t('lesson.save')}
        onPress={() => void handleSubmit((values) => onSubmit(formValuesToLesson(values)))()}
        loading={isSaving}
        fullWidth
        testID="lesson-save"
      />
    </View>
  );
}

const useStyles = makeStyles(() => ({
  form: { gap: spacing.lg },
  normalized: { marginTop: spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchText: { flex: 1, gap: spacing.xxs },
}));

/** Bottom sheet with the lesson form (add / edit): title, YouTube link, mm:ss, preview, notes. */
export function LessonFormSheet({ visible, onClose, ...formProps }: LessonFormSheetProps) {
  const { t } = useTranslation('studio');
  return (
    <BottomSheet
      visible={visible}
      title={formProps.initial ? t('lesson.editTitle') : t('lesson.addTitle')}
      onClose={onClose}
      testID="lesson-sheet"
    >
      <LessonForm {...formProps} />
    </BottomSheet>
  );
}
