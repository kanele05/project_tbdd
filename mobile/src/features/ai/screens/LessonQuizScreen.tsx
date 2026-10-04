import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCourseAccessGuard } from '@/features/learning/accessGuard';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/i18n/useLanguage';
import { queryKeys } from '@/lib/queryKeys';
import { layout, makeStyles, spacing } from '@/theme';
import type { AiQuizDto } from '@/types/api';

import { AiBadge } from '../components/AiBadge';
import { QuizQuestionView } from '../components/QuizQuestionView';
import { QuizResult } from '../components/QuizResult';
import { useAiLessonQuiz } from '../hooks';
import { createQuizSession, quizReducer } from '../quizSession';

export type LessonQuizScreenProps = { courseId: string; lessonId: string | null };

function goBack(): void {
  if (router.canGoBack()) router.back();
}

/** The questions of one loaded quiz: a reducer walks through them and ends on the results. */
function QuizRunner({ quiz }: { quiz: AiQuizDto }) {
  const [session, dispatch] = useReducer(quizReducer, quiz.questions.length, createQuizSession);
  const question = quiz.questions[session.index];
  const handleSelect = useCallback(
    (optionIndex: number) => dispatch({ type: 'select', optionIndex }),
    [],
  );
  const handleNext = useCallback(() => dispatch({ type: 'next' }), []);
  const handleRetake = useCallback(() => dispatch({ type: 'restart' }), []);

  if (session.isFinished || !question) {
    return (
      <QuizResult
        questions={quiz.questions}
        answers={session.answers}
        onRetake={handleRetake}
        onBack={goBack}
      />
    );
  }
  return (
    <QuizQuestionView
      question={question}
      index={session.index}
      total={session.total}
      selected={session.answers[session.index] ?? null}
      onSelect={handleSelect}
      onNext={handleNext}
    />
  );
}

function QuizSkeleton() {
  const { t } = useTranslation('ai');
  const styles = useStyles();
  return (
    <View
      style={styles.skeleton}
      accessible
      accessibilityLabel={t('quiz.generating')}
      accessibilityState={{ busy: true }}
      testID="quiz-loading"
    >
      <AppText variant="caption" color="textSecondary">
        {t('quiz.generating')}
      </AppText>
      <Skeleton height={8} borderRadius={4} />
      <Skeleton width="90%" height={26} />
      <Skeleton height={56} borderRadius={16} />
      <Skeleton height={56} borderRadius={16} />
      <Skeleton height={56} borderRadius={16} />
      <Skeleton height={56} borderRadius={16} />
    </View>
  );
}

/**
 * Multiple-choice quiz of a lesson (AI-03): 5 questions x 4 options created by the AI and cached
 * on the server. It starts as soon as the screen opens (the user already asked for it); the answer
 * and its explanation show right after each choice, the score at the end, and "Try again" replays
 * the same questions. 403 / 429 / 503 show the usual error state with Retry.
 */
export function LessonQuizScreen({ courseId, lessonId }: LessonQuizScreenProps) {
  const { t } = useTranslation('ai');
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const quizMutation = useAiLessonQuiz(lessonId ?? '');
  const { mutate, error, isPending } = quizMutation;
  const cached = lessonId
    ? queryClient.getQueryData<AiQuizDto>(queryKeys.aiLessonQuiz(lessonId, language))
    : undefined;
  const quiz = quizMutation.data ?? cached;
  const hasStartedRef = useRef(false);
  useCourseAccessGuard(courseId, [error]);

  useEffect(() => {
    if (!lessonId || cached || hasStartedRef.current) return;
    hasStartedRef.current = true;
    mutate();
  }, [cached, lessonId, mutate]);

  let body;
  if (!lessonId) {
    body = (
      <EmptyState
        icon="help-circle"
        title={t('quiz.noLessonTitle')}
        message={t('quiz.noLessonMessage')}
      />
    );
  } else if (quiz) {
    body = <QuizRunner key={quiz.generatedAt} quiz={quiz} />;
  } else if (error && !isPending) {
    body = <ErrorState error={error} title={t('quiz.failed')} onRetry={() => mutate()} />;
  } else {
    body = <QuizSkeleton />;
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScreenHeader title={t('quiz.headerTitle')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {quiz ? <AiBadge style={styles.badge} /> : null}
        {body}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { gap: spacing.lg, padding: layout.screenPaddingX },
  badge: { alignSelf: 'flex-start' },
  skeleton: { gap: spacing.md },
}));
