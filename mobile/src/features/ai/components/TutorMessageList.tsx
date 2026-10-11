import type { RefObject } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing } from '@/theme';
import type { AiChatMessageDto } from '@/types/api';

import type { TutorTurn } from '../useAiTutorChat';
import { ChatBubble } from './ChatBubble';
import { TutorTurnView } from './TutorTurnView';

export type TutorMessageListProps = {
  listRef: RefObject<FlatList<AiChatMessageDto> | null>;
  /** Saved history, oldest first. */
  messages: AiChatMessageDto[];
  /** The exchange that is not in the history yet (answer being written / failed). */
  turn: TutorTurn | null;
  cooldownSec: number;
  onRetry: () => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onContentSizeChange: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
};

const keyExtractor = (message: AiChatMessageDto): string => message.id;

function renderMessage({ item }: { item: AiChatMessageDto }) {
  return <ChatBubble role={item.role === 'USER' ? 'user' : 'assistant'} text={item.content} />;
}

function Separator() {
  const styles = useStyles();
  return <View style={styles.separator} />;
}

/** The saved conversation (oldest at the top) with the unsaved turn under it and "load earlier". */
export function TutorMessageList({
  listRef,
  messages,
  turn,
  cooldownSec,
  onRetry,
  onScroll,
  onContentSizeChange,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: TutorMessageListProps) {
  const { t } = useTranslation('ai');
  const styles = useStyles();
  return (
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
              <Button title={t('tutor.loadMore')} variant="ghost" size="sm" onPress={onLoadMore} />
            )}
          </View>
        ) : null
      }
      ListFooterComponent={
        turn ? (
          <View style={styles.turn}>
            <TutorTurnView turn={turn} cooldownSec={cooldownSec} onRetry={onRetry} />
          </View>
        ) : null
      }
    />
  );
}

const useStyles = makeStyles(() => ({
  listContent: { padding: layout.screenPaddingX, paddingBottom: spacing.xl },
  separator: { height: spacing.md },
  turn: { marginTop: spacing.md },
  loadMore: { alignItems: 'center', marginBottom: spacing.md },
}));
