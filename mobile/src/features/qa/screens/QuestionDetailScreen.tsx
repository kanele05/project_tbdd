import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useNotEnrolledGuard } from '@/features/learning/accessGuard';
import { flattenPages } from '@/features/learning/pages';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { colors, layout, spacing } from '@/theme';
import type { AnswerDto, QuestionDto } from '@/types/api';

import { AnswerItem } from '../components/AnswerItem';
import { Composer } from '../components/Composer';
import { QuestionCard } from '../components/QuestionCard';
import { QuestionCardSkeleton } from '../components/QuestionCardSkeleton';
import { useCreateAnswer, useQuestion, useQuestionAnswers, useToggleQuestionLike } from '../hooks';
import { QA_STRINGS } from '../strings';

export type QuestionDetailScreenProps = { questionId: string };

function keyExtractor(answer: AnswerDto): string {
  return answer.id;
}

function renderAnswer({ item }: { item: AnswerDto }) {
  return (
    <View style={styles.item}>
      <AnswerItem answer={item} />
    </View>
  );
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
export function QuestionDetailScreen({ questionId }: QuestionDetailScreenProps) {
  const listRef = useRef<FlashListRef<AnswerDto>>(null);
  const question = useQuestion(questionId);
  const answers = useQuestionAnswers(questionId);
  const createAnswer = useCreateAnswer(questionId);
  const toggleLike = useToggleQuestionLike().mutate;
  useNotEnrolledGuard([question.error, answers.error], goBack);

  const items = useMemo(() => flattenPages(answers.data?.pages), [answers.data]);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = answers;
  const { refetch: refetchQuestion } = question;
  const { refetch: refetchAnswers } = answers;

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
          {QA_STRINGS.repliesTitle(questionData.answerCount)}
        </AppText>
      </View>
    );
  }, [handleToggleLike, questionData]);

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
      <ErrorState
        error={question.error}
        title={QA_STRINGS.loadQuestionFailed}
        onRetry={handleRetry}
      />
    );
  } else {
    let empty = null;
    if (isOfflineWithoutData(answers)) {
      empty = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={handleRetry} />;
    } else if (answers.isPending) {
      empty = <ActivityIndicator style={styles.footer} color={colors.primary} />;
    } else if (answers.isError) {
      empty = (
        <ErrorState
          error={answers.error}
          title={QA_STRINGS.loadAnswersFailed}
          onRetry={handleRetry}
        />
      );
    } else {
      empty = (
        <EmptyState
          icon="message-circle"
          title={QA_STRINGS.noAnswersTitle}
          message={QA_STRINGS.noAnswersMessage}
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
            <ActivityIndicator style={styles.footer} color={colors.primary} />
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
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title={QA_STRINGS.questionTitle} />
      <View style={styles.body}>{body}</View>
      {isBlocked || question.isPending ? null : (
        <Composer placeholder={QA_STRINGS.replyPlaceholder} onSubmit={handleSubmit} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
  content: { paddingBottom: spacing.lg },
  header: { gap: spacing.lg, paddingBottom: spacing.lg, paddingHorizontal: layout.screenPaddingX },
  item: { paddingHorizontal: layout.screenPaddingX, paddingBottom: spacing.md },
  skeleton: { padding: layout.screenPaddingX },
  footer: { paddingVertical: spacing.lg },
});
