import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { SparklesIcon } from '@/components/ui/SparklesIcon';
import { FormError } from '@/features/auth/components/FormError';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing, useTheme } from '@/theme';

import { CourseEditModeNotice } from '../components/CourseEditModeNotice';
import { CourseInfoFields } from '../components/CourseInfoFields';
import { useCourseEditor } from '../useCourseEditor';

export type CourseEditScreenProps = {
  /** Course id, or `new` to create one. */
  courseId: string;
};

function openAiDraft(courseId: string, topic: string): void {
  router.push({ pathname: '/studio/ai-draft', params: { courseId, topic } });
}

/**
 * SC-24 Course info editor (FR-39 / FR-42), also the "new course" form (`courseId = new`). One
 * form for every status: which fields are editable, and where they are saved, depends on the
 * mode (see `getCourseEditMode`). "Suggest with AI" opens SC-27 and takes the picked parts back.
 */
export function CourseEditScreen({ courseId }: CourseEditScreenProps) {
  const { t } = useTranslation('studio');
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const editor = useCourseEditor(courseId);
  const { mode, detailQuery, form } = editor;

  let body;
  if (!editor.isCreate && isOfflineWithoutData(detailQuery)) {
    body = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={() => void detailQuery.refetch()} />;
  } else if (!editor.isCreate && detailQuery.isPending) {
    body = (
      <View style={styles.skeleton} testID="edit-skeleton">
        <Skeleton height={52} />
        <Skeleton height={32} width="70%" />
        <Skeleton height={120} />
      </View>
    );
  } else if (!editor.isCreate && detailQuery.isError) {
    body = (
      <ErrorState
        error={detailQuery.error}
        title={t('loadFailed')}
        onRetry={() => void detailQuery.refetch()}
      />
    );
  } else if (mode) {
    body = (
      <View style={styles.form}>
        <CourseEditModeNotice
          mode={mode}
          isStartingRevision={editor.isStartingRevision}
          onStartRevision={() => void editor.startRevision()}
        />
        {mode.kind !== 'locked' ? (
          <Button
            title={t('edit.aiSuggest')}
            variant="outline"
            leftAdornment={<SparklesIcon size={18} color={colors.primaryText} />}
            onPress={() => openAiDraft(courseId, form.getValues('title'))}
            testID="edit-ai-suggest"
          />
        ) : null}
        <CourseInfoFields
          form={form}
          mode={mode}
          knownTags={editor.knownTags}
          isBusy={editor.isSaving}
        />
        <FormError message={editor.formError} />
        {mode.kind !== 'locked' ? (
          <Button
            title={editor.isCreate ? t('edit.createSubmit') : t('edit.saveSubmit')}
            onPress={() => void editor.save()}
            loading={editor.isSaving}
            disabled={!editor.isCreate && !editor.isDirty}
            fullWidth
            testID="edit-save"
          />
        ) : null}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title={editor.isCreate ? t('edit.createTitle') : t('edit.title')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.huge }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {body}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.md },
  form: { gap: spacing.xl },
  skeleton: { gap: spacing.lg },
}));
