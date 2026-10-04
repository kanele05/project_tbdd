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
  /** Card width in dp. Default 200 (the Home horizontal lists). */
  width?: number;
  style?: StyleProp<ViewStyle>;
};

export const COURSE_CARD_VERTICAL_WIDTH = 200;
const PADDING = spacing.md;
/** The thumbnail is always 116 dp tall (Home card 174 x 116, Teacher profile card 180 x 116). */
export const COURSE_CARD_VERTICAL_IMAGE_HEIGHT = 116;
/** Thumbnail bottom -> title line (design: 14 dp). */
const INFO_OFFSET = 14;
/** Distance from the title line top to the top of the 24 dp bookmark icon (its ink starts 3 dp lower). */
const BOOKMARK_INSET = 3;

/**
 * Card of the horizontally scrolling lists (Home: Popular / Recommended, Teacher courses):
 * thumbnail with badge, title + bookmark, teacher, price and rating line.
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
  const imageHeight = COURSE_CARD_VERTICAL_IMAGE_HEIGHT;

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
        style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}
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
          {badge ? (
            <Badge
              label={badge.label}
              tone={badge.kind === 'BEST_SELLER' ? 'primary' : 'secondary'}
              style={styles.badge}
            />
          ) : null}
        </View>
        <View style={styles.info}>
          <AppText variant="cardTitle" numberOfLines={1} style={styles.title}>
            {course.title}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {course.teacher.fullName}
          </AppText>
          <AppText
            variant="cardTitle"
            color="primaryText"
            family="headingBold"
            style={styles.price}
          >
            {formatPriceOrFree(course.priceCents)}
          </AppText>
          <RatingInline
            rating={course.ratingAvg}
            count={course.ratingCount}
            lessonCount={course.lessonCount}
          />
        </View>
      </Pressable>
      <View
        style={[styles.bookmark, { top: PADDING + imageHeight + INFO_OFFSET - BOOKMARK_INSET }]}
        pointerEvents="box-none"
      >
        <BookmarkButton
          isBookmarked={saved}
          idleColor="text"
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
  pressable: { padding: PADDING, borderRadius: radius.card },
  pressed: { opacity: 0.85 },
  imageWrap: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.button,
    backgroundColor: t.colors.surface,
  },
  badge: { position: 'absolute', top: spacing.xs, left: spacing.xs },
  info: { marginTop: INFO_OFFSET, gap: spacing.xxs },
  title: { paddingRight: spacing.xxl },
  // Design: price 15 dp bold; 5 dp below the teacher and 1 dp above the rating line.
  price: { marginTop: spacing.xs, fontSize: 15, lineHeight: 20 },
  bookmark: { position: 'absolute', right: PADDING },
}));

export const CourseCardVertical = memo(CourseCardVerticalBase);
