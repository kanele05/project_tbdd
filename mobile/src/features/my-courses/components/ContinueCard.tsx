import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { MyCourseItem } from '@/types/api';
import { formatDuration } from '@/utils/formatDuration';

export type ContinueCardProps = {
  item: MyCourseItem;
  onPress: (item: MyCourseItem) => void;
};

const CARD_ASPECT = 16 / 9;
/** White text sits on a scrim at least this dark (design-system rule: >= 0.72). */
const SCRIM_ALPHA = 0.82;

/**
 * "Continue learning": the course you studied last as a 16:9 poster with a dark scrim, white title,
 * a neon progress bar and the resume pill. The whole card is one button (the pill is only a hint).
 */
function ContinueCardBase({ item, onPress }: ContinueCardProps) {
  const { t } = useTranslation('myCourses');
  const { colors } = useTheme();
  const styles = useStyles();
  const percent = Math.round(item.progressPercent);
  const duration = formatDuration(item.totalDurationSec);
  const metaColor = withAlpha(colors.white, 0.88);
  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${t('cardLabel', { title: item.course.title, duration, percent })}, ${t('continue.action')}`}
      testID={`my-course-${item.course.id}`}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <Image
        source={{ uri: item.course.thumbnailUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
        recyclingKey={item.course.id}
        accessibilityIgnoresInvertColors
      />
      <LinearGradient
        colors={[withAlpha(colors.scrim, 0), withAlpha(colors.scrim, SCRIM_ALPHA)]}
        locations={[0.15, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.content}>
        <AppText variant="h3" color="white" numberOfLines={2}>
          {item.course.title}
        </AppText>
        <View style={styles.metaRow}>
          <View style={styles.meta}>
            <AppText variant="caption" style={{ color: metaColor }}>
              {t('percentComplete', { percent })}
            </AppText>
            <AppText variant="caption" style={{ color: metaColor }}>
              {duration}
            </AppText>
          </View>
          <View style={styles.pill}>
            <Feather name="play" size={16} color={colors.onPrimary} />
            <AppText variant="label" style={styles.pillText}>
              {t('continue.action')}
            </AppText>
          </View>
        </View>
        <ProgressBar percent={percent} height={4} trackColor={withAlpha(colors.white, 0.28)} />
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    width: '100%',
    aspectRatio: CARD_ASPECT,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.scrim,
  },
  pressed: { opacity: 0.9 },
  content: { gap: spacing.sm, padding: spacing.lg },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  meta: { flex: 1, gap: spacing.xxs },
  pill: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: t.colors.primary,
  },
  pillText: { color: t.colors.onPrimary },
}));

export const ContinueCard = memo(ContinueCardBase);
