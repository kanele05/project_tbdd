import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { MyCourseItem } from '@/types/api';
import { formatDuration } from '@/utils/formatDuration';

export type CourseProgressCardProps = {
  item: MyCourseItem;
  /** Keep this callback stable (`useCallback`) so `React.memo` can skip re-renders in lists. */
  onPress: (item: MyCourseItem) => void;
};

const THUMBNAIL_SIZE = 96;

/**
 * My Courses row (concept B list row): a hairline card with a 96 dp thumbnail, the title, the total
 * duration and "30% Complete" in the accent color above a neon progress bar. A finished course
 * shows a check instead of the bar's emptiness.
 */
function CourseProgressCardBase({ item, onPress }: CourseProgressCardProps) {
  const { t } = useTranslation('myCourses');
  const { colors } = useTheme();
  const styles = useStyles();
  const percent = Math.round(item.progressPercent);
  const duration = formatDuration(item.totalDurationSec);
  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={t('cardLabel', { title: item.course.title, duration, percent })}
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
        <AppText variant="cardTitle" numberOfLines={2}>
          {item.course.title}
        </AppText>
        <AppText variant="caption">{duration}</AppText>
        <View style={styles.progressRow}>
          {percent >= 100 ? <Feather name="check-circle" size={16} color={colors.success} /> : null}
          <AppText variant="caption" color="primaryText" family="bodySemiBold">
            {t('percentComplete', { percent })}
          </AppText>
        </View>
        <ProgressBar percent={percent} height={4} />
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  imageWrap: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    overflow: 'hidden',
    borderRadius: radius.button,
    backgroundColor: t.colors.surface,
  },
  info: { flex: 1, gap: spacing.xs, justifyContent: 'center' },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
}));

export const CourseProgressCard = memo(CourseProgressCardBase);
