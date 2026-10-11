import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { darkPalette, makeStyles, radius, spacing } from '@/theme';
import type { CourseSummary } from '@/types/api';
import { getCourseBadge } from '@/utils/discount';
import { formatPriceOrFree } from '@/utils/formatPrice';

import { BookmarkButton } from './BookmarkButton';
import { RoundButton } from './RoundButton';

/**
 * What the card needs from a course. A `CourseSummary` fits; an owned course (`MyCourseItem`) only
 * has the first three fields and is shown with `progressPercent`.
 */
export type DesktopCardCourse = Pick<CourseSummary, 'id' | 'title' | 'thumbnailUrl'> &
  Partial<Omit<CourseSummary, 'id' | 'title' | 'thumbnailUrl'>>;

export type CourseCardDesktopProps = {
  course: DesktopCardCourse;
  /** Open the course page. Keep stable (`useCallback`): the card is memoized. */
  onPress: (course: DesktopCardCourse) => void;
  onToggleBookmark?: (course: DesktopCardCourse) => void;
  /** Shows the cart button on hover (hidden for free courses and for owned ones). */
  onAddToCart?: (course: DesktopCardCourse) => void;
  /** Shows the play button on hover ("continue learning" / open the lessons). */
  onPlay?: (course: DesktopCardCourse) => void;
  /** Owned course: a progress line under the photo and "NN %" instead of price / rating. */
  progressPercent?: number;
  /** Overrides `course.isBookmarked`. */
  isBookmarked?: boolean;
  /** Card width in dp; default fills the parent (grid cell / rail slot). */
  width?: DimensionValue;
  testID?: string;
};

const HOVER_SCALE = 0.07;
const HOVER_MS = 180;

/**
 * 16:9 poster card of the desktop web layout (Netflix style). At rest: photo, title and teacher.
 * On hover or keyboard focus the card grows ~7 %, and a dark panel over the photo reveals the
 * price, the rating and the quick actions (play / add to cart / save). Phones keep
 * `CourseCardVertical`; this card is only rendered when the window is wide.
 */
function CourseCardDesktopBase({
  course,
  onPress,
  onToggleBookmark,
  onAddToCart,
  onPlay,
  progressPercent,
  isBookmarked,
  width = '100%',
  testID,
}: CourseCardDesktopProps) {
  const { t } = useTranslation(['common', 'course']);
  const styles = useStyles();
  const isReducedMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isActive = isHovered || isFocused;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(isActive ? 1 : 0, { duration: isReducedMotion ? 0 : HOVER_MS }));
  }, [isActive, isReducedMotion, progress]);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isReducedMotion ? 1 : 1 + HOVER_SCALE * progress.value }],
  }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const isOwned = progressPercent !== undefined;
  const priceCents = course.priceCents ?? 0;
  const canBuy = Boolean(onAddToCart) && !isOwned && priceCents > 0;
  const badge = isOwned
    ? null
    : getCourseBadge({
        badge: course.badge ?? null,
        discountPercent: course.discountPercent ?? null,
        priceCents,
        originalPriceCents: course.originalPriceCents ?? null,
      });
  const saved = isBookmarked ?? course.isBookmarked ?? false;
  const rating = formatNumber(course.ratingAvg ?? 0, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const price = formatPriceOrFree(priceCents);
  const teacherName = course.teacher?.fullName ?? '';
  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  return (
    <Animated.View
      style={[styles.card, { width }, cardStyle]}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      testID={testID}
    >
      <Pressable
        onPress={() => onPress(course)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        accessibilityRole="button"
        accessibilityLabel={
          isOwned
            ? t('common:desktopCard.ownedLabel', { title: course.title, percent: progressPercent })
            : t('common:courseCard.label', {
                title: course.title,
                teacher: teacherName,
                price,
                rating,
              })
        }
        style={styles.main}
      >
        <View style={styles.photo}>
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
          {isOwned ? (
            <ProgressBar percent={progressPercent} height={4} style={styles.progress} />
          ) : null}
        </View>
        <View style={styles.info}>
          <AppText variant="cardTitle" numberOfLines={2} style={styles.title}>
            {course.title}
          </AppText>
          {teacherName ? (
            <AppText variant="caption" numberOfLines={1}>
              {teacherName}
            </AppText>
          ) : null}
        </View>
      </Pressable>
      <Animated.View
        style={[styles.overlay, overlayStyle, isActive ? null : styles.overlayIdle]}
        testID={testID ? `${testID}-overlay` : undefined}
      >
        <LinearGradient
          colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.88)']}
          locations={[0.35, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.topRow}>
          <BookmarkButton
            isBookmarked={saved}
            isOnPhoto
            onPress={onToggleBookmark ? () => onToggleBookmark(course) : undefined}
          />
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.facts}>
            {isOwned ? (
              <AppText variant="label" color="white">
                {t('common:desktopCard.percentDone', { percent: Math.round(progressPercent) })}
              </AppText>
            ) : (
              <>
                <AppText variant="label" family="headingBold" style={styles.price}>
                  {price}
                </AppText>
                <View style={styles.rating}>
                  <Ionicons name="star" size={12} color={darkPalette.star} />
                  <AppText variant="micro" color="white">
                    {rating}
                  </AppText>
                </View>
              </>
            )}
          </View>
          <View style={styles.actions}>
            {onPlay ? (
              <RoundButton
                icon="play"
                isPrimary
                label={t('common:desktopCard.continue', { title: course.title })}
                onPress={() => onPlay(course)}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            ) : null}
            {canBuy ? (
              <RoundButton
                icon="shopping-cart"
                label={t('common:desktopCard.addToCart', { title: course.title })}
                onPress={() => onAddToCart?.(course)}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            ) : null}
            {onPlay ? (
              <RoundButton
                icon="chevron-down"
                label={t('common:desktopCard.details', { title: course.title })}
                onPress={() => onPress(course)}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            ) : null}
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/** Loading placeholder with the same footprint as `CourseCardDesktop`. */
export function CourseCardDesktopSkeleton({ width = '100%' }: { width?: DimensionValue }) {
  const styles = useStyles();
  return (
    <View style={{ width }}>
      <Skeleton style={styles.skeletonPhoto} borderRadius={radius.card} />
      <View style={styles.skeletonLines}>
        <Skeleton width="80%" height={16} />
        <Skeleton width="50%" height={12} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: { borderRadius: radius.card },
  main: { borderRadius: radius.card },
  photo: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    borderRadius: radius.card,
    backgroundColor: t.colors.surface,
  },
  badge: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  progress: { position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: 0 },
  info: { marginTop: spacing.sm, gap: spacing.xxs },
  // Two lines reserved so every card of a row has the same height.
  title: { minHeight: 42 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    aspectRatio: 16 / 9,
    justifyContent: 'space-between',
    padding: spacing.sm,
    overflow: 'hidden',
    borderRadius: radius.card,
    pointerEvents: 'box-none',
  },
  overlayIdle: { pointerEvents: 'none' },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  facts: { gap: spacing.xxs, flexShrink: 1 },
  price: { color: darkPalette.white },
  rating: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.xs },
  skeletonPhoto: { height: undefined, aspectRatio: 16 / 9 },
  skeletonLines: { marginTop: spacing.sm, gap: spacing.sm },
}));

export const CourseCardDesktop = memo(CourseCardDesktopBase);
