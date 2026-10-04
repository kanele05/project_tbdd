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

export type CourseCardVerticalProps = {
  course: CourseSummary;
  /** Keep this callback stable (`useCallback`) so `React.memo` can skip re-renders in lists. */
  onPress: (course: CourseSummary) => void;
  /** Overrides `course.isBookmarked` (e.g. optimistic state from the bookmark hook). */
  isBookmarked?: boolean;
  /** When omitted the bookmark icon is shown as a read-only indicator. */
  onToggleBookmark?: (course: CourseSummary) => void;
  /** Card width in dp. Default 168: two posters + a peek of the third on a 390 dp screen. */
  width?: number;
  style?: StyleProp<ViewStyle>;
};

export const COURSE_CARD_VERTICAL_WIDTH = 168;
/** The poster is 1 : 1.3 - tall enough to feel like a movie poster, safe for 16:9 thumbnails. */
const IMAGE_RATIO = 1.3;

/** Poster height for a given card width (the skeleton uses it to keep the same footprint). */
export function getCourseCardVerticalImageHeight(width: number): number {
  return Math.round(width * IMAGE_RATIO);
}

export const COURSE_CARD_VERTICAL_IMAGE_HEIGHT = getCourseCardVerticalImageHeight(
  COURSE_CARD_VERTICAL_WIDTH,
);

/**
 * Poster card of the horizontally scrolling rails (Home: Popular / Recommended, Teacher courses):
 * borderless full-bleed thumbnail with a gold tag (top-left) and a glass bookmark (top-right), then
 * two-line title, teacher, gold rating and accent price underneath (concept B "PosterCard").
 */
function CourseCardVerticalBase({
  course,
  onPress,
  isBookmarked,
  onToggleBookmark,
  width = COURSE_CARD_VERTICAL_WIDTH,
  style,
}: CourseCardVerticalProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const saved = isBookmarked ?? course.isBookmarked;
  const badge = getCourseBadge(course);
  const imageHeight = getCourseCardVerticalImageHeight(width);

  return (
    <View style={[styles.card, { width }, style]}>
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
        style={({ pressed }) => [pressed ? styles.pressed : null]}
      >
        <View style={[styles.imageWrap, { height: imageHeight }]}>
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
          <AppText variant="cardTitle" numberOfLines={2} style={styles.title}>
            {course.title}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {course.teacher.fullName}
          </AppText>
          <RatingInline rating={course.ratingAvg} count={course.ratingCount} />
          <AppText
            variant="cardTitle"
            color="primaryText"
            family="headingBold"
            style={styles.price}
          >
            {formatPriceOrFree(course.priceCents)}
          </AppText>
        </View>
      </Pressable>
      <View style={styles.bookmark}>
        <BookmarkButton
          isBookmarked={saved}
          isOnPhoto
          onPress={onToggleBookmark ? () => onToggleBookmark(course) : undefined}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: { borderRadius: radius.card },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  imageWrap: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.card,
    backgroundColor: t.colors.surface,
  },
  badge: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  info: { marginTop: spacing.md - 2, gap: spacing.xxs },
  // Two lines reserved so every card in a rail has the same height.
  title: { minHeight: 42 },
  price: { marginTop: spacing.xs },
  bookmark: { position: 'absolute', top: spacing.sm, right: spacing.sm },
}));

export const CourseCardVertical = memo(CourseCardVerticalBase);
