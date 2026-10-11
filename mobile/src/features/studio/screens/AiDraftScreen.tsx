import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { FormTextField } from '@/components/ui/FormTextField';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SparklesIcon } from '@/components/ui/SparklesIcon';
import { showToast } from '@/components/ui/Toast';
import { FormError } from '@/features/auth/components/FormError';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/i18n/useLanguage';
import { getErrorMessage } from '@/lib/appError';
import { layout, makeStyles, spacing, useTheme } from '@/theme';
import type { AiCourseDraftDto } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import {
  AI_LEVELS,
  AI_LANGS,
  aiDraftSchema,
  TOPIC_MAX,
  type AiDraftFormValues,
} from '../aiDraftForm';
import { useAiDraftStore } from '../aiDraftStore';
import { AiDraftResult, ALL_PARTS, TEXT_PARTS, type DraftPart } from '../components/AiDraftResult';
import { getCurriculumTarget, NEW_COURSE_ID } from '../editMode';
import { useAiCourseDraft, useCurriculumMutations, useStudioCourse } from '../hooks';

export type AiDraftScreenProps = {
  /** Course being edited, or `new` / empty when the course does not exist yet. */
  courseId: string;
  /** Prefill for the topic (the course title). */
  topic?: string;
  /** `text` ("Help me write"): only the subtitle and the description are offered. */
  scope?: 'all' | 'text';
};

function close(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/studio');
}

/**
 * SC-27 AI course draft (FR-44, modal). Topic + level + language -> `POST /teacher/ai/course-draft`
 * -> four suggestions (subtitle, description, benefits, outline), each applied on request. Fields
 * go into the open editor through `useAiDraftStore`; the outline (after a confirmation) creates
 * the sections of a draft course and queues its lessons as "planned" rows in the curriculum
 * editor, because a lesson still needs a YouTube link and a length. Nothing is saved by the AI.
 */
export function AiDraftScreen({ courseId, topic = '', scope = 'all' }: AiDraftScreenProps) {
  const { t } = useTranslation('studio');
  const { language } = useLanguage();
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<AiCourseDraftDto | null>(null);
  const [applied, setApplied] = useState<ReadonlySet<DraftPart>>(new Set());
  const [isApplyingOutline, setIsApplyingOutline] = useState(false);
  const [generateError, setGenerateError] = useState<unknown>(null);
  const generate = useAiCourseDraft();
  const queueFields = useAiDraftStore((state) => state.queueFields);
  const setPlanned = useAiDraftStore((state) => state.setPlannedLessons);

  const hasCourse = courseId !== '' && courseId !== NEW_COURSE_ID;
  const course = useStudioCourse(courseId, { enabled: hasCourse });
  const mutations = useCurriculumMutations(hasCourse ? courseId : '');
  const canApplyOutline = hasCourse && course.data && getCurriculumTarget(course.data) === 'course';
  const outlineHint = canApplyOutline
    ? null
    : hasCourse
      ? t('ai.outlineNeedsDraft')
      : t('ai.outlineNeedsCourse');

  const { control, handleSubmit } = useForm<AiDraftFormValues>({
    resolver: zodResolver(aiDraftSchema),
    defaultValues: { topic: topic.slice(0, TOPIC_MAX), level: 'beginner', lang: language },
  });

  const submit = handleSubmit(async (values) => {
    setApplied(new Set());
    setGenerateError(null);
    try {
      setDraft(await generate.mutateAsync({ ...values, topic: values.topic.trim() }));
    } catch (error) {
      setGenerateError(error);
    }
  });

  const markApplied = (part: DraftPart) => setApplied((current) => new Set(current).add(part));

  const applyOutline = async (source: AiCourseDraftDto) => {
    const isConfirmed = await confirmAction({
      title: t('ai.outlineConfirm.title'),
      message: t('ai.outlineConfirm.message', { count: source.sections.length }),
      confirmLabel: t('ai.outlineConfirm.confirm'),
      cancelLabel: t('actions.cancel'),
    });
    if (!isConfirmed) return;
    setIsApplyingOutline(true);
    try {
      const planned: Record<string, { title: string; summary: string }[]> = {};
      for (const section of source.sections) {
        const created = await mutations.addSection.mutateAsync({ title: section.title });
        planned[created.id] = section.lessons;
      }
      setPlanned({ ...useAiDraftStore.getState().plannedLessons, ...planned });
      markApplied('outline');
      showToast(t('ai.outlineApplied'), { type: 'success' });
      // The wizard under this sheet shows the Lessons step as soon as planned lessons appear.
      close();
    } catch (error) {
      showToast(getErrorMessage(error), { type: 'error' });
    } finally {
      setIsApplyingOutline(false);
    }
  };

  const apply = (part: DraftPart) => {
    if (!draft) return;
    if (part === 'outline') {
      void applyOutline(draft);
      return;
    }
    queueFields({ [part]: draft[part] });
    markApplied(part);
    showToast(t('ai.appliedToast'), { type: 'success' });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title={t('ai.title')}
        showBack={false}
        right={<IconButton icon="x" onPress={close} accessibilityLabel={t('ai.close')} />}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.huge }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="body" color="textSecondary">
          {t('ai.intro')}
        </AppText>
        <FormTextField
          control={control}
          name="topic"
          label={t('ai.topic')}
          placeholder={t('ai.topicPlaceholder')}
          maxLength={TOPIC_MAX}
          returnKeyType="done"
        />
        <View style={styles.group}>
          <AppText variant="label">{t('ai.level')}</AppText>
          <Controller
            control={control}
            name="level"
            render={({ field }) => (
              <View style={styles.chips}>
                {AI_LEVELS.map((level) => (
                  <Chip
                    key={level}
                    label={t(`ai.levels.${level}`)}
                    selected={field.value === level}
                    size="sm"
                    onPress={() => field.onChange(level)}
                    testID={`ai-level-${level}`}
                  />
                ))}
              </View>
            )}
          />
        </View>
        <View style={styles.group}>
          <AppText variant="label">{t('ai.language')}</AppText>
          <Controller
            control={control}
            name="lang"
            render={({ field }) => (
              <View style={styles.chips}>
                {AI_LANGS.map((lang) => (
                  <Chip
                    key={lang}
                    label={t(`ai.langs.${lang}`)}
                    selected={field.value === lang}
                    size="sm"
                    onPress={() => field.onChange(lang)}
                    testID={`ai-lang-${lang}`}
                  />
                ))}
              </View>
            )}
          />
        </View>
        <Button
          title={draft ? t('ai.regenerate') : t('ai.generate')}
          leftAdornment={<SparklesIcon size={18} color={colors.onPrimary} />}
          onPress={() => void submit()}
          loading={generate.isPending}
          fullWidth
          testID="ai-generate"
        />
        {generate.isPending ? (
          <View style={styles.loading} testID="ai-loading" accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.primaryText} />
            <AppText variant="caption">{t('ai.loading')}</AppText>
          </View>
        ) : null}
        {generateError ? <FormError message={getErrorMessage(generateError)} /> : null}
        {draft && !generate.isPending ? (
          <AiDraftResult
            draft={draft}
            parts={scope === 'text' ? TEXT_PARTS : ALL_PARTS}
            applied={applied}
            outlineHint={outlineHint}
            isApplyingOutline={isApplyingOutline}
            onApply={apply}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.md, gap: spacing.lg },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
}));
