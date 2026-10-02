import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, type ReactElement } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useCourseAccessGuard } from '@/features/learning/accessGuard';
import { flattenPages } from '@/features/learning/pages';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { colors, layout, spacing } from '@/theme';
import type { QuestionDto } from '@/types/api';

import { useCourseQuestions, useCreateQuestion, useToggleQuestionLike } from '../hooks';
import { QA_STRINGS } from '../strings';
import { Composer } from './Composer';
import { QuestionCard } from './QuestionCard';
import { QuestionCardSkeleton } from './QuestionCardSkeleton';

export type QaTabProps = {
  courseId: string;
  /** Rendered above the first question (the Learning screen puts the course info + tabs here). */
  header?: ReactElement;
};

function keyExtractor(question: QuestionDto): string {
  return question.id;
}

function openQuestion(question: QuestionDto): void {
  router.push({ pathname: '/question/[id]', params: { id: question.id } });
}

/**
 * SC-15 "Q&A" tab (M-22): an infinite list of `QuestionCard`s with the composer pinned to the
 * bottom. Needs an enrollment: a 403 sends the user back to the course (BR-09).
 */
export function QaTab({ courseId, header }: QaTabProps) {
  const listRef = useRef<FlashListRef<QuestionDto>>(null);
  const questions = useCourseQuestions(courseId);
  const createQuestion = useCreateQuestion(courseId);
  const toggleLike = useToggleQuestionLike().mutate;
  useCourseAccessGuard(courseId, [questions.error]);

  const items = useMemo(() => flattenPages(questions.data?.pages), [questions.data]);
  const { refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = questions;

  const handleToggleLike = useCallback(
    (question: QuestionDto) => toggleLike({ questionId: question.id, isLiked: question.isLiked }),
    [toggleLike],
  );
  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleSubmit = useCallback(
    async (content: string) => {
      await createQuestion.mutateAsync(content);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
    [createQuestion],
  );

  const renderItem = useCallback(
    ({ item }: { item: QuestionDto }) => (
      <View style={styles.item}>
        <QuestionCard question={item} onToggleLike={handleToggleLike} onOpen={openQuestion} />
      </View>
    ),
    [handleToggleLike],
  );

  let empty;
  if (isOfflineWithoutData(questions)) {
    empty = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={handleRetry} />;
  } else if (questions.isPending) {
    empty = (
      <View style={styles.skeletons}>
        <QuestionCardSkeleton />
        <QuestionCardSkeleton />
      </View>
    );
  } else if (questions.isError) {
    empty = (
      <ErrorState error={questions.error} title={QA_STRINGS.loadFailed} onRetry={handleRetry} />
    );
  } else {
    empty = (
      <EmptyState
        icon="message-circle"
        title={QA_STRINGS.noQuestionsTitle}
        message={QA_STRINGS.noQuestionsMessage}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        ref={listRef}
        testID="qa-list"
        data={items}
        renderItem={renderItem}
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
      <Composer placeholder={QA_STRINGS.questionPlaceholder} onSubmit={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.lg },
  item: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.lg },
  skeletons: { gap: spacing.lg, paddingTop: spacing.lg, paddingHorizontal: layout.screenPaddingX },
  footer: { paddingVertical: spacing.lg },
});
