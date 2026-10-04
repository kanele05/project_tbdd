import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { RatingInline } from '@/components/ui/RatingInline';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { makeStyles, radius, spacing } from '@/theme';
import type { CourseSummary } from '@/types/api';
import { getCourseBadge } from '@/utils/discount';
import { formatPriceOrFree } from '@/utils/formatPrice';

import { BookmarkButton } from './BookmarkButton';

export type CourseCardHorizontalProps = {
  course: CourseSummary;
  /** Keep this callback stable (`useCallback`) so `React.memo` can skip re-renders in lists. */
  onPress: (course: CourseSummary) => void;
  /** Overrides `course.isBookmarked` (e.g. optimistic state from the bookmark hook). */
  isBookmarked?: boolean;
  /** When omitted the bookmark icon is shown as a read-only indicator. */
  onToggleBookmark?: (course: CourseSummary) => void;
  /** Show a price row. Default true. */
  showPrice?: boolean;
  style?: StyleProp<ViewStyle>;
};

const THUMBNAIL_SIZE = 96;
const PADDING = spacing.md;

/**
 * List card (Search results, Course list, Saved courses, Similar courses, Course that inspires):
 * rounded thumbnail on the left with a gold tag, texts on the right, bookmark in the top-right
 * corner, on a `card` surface with a hairline.
 */
function CourseCardHorizontalBase({
  course,
  onPress,
  isBookmarked,
  onToggleBookmark,
  showPrice = true,
  style,
}: CourseCardHorizontalProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const saved = isBookmarked ?? course.isBookmarked;
  const badge = getCourseBadge(course);

  return (
    <View style={[styles.card, style]}>
      <Pressable
        onPress={() => onPress(course)}
        accessibilityRole="button"
        accessibilityLabel={t('courseCard.label', {
          title: course.title,
          teacher: course.teacher.fullName,
          price: formatPriceOrFree(course.priceCents),
          rating: formatNumber(course.ratingAvg, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          }),
        })}
        style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}
      >
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: course.thumbnailUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            recyclingKey={course.id}
            accessibilityIgnoresInvertColors
          />
          {badge ? <Badge label={badge.label} tone="gold" style={styles.badge} /> : null}
        </View>
        <View style={styles.info}>
          <AppText variant="cardTitle" numberOfLines={1} style={styles.title}>
            {course.title}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {course.teacher.fullName}
          </AppText>
          {showPrice ? (
            <AppText
              variant="cardTitle"
              color="primaryText"
              family="headingBold"
              style={styles.price}
            >
              {formatPriceOrFree(course.priceCents)}
            </AppText>
          ) : null}
          <RatingInline
            rating={course.ratingAvg}
            count={course.ratingCount}
            lessonCount={course.lessonCount}
            style={showPrice ? styles.rating : styles.ratingNoPrice}
          />
        </View>
      </Pressable>
      <View style={styles.bookmark} pointerEvents="box-none">
        <BookmarkButton
          isBookmarked={saved}
          onPress={onToggleBookmark ? () => onToggleBookmark(course) : undefined}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.colors.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    borderRadius: radius.card,
  },
  pressable: {
    flexDirection: 'row',
    // The texts start 12 dp after the 96 dp thumbnail.
    gap: spacing.md,
    padding: PADDING,
    borderRadius: radius.card,
  },
  pressed: { opacity: 0.85 },
  imageWrap: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    overflow: 'hidden',
    borderRadius: radius.button,
    backgroundColor: t.colors.surface,
  },
  badge: { position: 'absolute', top: spacing.xs, left: spacing.xs },
  info: { flex: 1, justifyContent: 'center', gap: spacing.xxs },
  title: { paddingRight: spacing.xxl },
  price: { marginTop: spacing.sm, fontSize: 15, lineHeight: 20 },
  rating: { marginTop: spacing.xs },
  ratingNoPrice: { marginTop: spacing.sm },
  bookmark: { position: 'absolute', top: PADDING, right: PADDING },
}));

export const CourseCardHorizontal = memo(CourseCardHorizontalBase);
