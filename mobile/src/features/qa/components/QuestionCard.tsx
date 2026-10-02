import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { colors, radius, spacing } from '@/theme';
import type { QuestionDto } from '@/types/api';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import { QA_STRINGS } from '../strings';

export type QuestionCardProps = {
  question: QuestionDto;
  /**
   * `list` (Q&A tab): text limited to 4 lines, the comment button opens SC-16.
   * `detail` (SC-16): full text, the comment count is not pressable.
   */
  variant?: 'list' | 'detail';
  /** Keep these callbacks stable (`useCallback`) so `React.memo` can skip re-renders. */
  onToggleLike: (question: QuestionDto) => void;
  onOpen?: (question: QuestionDto) => void;
};

const AVATAR_SIZE = 40;
const LIST_MAX_LINES = 4;

/** SC-15 / SC-16 question: avatar, name, "A day ago", text, ♡ likes and 💬 "{n} Comment". */
function QuestionCardBase({ question, variant = 'list', onToggleLike, onOpen }: QuestionCardProps) {
  const isList = variant === 'list';
  const comments = QA_STRINGS.comments(question.answerCount);

  const commentContent = (
    <>
      <Feather name="message-circle" size={20} color={colors.textPrimary} />
      <AppText variant="body">{comments}</AppText>
    </>
  );

  return (
    <View style={styles.card} testID={`question-${question.id}`}>
      <View style={styles.header}>
        <Avatar uri={question.user.avatarUrl} name={question.user.fullName} size={AVATAR_SIZE} />
        <View style={styles.author}>
          <AppText variant="cardTitle" numberOfLines={1}>
            {question.user.fullName}
          </AppText>
          <AppText variant="caption" family="bodyMedium">
            {formatRelativeTime(question.createdAt)}
          </AppText>
        </View>
      </View>
      <AppText variant="body" numberOfLines={isList ? LIST_MAX_LINES : undefined}>
        {question.content}
      </AppText>
      <View style={styles.actions}>
        <Pressable
          onPress={() => onToggleLike(question)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`${question.isLiked ? QA_STRINGS.unlike : QA_STRINGS.like}, ${question.likeCount}`}
          accessibilityState={{ selected: question.isLiked }}
          style={styles.action}
          testID={`question-like-${question.id}`}
        >
          <Ionicons
            name={question.isLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={question.isLiked ? colors.danger : colors.textPrimary}
          />
          <AppText variant="body">{question.likeCount}</AppText>
        </Pressable>
        {isList && onOpen ? (
          <Pressable
            onPress={() => onOpen(question)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`${comments}, open the discussion`}
            style={styles.action}
            testID={`question-comments-${question.id}`}
          >
            {commentContent}
          </Pressable>
        ) : (
          <View style={styles.action} accessible accessibilityLabel={comments}>
            {commentContent}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  author: { flex: 1, gap: spacing.xxs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, minHeight: 32 },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

export const QuestionCard = memo(QuestionCardBase);
