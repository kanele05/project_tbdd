import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { QuestionDto } from '@/types/api';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

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
// The like / comment rows are ~23 dp tall: 13 dp above and below make a 49 dp touch target.
const ACTION_HIT_SLOP = { top: 13, bottom: 13, left: 8, right: 8 } as const;

/** SC-15 / SC-16 question: avatar, name, "A day ago", text, ♡ likes and 💬 "{n} Comments". */
function QuestionCardBase({ question, variant = 'list', onToggleLike, onOpen }: QuestionCardProps) {
  const { t } = useTranslation('qa');
  const { colors } = useTheme();
  const styles = useStyles();
  const isList = variant === 'list';
  const comments = t('comments', { count: question.answerCount });

  const commentContent = (
    <>
      <Feather name="message-circle" size={20} color={colors.textMuted} />
      <AppText variant="label" color="textSecondary">
        {comments}
      </AppText>
    </>
  );

  return (
    <View style={styles.card} testID={`question-${question.id}`}>
      <View style={styles.header}>
        <Avatar uri={question.user.avatarUrl} name={question.user.fullName} size={AVATAR_SIZE} />
        <View style={styles.author}>
          <AppText variant="label" numberOfLines={1}>
            {question.user.fullName}
          </AppText>
          <AppText variant="caption">{formatRelativeTime(question.createdAt)}</AppText>
        </View>
      </View>
      <AppText variant="body" numberOfLines={isList ? LIST_MAX_LINES : undefined}>
        {question.content}
      </AppText>
      <View style={styles.actions}>
        <Pressable
          onPress={() => onToggleLike(question)}
          hitSlop={ACTION_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={t(question.isLiked ? 'unlikeAction' : 'likeAction', {
            count: question.likeCount,
          })}
          accessibilityState={{ selected: question.isLiked }}
          style={styles.action}
          testID={`question-like-${question.id}`}
        >
          <Ionicons
            name={question.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={question.isLiked ? colors.danger : colors.textMuted}
          />
          <AppText variant="label" color="textSecondary">
            {question.likeCount}
          </AppText>
        </Pressable>
        {isList && onOpen ? (
          <Pressable
            onPress={() => onOpen(question)}
            hitSlop={ACTION_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={t('openDiscussion', { comments })}
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

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  author: { flex: 1, gap: spacing.xxs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxl, minHeight: 24 },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
}));

export const QuestionCard = memo(QuestionCardBase);
