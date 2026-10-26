import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DialogFrame } from '@/components/layout/DialogFrame';
import {
  AppText,
  Button,
  CinematicHeader,
  FormTextField,
  GlassIconButton,
  ProgressBar,
  useToast,
} from '@/components/ui';
import { FormError } from '@/features/auth/components/FormError';
import { getCachedCourseImage } from '@/features/course/cachedCourseImage';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { getFieldErrors } from '@/lib/appError';
import { layout, makeStyles, spacing } from '@/theme';

import { FilePickerField } from '../components/FilePickerField';
import { useSubmitProject } from '../hooks';
import { submitProjectSchema, type SubmitProjectFormValues } from '../schemas';
import { getSubmitErrorMessage } from '../submitErrors';
import { useSubmissionFiles } from '../useSubmissionFiles';

export type SubmitProjectScreenProps = { courseId: string };

/**
 * SC-17 Submit project (modal): Title (required), Description, project file (png/jpg/pdf/zip up to
 * 10 MB, checked on the device), optional cover image, Submit with upload progress.
 */
export function SubmitProjectScreen({ courseId }: SubmitProjectScreenProps) {
  const { t } = useTranslation(['project', 'common']);
  const styles = useStyles();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();
  const { submit, isPending, progress } = useSubmitProject(courseId);
  const files = useSubmissionFiles();
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError } = useForm<SubmitProjectFormValues>({
    resolver: zodResolver(submitProjectSchema),
    defaultValues: { title: '', description: '' },
  });

  const { file, cover, setFileError } = files;
  const onSubmit = handleSubmit(
    async (values) => {
      setFormError(null);
      if (!file) {
        setFileError(t('project:submit.fileRequired'));
        return;
      }
      try {
        await submit({
          title: values.title,
          description: values.description || undefined,
          file,
          image: cover,
        });
        toast.success(t('project:submit.success'));
        router.back();
      } catch (error) {
        const fieldErrors = getFieldErrors(error);
        if (fieldErrors.title) setError('title', { message: fieldErrors.title });
        if (fieldErrors.description) setError('description', { message: fieldErrors.description });
        setFormError(getSubmitErrorMessage(error));
      }
    },
    // Invalid fields: also flag the missing file now, not on the next press.
    () => {
      if (!file) setFileError(t('project:submit.fileRequired'));
    },
  );

  const handleClose = useCallback(() => router.back(), []);

  const fields = (
    <>
      <FormTextField
        control={control}
        name="title"
        label={t('project:submit.titleLabel')}
        placeholder={t('project:submit.titlePlaceholder')}
        maxLength={100}
        returnKeyType="next"
        editable={!isPending}
      />
      <FormTextField
        control={control}
        name="description"
        label={t('project:submit.descriptionLabel')}
        placeholder={t('project:submit.descriptionPlaceholder')}
        multiline
        numberOfLines={4}
        maxLength={1000}
        textAlignVertical="top"
        editable={!isPending}
      />
      <FilePickerField
        label={t('project:submit.fileLabel')}
        hint={t('project:submit.fileHint')}
        file={files.file}
        error={files.fileError}
        onPick={() => void files.pickFile()}
        onClear={files.clearFile}
        disabled={isPending}
        testID="project-file-field"
      />
      <FilePickerField
        label={t('project:submit.coverLabel')}
        hint={t('project:submit.coverHint')}
        file={files.cover}
        error={files.coverError}
        showPreview
        onPick={() => void files.pickCover()}
        onClear={files.clearCover}
        disabled={isPending}
        testID="cover-image-field"
      />
      <FormError message={formError} />
      {isPending ? (
        <View style={styles.progress} accessibilityLiveRegion="polite">
          <AppText variant="caption" color="textSecondary">
            {t('project:submit.uploading', { percent: progress })}
          </AppText>
          <ProgressBar percent={progress} />
        </View>
      ) : null}
    </>
  );
  const submitButton = (
    <Button
      title={t('project:submit.action')}
      fullWidth
      loading={isPending}
      onPress={() => void onSubmit()}
      testID="submit-project-button"
    />
  );

  if (isWide) {
    return (
      <DialogFrame
        title={t('project:submit.title')}
        closeLabel={t('common:actions.close')}
        onClose={handleClose}
        width={640}
        footer={submitButton}
        testID="submit-project-dialog"
      >
        {fields}
      </DialogFrame>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <CinematicHeader
        title={t('project:submit.title')}
        uri={getCachedCourseImage(courseId)}
        posterIndex={5}
        showBack={false}
        right={
          <GlassIconButton
            icon="x"
            onPress={handleClose}
            accessibilityLabel={t('common:actions.close')}
          />
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {fields}
        {submitButton}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { gap: spacing.lg, padding: layout.screenPaddingX },
  progress: { gap: spacing.xs },
}));
