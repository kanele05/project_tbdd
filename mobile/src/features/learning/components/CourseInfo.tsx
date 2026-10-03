import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, spacing } from '@/theme';

import { LEARNING_STRINGS } from '../strings';

export type CourseInfoProps = {
  title: string;
  likeCount: number;
  shareCount: number;
  isLiked: boolean;
  onToggleLike: () => void;
  onShare: () => void;
};

/** Under the video: the course title and "♡ 231 Like · 16 Share" (like is red when liked). */
function CourseInfoBase({
  title,
  likeCount,
  shareCount,
  isLiked,
  onToggleLike,
  onShare,
}: CourseInfoProps) {
  return (
    <View style={styles.container}>
      <AppText variant="title" numberOfLines={2} style={styles.title}>
        {title}
      </AppText>
      <View style={styles.row}>
        <Pressable
          onPress={onToggleLike}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`${isLiked ? LEARNING_STRINGS.unlikeCourse : LEARNING_STRINGS.likeCourse}, ${likeCount}`}
          accessibilityState={{ selected: isLiked }}
          style={styles.action}
          testID="course-like"
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={24}
            color={isLiked ? colors.danger : colors.textMuted}
          />
          <AppText variant="caption" color="textPrimary">
            {`${likeCount} ${LEARNING_STRINGS.like}`}
          </AppText>
        </Pressable>
        <View style={styles.dot} />
        <Pressable
          onPress={onShare}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`${LEARNING_STRINGS.shareCourse}, ${shareCount}`}
          style={styles.action}
          testID="course-share"
        >
          <Feather name="share-2" size={24} color={colors.textMuted} />
          <AppText variant="caption" color="textPrimary">
            {`${shareCount} ${LEARNING_STRINGS.share}`}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  // Design: 16 px Epilogue with a 27 dp line pitch.
  title: { lineHeight: 27 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.border },
});

export const CourseInfo = memo(CourseInfoBase);
