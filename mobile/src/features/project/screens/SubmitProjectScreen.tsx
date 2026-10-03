import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  FormTextField,
  IconButton,
  ProgressBar,
  ScreenHeader,
  useToast,
} from '@/components/ui';
import { FormError } from '@/features/auth/components/FormError';
import { getFieldErrors } from '@/lib/appError';
import { colors, layout, spacing } from '@/theme';

import { FilePickerField } from '../components/FilePickerField';
import { useSubmitProject } from '../hooks';
import { submitProjectSchema, type SubmitProjectFormValues } from '../schemas';
import { getSubmitErrorMessage } from '../submitErrors';
import { useSubmissionFiles } from '../useSubmissionFiles';

export type SubmitProjectScreenProps = { courseId: string };

const FILE_HINT = 'PNG, JPG, PDF or ZIP - up to 10 MB';
const COVER_HINT = 'Optional. PNG or JPG - up to 10 MB';
const FILE_REQUIRED_MESSAGE = 'Choose a file to upload';

/**
 * SC-17 Submit project (modal): Title (required), Description, project file (png/jpg/pdf/zip up to
 * 10 MB, checked on the device), optional cover image, Submit with upload progress.
 */
export function SubmitProjectScreen({ courseId }: SubmitProjectScreenProps) {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { submit, isPending, progress } = useSubmitProject(courseId);
  const files = useSubmissionFiles();
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError } = useForm<SubmitProjectFormValues>({
    resolver: zodResolver(submitProjectSchema),
    defaultValues: { title: '', description: '' },
  });

  const { file, cover, setFileError } = files;
  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (!file) {
      setFileError(FILE_REQUIRED_MESSAGE);
      return;
    }
    try {
      await submit({
        title: values.title,
        description: values.description || undefined,
        file,
        image: cover,
      });
      toast.success('Project submitted');
      router.back();
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      if (fieldErrors.title) setError('title', { message: fieldErrors.title });
      if (fieldErrors.description) setError('description', { message: fieldErrors.description });
      setFormError(getSubmitErrorMessage(error));
    }
  });

  const handleClose = useCallback(() => router.back(), []);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScreenHeader
        title="Submit project"
        showBack={false}
        right={<IconButton icon="x" onPress={handleClose} accessibilityLabel="Close" />}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <FormTextField
          control={control}
          name="title"
          label="Title"
          placeholder="Name your project"
          maxLength={100}
          returnKeyType="next"
          editable={!isPending}
        />
        <FormTextField
          control={control}
          name="description"
          label="Description (optional)"
          placeholder="Tell others about your project"
          multiline
          numberOfLines={4}
          maxLength={1000}
          textAlignVertical="top"
          editable={!isPending}
        />
        <FilePickerField
          label="Project file"
          hint={FILE_HINT}
          file={files.file}
          error={files.fileError}
          onPick={() => void files.pickFile()}
          onClear={files.clearFile}
          disabled={isPending}
          testID="project-file-field"
        />
        <FilePickerField
          label="Cover image"
          hint={COVER_HINT}
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
            <AppText variant="caption" color="textSecondary">{`Uploading... ${progress}%`}</AppText>
            <ProgressBar percent={progress} />
          </View>
        ) : null}
        <Button
          title="Submit"
          fullWidth
          loading={isPending}
          onPress={() => void onSubmit()}
          testID="submit-project-button"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.lg, padding: layout.screenPaddingX },
  progress: { gap: spacing.xs },
});
