import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { makeStyles, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

export type RatingInlineProps = {
  rating: number;
  /** Number of ratings, shown as "(1233)". */
  count?: number;
  /** Lesson count, shown as "· 12 lessons". */
  lessonCount?: number;
  style?: StyleProp<ViewStyle>;
};

/** "☆ 4.5 (1233) · 12 lessons" - the rating line of course cards and headers. */
function RatingInlineBase({ rating, count, lessonCount, style }: RatingInlineProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themed = useStyles();
  const ratingText = formatNumber(rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const label = [
    t('a11y.ratedOutOf', { rating: ratingText }),
    count != null ? t('a11y.ratingCount', { count }) : null,
    lessonCount != null ? t('lessons.count', { count: lessonCount }) : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={[styles.row, style]} accessible accessibilityLabel={label}>
      <Ionicons name="star-outline" size={14} color={colors.star} />
      <AppText variant="caption" color="text" family="bodyMedium">
        {ratingText}
      </AppText>
      {count != null ? (
        <AppText variant="caption" color="textMuted">
          ({count})
        </AppText>
      ) : null}
      {lessonCount != null ? (
        <>
          <View style={[styles.dot, themed.dot]} />
          {/* Design: the number is dark, the word "lessons" is muted. */}
          <AppText variant="caption" color="text" numberOfLines={1} style={styles.lessons}>
            {lessonCount}
            <AppText variant="caption" color="textMuted">
              {` ${t('lessons.noun', { count: lessonCount })}`}
            </AppText>
          </AppText>
        </>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  dot: { backgroundColor: t.colors.border },
}));

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    // Design: 6 dp between "(1233)" and the dot, 4 dp between the dot and the number.
    marginLeft: spacing.xxs,
  },
  lessons: { flexShrink: 1 },
});

export const RatingInline = memo(RatingInlineBase);
