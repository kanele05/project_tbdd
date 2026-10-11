import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';
import type { MyCourseItem } from '@/types/api';

export type ContinueHeroProps = {
  item: MyCourseItem;
  /** Keep stable (`useCallback`): opens the lesson the student left off at. */
  onContinue: (item: MyCourseItem) => void;
  /** Keep stable (`useCallback`): opens the course page. */
  onOpenDetails: (item: MyCourseItem) => void;
};

const PHOTO_ASPECT = 16 / 9;

/**
 * "Continue learning" band of the desktop My Courses page (Netflix "continue watching"): the
 * course studied last as a wide card - 16:9 photo on the left, title, last lesson, progress and the
 * resume / details buttons on the right.
 */
function ContinueHeroBase({ item, onContinue, onOpenDetails }: ContinueHeroProps) {
  const { t } = useTranslation('myCourses');
  const styles = useStyles();
  const percent = Math.round(item.progressPercent);
  const lessonLine = item.lastLesson
    ? t('hero.lesson', {
        number: item.lastLesson.number,
        total: item.lessonCount,
        title: item.lastLesson.title,
      })
    : t('hero.lessons', { count: item.lessonCount });
  return (
    <View style={styles.card} testID="my-courses-hero">
      <Pressable
        onPress={() => onContinue(item)}
        accessible={false}
        importantForAccessibility="no"
        style={styles.photoWrap}
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
      </Pressable>
      <View style={styles.info}>
        <AppText variant="micro" color="primaryText" uppercase style={styles.label}>
          {t('hero.label')}
        </AppText>
        <AppText variant="h2" numberOfLines={2} accessibilityRole="header">
          {item.course.title}
        </AppText>
        <AppText variant="body" color="textSecondary" numberOfLines={2}>
          {lessonLine}
        </AppText>
        <View style={styles.progressRow}>
          <ProgressBar percent={percent} height={6} style={styles.bar} />
          <AppText variant="label" family="bodyBold">
            {`${percent}%`}
          </AppText>
        </View>
        <View style={styles.actions}>
          <Button
            title={t('hero.resume')}
            leftIcon="play"
            onPress={() => onContinue(item)}
            testID="hero-continue"
          />
          <Button
            title={t('hero.details')}
            variant="secondary"
            onPress={() => onOpenDetails(item)}
            testID="hero-details"
          />
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  photoWrap: { flex: 11, aspectRatio: PHOTO_ASPECT, backgroundColor: t.colors.skeleton },
  info: { flex: 9, justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
  label: { letterSpacing: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bar: { flex: 1, width: undefined },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
}));

export const ContinueHero = memo(ContinueHeroBase);
