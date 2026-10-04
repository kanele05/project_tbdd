import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useCourseDetail } from '@/features/course/hooks';
import { isNotEnrolledError, useCourseAccessGuard } from '@/features/learning/accessGuard';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { getShortCourseTitle } from '@/features/learning/videoUtils';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/appError';
import { layout, makeStyles, spacing } from '@/theme';
import type { AiChatMessageDto } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { toChronological } from '../chatMessages';
import { ChatBubble } from '../components/ChatBubble';
import { TutorComposer } from '../components/TutorComposer';
import { TutorEmpty } from '../components/TutorEmpty';
import { TutorTurnView } from '../components/TutorTurnView';
import { useAiChatHistory, useClearAiChat } from '../hooks';
import { useAiTutorChat } from '../useAiTutorChat';
import { useStickToBottom } from '../useStickToBottom';

export type AiTutorScreenProps = { courseId: string };

const keyExtractor = (message: AiChatMessageDto): string => message.id;

function renderMessage({ item }: { item: AiChatMessageDto }) {
  return <ChatBubble role={item.role === 'USER' ? 'user' : 'assistant'} text={item.content} />;
}

function HistorySkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.skeletons} testID="tutor-skeleton">
      <Skeleton width="60%" height={44} borderRadius={20} style={styles.skeletonRight} />
      <Skeleton width="85%" height={96} borderRadius={20} />
      <Skeleton width="45%" height={44} borderRadius={20} style={styles.skeletonRight} />
    </View>
  );
}

/**
 * AI Tutor of a course (AI-03). A route of its own instead of a tab of Learning: the chat needs the
 * whole screen (message list + keyboard + composer), keeps the Learning scroll state intact, and
 * Back returns to the lesson. History is the saved conversation (oldest at the top); the answer
 * being written and a failed request live in `useAiTutorChat` until the history takes over.
 */
export function AiTutorScreen({ courseId }: AiTutorScreenProps) {
  const { t } = useTranslation(['ai', 'common']);
  const styles = useStyles();
  const toast = useToast();
  const course = useCourseDetail(courseId);
  const history = useAiChatHistory(courseId);
  const clearHistory = useClearAiChat(courseId);
  const chat = useAiTutorChat(courseId);
  const { listRef, onScroll, onContentSizeChange, stickAndScroll } =
    useStickToBottom<AiChatMessageDto>();
  useCourseAccessGuard(courseId, [history.error]);

  const messages = useMemo(() => toChronological(history.data?.pages), [history.data]);
  const { turn } = chat;
  // Once the saved history contains the answer, the local turn would show it twice.
  const isTurnSaved =
    turn?.messageId != null && messages.some((message) => message.id === turn.messageId);
  const shownTurn = turn && !isTurnSaved ? turn : null;
  const { hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = history;

  const handleSend = useCallback(
    async (text: string) => {
      stickAndScroll();
      return chat.send(text);
    },
    [chat, stickAndScroll],
  );
  const handleClear = useCallback(async () => {
    const isConfirmed = await confirmAction({
      title: t('ai:tutor.clearTitle'),
      message: t('ai:tutor.clearMessage'),
      confirmLabel: t('ai:tutor.clearConfirm'),
      cancelLabel: t('common:actions.cancel'),
      isDestructive: true,
    });
    if (!isConfirmed) return;
    try {
      await clearHistory.mutateAsync();
      chat.reset();
      toast.success(t('ai:tutor.cleared'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [chat, clearHistory, t, toast]);
  const handleLoadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);
  const handleOpenCourse = useCallback(() => {
    router.replace({ pathname: '/course/[id]', params: { id: courseId } });
  }, [courseId]);

  let body;
  if (isNotEnrolledError(history.error)) {
    body = (
      <EmptyState
        icon="lock"
        title={t('ai:tutor.notEnrolledTitle')}
        message={t('ai:tutor.notEnrolledMessage')}
        actionLabel={t('ai:tutor.openCourse')}
        onAction={handleOpenCourse}
      />
    );
  } else if (isOfflineWithoutData(history)) {
    body = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={() => void refetch()} />;
  } else if (history.isPending) {
    body = <HistorySkeleton />;
  } else if (history.isError && !history.data) {
    body = (
      <ErrorState
        error={history.error}
        title={t('ai:tutor.loadFailed')}
        onRetry={() => void refetch()}
      />
    );
  } else if (messages.length === 0 && !shownTurn) {
    body = (
      <TutorEmpty
        onAsk={(question) => void handleSend(question)}
        isDisabled={chat.cooldownSec > 0}
      />
    );
  } else {
    body = (
      <FlatList
        ref={listRef}
        testID="tutor-list"
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderMessage}
        onScroll={onScroll}
        scrollEventThrottle={100}
        onContentSizeChange={onContentSizeChange}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          hasNextPage ? (
            <View style={styles.loadMore}>
              {isFetchingNextPage ? (
                <ActivityIndicator />
              ) : (
                <Button
                  title={t('ai:tutor.loadMore')}
                  variant="ghost"
                  size="sm"
                  onPress={handleLoadMore}
                />
              )}
            </View>
          ) : null
        }
        ListFooterComponent={
          shownTurn ? (
            <View style={styles.turn}>
              <TutorTurnView turn={shownTurn} cooldownSec={chat.cooldownSec} onRetry={chat.retry} />
            </View>
          ) : null
        }
      />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScreenHeader
        title={t('ai:tutor.headerTitle')}
        right={
          <IconButton
            icon="trash-2"
            onPress={() => void handleClear()}
            disabled={messages.length === 0 || chat.isStreaming}
            accessibilityLabel={t('ai:tutor.clear')}
            color="textSecondary"
          />
        }
      />
      {course.data ? (
        <AppText variant="caption" numberOfLines={1} style={styles.context}>
          {getShortCourseTitle(course.data.title)}
        </AppText>
      ) : null}
      <View style={styles.body}>{body}</View>
      <TutorComposer onSend={handleSend} isBusy={chat.isStreaming} cooldownSec={chat.cooldownSec} />
    </KeyboardAvoidingView>
  );
}

function Separator() {
  const styles = useStyles();
  return <View style={styles.separator} />;
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  body: { flex: 1 },
  context: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.sm,
    textAlign: 'center',
  },
  listContent: { padding: layout.screenPaddingX, paddingBottom: spacing.xl },
  separator: { height: spacing.md },
  turn: { marginTop: spacing.md },
  loadMore: { alignItems: 'center', marginBottom: spacing.md },
  skeletons: { gap: spacing.md, padding: layout.screenPaddingX },
  skeletonRight: { alignSelf: 'flex-end' },
}));
