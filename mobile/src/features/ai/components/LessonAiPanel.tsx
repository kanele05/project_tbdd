import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AiCard } from '@/components/ui/AiCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { spacing } from '@/theme';

import { LessonSummary } from './LessonSummary';

export type LessonAiPanelProps = {
  courseId: string;
  /** The lesson being studied (null while it loads: summary and quiz wait for it). */
  lessonId: string | null;
  lessonTitle?: string;
};

/**
 * The AI entry of the Learning screen: "Ask AI Tutor" (the one neon action), and - for the lesson
 * that is playing - a summary that opens in place and a quiz on its own screen. The summary is
 * only requested when the user opens it, so scrolling past never spends the AI quota.
 */
export function LessonAiPanel({ courseId, lessonId, lessonTitle }: LessonAiPanelProps) {
  const { t } = useTranslation('ai');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const openTutor = useCallback(() => {
    router.push({ pathname: '/learn/[courseId]/tutor', params: { courseId } });
  }, [courseId]);
  const openQuiz = useCallback(() => {
    if (!lessonId) return;
    router.push({ pathname: '/learn/[courseId]/quiz', params: { courseId, lessonId } });
  }, [courseId, lessonId]);
  const toggleSummary = useCallback(() => setIsSummaryOpen((isOpen) => !isOpen), []);

  return (
    <AiCard title={t('title')} subtitle={t('panel.subtitle')} testID="lesson-ai-panel">
      {lessonTitle ? (
        <AppText variant="caption" color="textSecondary" numberOfLines={2}>
          {t('panel.hint', { lesson: lessonTitle })}
        </AppText>
      ) : null}
      <Button
        title={t('panel.ask')}
        leftIcon="message-circle"
        onPress={openTutor}
        fullWidth
        testID="ask-tutor"
      />
      <View style={styles.row}>
        <Button
          title={isSummaryOpen ? t('panel.hideSummary') : t('panel.summarize')}
          accessibilityLabel={isSummaryOpen ? t('summary.hide') : t('panel.summarize')}
          variant="outline"
          size="sm"
          leftIcon="file-text"
          disabled={!lessonId}
          onPress={toggleSummary}
          style={styles.half}
          testID="toggle-summary"
        />
        <Button
          title={t('panel.quiz')}
          variant="outline"
          size="sm"
          leftIcon="check-square"
          disabled={!lessonId}
          onPress={openQuiz}
          style={styles.half}
          testID="open-quiz"
        />
      </View>
      {isSummaryOpen && lessonId ? <LessonSummary lessonId={lessonId} /> : null}
    </AiCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
});
