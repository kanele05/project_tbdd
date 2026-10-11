import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, GlassSurface, ProgressBar, RailList, Skeleton } from '@/components/ui';
import { useMyCourses } from '@/features/my-courses/hooks';
import { useTranslation } from '@/i18n';
import { darkPalette, layout, makeStyles, radius, spacing } from '@/theme';
import type { MyCourseItem } from '@/types/api';
import { formatDuration } from '@/utils/formatDuration';

const CARD_WIDTH = 248;
const THUMB_HEIGHT = 140;
const MAX_ITEMS = 8;

function keyExtractor(item: MyCourseItem): string {
  return item.course.id;
}

/** Remaining watch time, rounded UP to whole minutes and never below one minute. */
export function getRemainingSeconds(
  item: Pick<MyCourseItem, 'totalDurationSec' | 'progressPercent'>,
) {
  const remaining = (item.totalDurationSec * (100 - item.progressPercent)) / 100;
  return Math.max(1, Math.ceil(remaining / 60)) * 60;
}

type ContinueCardProps = { item: MyCourseItem; onPress: (item: MyCourseItem) => void };

/** "Continue watching" card: 16:9 thumbnail with a play disc and a neon progress line. */
const ContinueCard = memo(function ContinueCard({ item, onPress }: ContinueCardProps) {
  const { t } = useTranslation('home');
  const styles = useStyles();
  const percent = Math.round(item.progressPercent);
  const meta = t('continue.meta', {
    percent,
    time: formatDuration(getRemainingSeconds(item)),
  });
  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={t('continue.label', { title: item.course.title, meta })}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.thumb}>
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
          colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.55)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.play} pointerEvents="none">
          <GlassSurface tone="photo" intensity={30} radius={22} contentStyle={styles.playDisc}>
            <Feather name="play" size={20} color={darkPalette.white} />
          </GlassSurface>
        </View>
        <ProgressBar percent={percent} height={4} style={styles.progress} />
      </View>
      <AppText variant="cardTitle" numberOfLines={1} style={styles.title}>
        {item.course.title}
      </AppText>
      <AppText variant="caption" numberOfLines={1}>
        {meta}
      </AppText>
    </Pressable>
  );
});

export function openLesson(item: MyCourseItem): void {
  router.push({
    pathname: '/learn/[courseId]',
    params: {
      courseId: item.course.id,
      ...(item.lastLessonId ? { lessonId: item.lastLessonId } : {}),
    },
  });
}

function ContinueSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonTitle}>
        <Skeleton width={180} height={24} />
      </View>
      <View style={styles.skeletonRow}>
        <Skeleton width={CARD_WIDTH} height={THUMB_HEIGHT} borderRadius={radius.lg} />
        <Skeleton width={CARD_WIDTH} height={THUMB_HEIGHT} borderRadius={radius.lg} />
      </View>
    </View>
  );
}

/**
 * "Continue learning" rail of Home: the ongoing courses, newest activity first (`GET /me/courses`).
 * It is a bonus section: nothing is shown while there is no course in progress or when the
 * request fails (the rest of Home is unaffected).
 */
export function ContinueRail() {
  const { t } = useTranslation('home');
  const { data, isPending } = useMyCourses('ongoing');
  const renderItem = useCallback(
    (item: MyCourseItem) => <ContinueCard item={item} onPress={openLesson} />,
    [],
  );
  if (isPending) return <ContinueSkeleton />;
  const items = (data ?? []).filter((item) => item.progressPercent < 100).slice(0, MAX_ITEMS);
  if (items.length === 0) return null;
  return (
    <RailList
      title={t('continue.title')}
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
    />
  );
}

const useStyles = makeStyles((t) => ({
  card: { width: CARD_WIDTH, gap: spacing.xxs },
  pressed: { opacity: 0.85 },
  thumb: {
    height: THUMB_HEIGHT,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: t.colors.surface,
  },
  play: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  playDisc: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  progress: { position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: 0 },
  title: { marginTop: 0 },
  skeleton: { gap: spacing.md },
  skeletonTitle: { paddingHorizontal: layout.screenPaddingX },
  skeletonRow: {
    flexDirection: 'row',
    gap: layout.railGap,
    paddingHorizontal: layout.screenPaddingX,
    overflow: 'hidden',
  },
}));
