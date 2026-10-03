import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { STRINGS } from '@/constants/strings';
import { colors, spacing } from '@/theme';

import { AppText } from './AppText';

export type RatingInlineProps = {
  rating: number;
  /** Number of ratings, shown as "(1233)". */
  count?: number;
  /** Lesson count, shown as "· 12 lessons". */
  lessonCount?: number;
  style?: StyleProp<ViewStyle>;
};

function lessonNoun(count: number): string {
  return count === 1 ? 'lesson' : STRINGS.common.lessons;
}

function formatLessons(count: number): string {
  return `${count} ${lessonNoun(count)}`;
}

/** "☆ 4.5 (1233) · 12 lessons" - the rating line of course cards and headers. */
function RatingInlineBase({ rating, count, lessonCount, style }: RatingInlineProps) {
  const ratingText = rating.toFixed(1);
  const label = [
    `Rated ${ratingText} out of 5`,
    count != null ? `${count} ratings` : null,
    lessonCount != null ? formatLessons(lessonCount) : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={[styles.row, style]} accessible accessibilityLabel={label}>
      <Ionicons name="star-outline" size={14} color={colors.star} />
      <AppText variant="caption" color="textPrimary" family="bodyMedium">
        {ratingText}
      </AppText>
      {count != null ? (
        <AppText variant="caption" color="textMuted">
          ({count})
        </AppText>
      ) : null}
      {lessonCount != null ? (
        <>
          <View style={styles.dot} />
          {/* Design: the number is dark, the word "lessons" is muted. */}
          <AppText variant="caption" color="textPrimary" numberOfLines={1} style={styles.lessons}>
            {lessonCount}
            <AppText variant="caption" color="textMuted">
              {` ${lessonNoun(lessonCount)}`}
            </AppText>
          </AppText>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    // Design: 6 dp between "(1233)" and the dot, 4 dp between the dot and the number.
    marginLeft: spacing.xxs,
    backgroundColor: colors.border,
  },
  lessons: { flexShrink: 1 },
});

export const RatingInline = memo(RatingInlineBase);
