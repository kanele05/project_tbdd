import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, GlassSurface, RailList } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { darkPalette, radius, spacing, withAlpha } from '@/theme';
import type { CourseSummary } from '@/types/api';

const CARD_WIDTH = 320;
const CARD_HEIGHT = 214;
const MAX_ITEMS = 6;

type InspireCardProps = { course: CourseSummary; onPress: (course: CourseSummary) => void };

/** Wide cinematic card: photo, play disc, serif title and "teacher · n lessons" on a scrim. */
const InspireCard = memo(function InspireCard({ course, onPress }: InspireCardProps) {
  const { t } = useTranslation(['home', 'common']);
  const meta = t('home:inspire.meta', {
    teacher: course.teacher.fullName,
    lessons: t('common:lessons.count', { count: course.lessonCount }),
  });
  return (
    <Pressable
      onPress={() => onPress(course)}
      accessibilityRole="button"
      accessibilityLabel={t('home:inspire.label', { title: course.title, meta })}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <Image
        source={{ uri: course.thumbnailUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
        recyclingKey={course.id}
        accessibilityIgnoresInvertColors
      />
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.9)']}
        locations={[0.2, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.play} pointerEvents="none">
        <GlassSurface tone="photo" intensity={30} radius={20} contentStyle={styles.playDisc}>
          <Feather name="play" size={18} color={darkPalette.white} />
        </GlassSurface>
      </View>
      <View style={styles.body}>
        <AppText variant="h2" color="white" numberOfLines={2}>
          {course.title}
        </AppText>
        <AppText variant="caption" numberOfLines={1} style={styles.meta}>
          {meta}
        </AppText>
      </View>
    </Pressable>
  );
});

type InspireRailProps = {
  title: string;
  courses: readonly CourseSummary[];
  onPressCourse: (course: CourseSummary) => void;
  onViewMore: () => void;
};

function keyExtractor(course: CourseSummary): string {
  return course.id;
}

/** "Course that inspires" rail: big photo cards (SC-04). */
export function InspireRail({ title, courses, onPressCourse, onViewMore }: InspireRailProps) {
  const renderItem = useCallback(
    (course: CourseSummary) => <InspireCard course={course} onPress={onPressCourse} />,
    [onPressCourse],
  );
  return (
    <RailList
      title={title}
      onViewMore={onViewMore}
      data={courses.slice(0, MAX_ITEMS)}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: darkPalette.surface,
  },
  pressed: { opacity: 0.88 },
  play: { position: 'absolute', top: spacing.md, right: spacing.md },
  playDisc: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.lg, gap: spacing.xs },
  meta: { color: withAlpha(darkPalette.white, 0.88) },
});
