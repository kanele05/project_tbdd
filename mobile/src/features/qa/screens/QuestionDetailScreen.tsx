import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, View } from 'react-native';

import { DESKTOP_NAV_HEIGHT } from '@/components/layout/desktopLayout';
import { PageContainer } from '@/components/layout/PageContainer';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useNotEnrolledGuard } from '@/features/learning/accessGuard';
import { flattenPages } from '@/features/learning/pages';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { useCourseTeacherInfo, usePinAnswer } from '@/features/teaching/hooks';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing, useTheme } from '@/theme';
import type { AnswerDto, QuestionDto } from '@/types/api';

import { AnswerItem } from '../components/AnswerItem';
import { Composer } from '../components/Composer';
import { QuestionCard } from '../components/QuestionCard';
import { QuestionCardSkeleton } from '../components/QuestionCardSkeleton';
import { useCreateAnswer, useQuestion, useQuestionAnswers, useToggleQuestionLike } from '../hooks';

/** Readable column of the question page on a wide window (PLAN §2.5). */
const WIDE_MAX_WIDTH = 800;

export type QuestionDetailScreenProps = {
  questionId: string;
  /** Course of the question (the question response carries none): lets the course teacher pin replies. */
  courseId?: string;
};

function keyExtractor(answer: AnswerDto): string {
  return answer.id;
}

function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * SC-16 Question detail (M-22): the full question, its replies (infinite) and a "Write a
 * reply..." composer pinned to the bottom. The question response carries no course id, so a 403
 * (not enrolled) simply goes back.
 */
export function QuestionDetailScreen({ questionId, courseId }: QuestionDetailScreenProps) {
  const { t } = useTranslation('qa');
  const { colors } = useTheme();
  const styles = useStyles();
  const { isWide } = useBreakpoint();
  const listRef = useRef<FlashListRef<AnswerDto>>(null);
  const question = useQuestion(questionId);
  const answers = useQuestionAnswers(questionId);
  const createAnswer = useCreateAnswer(questionId);
  const toggleLike = useToggleQuestionLike().mutate;
  const { isOwner } = useCourseTeacherInfo(courseId);
  const pinAnswer = usePinAnswer(questionId).mutate;
  useNotEnrolledGuard([question.error, answers.error], goBack);

  const items = useMemo(() => flattenPages(answers.data?.pages), [answers.data]);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = answers;
  const { refetch: refetchQuestion } = question;
  const { refetch: refetchAnswers } = answers;

  const handleTogglePin = useCallback(
    (answer: AnswerDto) => pinAnswer({ answerId: answer.id, isPinned: answer.isPinned }),
    [pinAnswer],
  );
  const renderAnswer = useCallback(
    ({ item }: { item: AnswerDto }) => (
      <View style={styles.item}>
        <AnswerItem answer={item} canPin={isOwner} onTogglePin={handleTogglePin} />
      </View>
    ),
    [handleTogglePin, isOwner, styles],
  );
  const handleToggleLike = useCallback(
    (target: QuestionDto) => toggleLike({ questionId: target.id, isLiked: target.isLiked }),
    [toggleLike],
  );
  const handleRetry = useCallback(() => {
    void refetchQuestion();
    void refetchAnswers();
  }, [refetchAnswers, refetchQuestion]);
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleSubmit = useCallback(
    async (content: string) => {
      await createAnswer.mutateAsync(content);
      if (!hasNextPage) listRef.current?.scrollToEnd({ animated: true });
    },
    [createAnswer, hasNextPage],
  );

  const questionData = question.data;
  const header = useMemo(() => {
    if (!questionData) return null;
    return (
      <View style={styles.header}>
        <QuestionCard question={questionData} variant="detail" onToggleLike={handleToggleLike} />
        <AppText variant="title" accessibilityRole="header">
          {t('repliesTitle', { count: questionData.answerCount })}
        </AppText>
      </View>
    );
  }, [handleToggleLike, questionData, styles, t]);

  const isBlocked = isOfflineWithoutData(question) || (question.isError && !questionData);

  let body;
  if (isOfflineWithoutData(question)) {
    body = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={handleRetry} />;
  } else if (question.isPending) {
    body = (
      <View style={styles.skeleton}>
        <QuestionCardSkeleton />
      </View>
    );
  } else if (question.isError && !questionData) {
    body = (
      <ErrorState error={question.error} title={t('loadQuestionFailed')} onRetry={handleRetry} />
    );
  } else {
    let empty = null;
    if (isOfflineWithoutData(answers)) {
      empty = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={handleRetry} />;
    } else if (answers.isPending) {
      empty = <ActivityIndicator style={styles.footer} color={colors.primaryText} />;
    } else if (answers.isError) {
      empty = (
        <ErrorState error={answers.error} title={t('loadAnswersFailed')} onRetry={handleRetry} />
      );
    } else {
      empty = (
        <EmptyState
          icon="message-circle"
          title={t('noAnswersTitle')}
          message={t('noAnswersMessage')}
        />
      );
    }
    body = (
      <FlashList
        ref={listRef}
        testID="answers-list"
        data={items}
        renderItem={renderAnswer}
        keyExtractor={keyExtractor}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} color={colors.primaryText} />
          ) : null
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, isWide ? styles.belowNav : null]}
      behavior="padding"
    >
      <PageContainer maxWidth={WIDE_MAX_WIDTH} style={styles.screen} testID="question-column">
        <ScreenHeader title={t('questionTitle')} />
        <View style={styles.body}>{body}</View>
        {isBlocked || question.isPending ? null : (
          <Composer placeholder={t('replyPlaceholder')} onSubmit={handleSubmit} />
        )}
      </PageContainer>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  // The fixed nav bar covers the top DESKTOP_NAV_HEIGHT dp on a wide window.
  belowNav: { paddingTop: DESKTOP_NAV_HEIGHT },
  body: { flex: 1 },
  content: { paddingBottom: spacing.lg },
  header: { gap: spacing.lg, paddingBottom: spacing.lg, paddingHorizontal: layout.screenPaddingX },
  item: { paddingHorizontal: layout.screenPaddingX, paddingBottom: spacing.lg },
  skeleton: { padding: layout.screenPaddingX },
  footer: { paddingVertical: spacing.lg },
}));
