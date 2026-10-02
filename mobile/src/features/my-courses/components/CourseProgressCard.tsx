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
 * bar (primary on `primaryTrack`).
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
        <AppText variant="title" numberOfLines={2}>
          {item.course.title}
        </AppText>
        <AppText variant="body" color="textMuted">
          {duration}
        </AppText>
        <AppText variant="body" color="textMuted">
          {`${percent}% Complete`}
        </AppText>
        <ProgressBar percent={percent} height={6} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
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
  info: { flex: 1, justifyContent: 'center', gap: spacing.xs },
});

export const CourseProgressCard = memo(CourseProgressCardBase);
