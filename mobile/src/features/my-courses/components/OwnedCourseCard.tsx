import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View, type DimensionValue } from 'react-native';

import { useHover } from '@/components/layout/useHover';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { MyCourseItem } from '@/types/api';

export type OwnedCourseCardProps = {
  item: MyCourseItem;
  /** Keep stable (`useCallback`): opens the lesson the student left off at. */
  onOpen: (item: MyCourseItem) => void;
  width?: DimensionValue;
};

const PHOTO_ASPECT = 16 / 9;
const BAR_HEIGHT = 4;
const PLAY_SIZE = 44;

/**
 * A course the student owns, as a compact desktop card: 16:9 photo, title, a thin progress line and
 * "NN% · Lesson x/y". A finished course wears a "Completed" badge and offers "Review" instead.
 * The whole card is one button; on hover the photo gets a play button and the border lights up.
 */
function OwnedCourseCardBase({ item, onOpen, width = '100%' }: OwnedCourseCardProps) {
  const { t } = useTranslation('myCourses');
  const { colors } = useTheme();
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  const handleOpen = useCallback(() => onOpen(item), [item, onOpen]);
  const percent = Math.round(item.progressPercent);
  const isCompleted = percent >= 100;
  const progressParams = {
    title: item.course.title,
    percent,
    done: item.completedLessonCount,
    total: item.lessonCount,
  };
  return (
    <Pressable
      {...hoverProps}
      onPress={handleOpen}
      accessibilityRole="button"
      accessibilityLabel={
        isCompleted
          ? t('card.a11yCompleted', { title: item.course.title })
          : t('card.a11yProgress', progressParams)
      }
      testID={`my-course-${item.course.id}`}
      style={[styles.card, { width }, isHovered ? styles.cardHover : null]}
    >
      <View style={styles.photo}>
        <Image
          source={{ uri: item.course.thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          recyclingKey={item.course.id}
          accessibilityIgnoresInvertColors
        />
        {isCompleted ? (
          <Badge label={t('card.completed')} tone="success" style={styles.badge} />
        ) : null}
        {isHovered ? (
          <View
            style={[styles.hoverLayer, { backgroundColor: withAlpha(colors.scrim, 0.45) }]}
            pointerEvents="none"
            testID={`my-course-${item.course.id}-hover`}
          >
            <View style={styles.play}>
              <Feather
                name={isCompleted ? 'rotate-ccw' : 'play'}
                size={20}
                color={colors.onPrimary}
              />
            </View>
          </View>
        ) : null}
      </View>
      <View style={styles.info}>
        <AppText variant="cardTitle" numberOfLines={2} style={styles.title}>
          {item.course.title}
        </AppText>
        <ProgressBar
          percent={percent}
          height={BAR_HEIGHT}
          color={isCompleted ? colors.success : undefined}
        />
        {isCompleted ? (
          <View style={styles.reviewRow}>
            <AppText variant="caption">{`${item.lessonCount}/${item.lessonCount}`}</AppText>
            <View style={styles.review}>
              <Feather name="rotate-ccw" size={14} color={colors.primaryText} />
              <AppText variant="label" color="primaryText">
                {t('card.review')}
              </AppText>
            </View>
          </View>
        ) : (
          <AppText variant="caption">
            {t('card.progress', {
              percent,
              done: item.completedLessonCount,
              total: item.lessonCount,
            })}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    overflow: 'hidden',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
    cursor: 'pointer',
  },
  cardHover: { borderColor: t.colors.primary },
  photo: {
    width: '100%',
    aspectRatio: PHOTO_ASPECT,
    overflow: 'hidden',
    backgroundColor: t.colors.skeleton,
  },
  badge: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  hoverLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  play: {
    width: PLAY_SIZE,
    height: PLAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: t.colors.primary,
  },
  info: { gap: spacing.sm, padding: spacing.md },
  title: { minHeight: 42 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  review: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
}));

export const OwnedCourseCard = memo(OwnedCourseCardBase);
