import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colors, radius, spacing } from '@/theme';
import type { MyCourseItem } from '@/types/api';
import { formatDuration } from '@/utils/formatDuration';

export type CourseProgressCardProps = {
  item: MyCourseItem;
  /** Keep this callback stable (`useCallback`) so `React.memo` can skip re-renders in lists. */
  onPress: (item: MyCourseItem) => void;
};

const THUMBNAIL_SIZE = 96;

/**
 * SC-14 row: thumbnail, title, total duration ("2 hrs 25 mins"), "30% Complete" and a progress
 * bar (primary on `primaryTrack`). Measured from the design: 14 px Inter title, 12 px muted
 * lines, a 4 dp bar, a 122 dp card with a barely visible (`surface`) border.
 */
function CourseProgressCardBase({ item, onPress }: CourseProgressCardProps) {
  const percent = Math.round(item.progressPercent);
  const duration = formatDuration(item.totalDurationSec);
  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.course.title}, ${duration}, ${percent}% complete`}
      testID={`my-course-${item.course.id}`}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: item.course.thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          recyclingKey={item.course.id}
          accessibilityIgnoresInvertColors
        />
      </View>
      <View style={styles.info}>
        <AppText variant="label" numberOfLines={2}>
          {item.course.title}
        </AppText>
        <AppText variant="caption" style={styles.duration}>
          {duration}
        </AppText>
        <AppText variant="caption" style={styles.complete}>
          {`${percent}% Complete`}
        </AppText>
        <ProgressBar percent={percent} height={4} style={styles.bar} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.badge,
    borderWidth: 1,
    borderColor: colors.surface,
    backgroundColor: colors.background,
  },
  pressed: { opacity: 0.85 },
  imageWrap: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    overflow: 'hidden',
    borderRadius: radius.button,
    backgroundColor: colors.surface,
  },
  info: { flex: 1 },
  duration: { marginTop: spacing.xs },
  complete: { marginTop: spacing.xl },
  bar: { marginTop: spacing.sm },
});

export const CourseProgressCard = memo(CourseProgressCardBase);
