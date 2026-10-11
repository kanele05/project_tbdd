import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getPageGutter } from '@/components/layout/pageGutter';
import { AppText, Badge, Button, Skeleton } from '@/components/ui';
import { PreviewPlayerModal } from '@/features/course/components/PreviewPlayerModal';
import { openCourse, openCourseList } from '@/features/search/navigation';
import { useTranslation } from '@/i18n';
import { darkPalette, makeStyles, spacing, useTheme, withAlpha } from '@/theme';

import type { Billboard } from '../billboards';
import { useBillboardCourse } from '../hooks';

type DesktopBillboardProps = {
  items: readonly Billboard[];
  /** Total height of the billboard (it extends under the transparent top navigation). */
  height: number;
  /** Window width, to line the text up with the page gutter. */
  width: number;
};

const CONTENT_MAX_WIDTH = 560;
const TITLE_STYLE = { fontSize: 52, lineHeight: 60 } as const;

/**
 * Full-bleed billboard of Home on wide screens (Netflix style): the featured course photo with a
 * dark fade to the left and bottom, the title, a short description and two buttons - "Preview"
 * (plays the preview lesson in a modal) and "Details" (the course page). Several banners are
 * switched with the dots on the right.
 */
export function DesktopBillboard({ items, height, width }: DesktopBillboardProps) {
  const { t } = useTranslation(['home', 'common']);
  const { colors } = useTheme();
  const styles = useStyles();
  const [index, setIndex] = useState(0);
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
  const item = items[Math.min(index, items.length - 1)];
  const { data: detail } = useBillboardCourse(item?.courseId ?? null);
  const gutter = getPageGutter(width);
  const handleClosePreview = useCallback(() => setPreviewLessonId(null), []);
  if (!item) return null;

  const course = detail ?? item.course;
  const meta = course
    ? t('home:inspire.meta', {
        teacher: course.teacher.fullName,
        lessons: t('common:lessons.count', { count: course.lessonCount }),
      })
    : '';
  const description = detail?.subtitle || detail?.description || meta;
  const lessonToPreview = detail?.previewLessonId ?? null;
  const openDetails = () => {
    if (item.courseId) openCourse(item.courseId);
    else openCourseList({ categoryId: item.categoryId ?? undefined });
  };

  return (
    <View style={[styles.root, { height }]} testID="home-billboard">
      <Image
        source={{ uri: item.imageUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
        accessibilityIgnoresInvertColors
      />
      <LinearGradient
        colors={[
          withAlpha(darkPalette.scrim, 0.94),
          withAlpha(darkPalette.scrim, 0.55),
          withAlpha(darkPalette.scrim, 0),
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[withAlpha(colors.background, 0), colors.background]}
        locations={[0, 1]}
        style={styles.bottomFade}
      />
      <View style={[styles.content, { paddingLeft: gutter }]}>
        {item.tag ? <Badge label={item.tag} tone="gold" /> : null}
        <AppText variant="hero" color="white" numberOfLines={3} style={TITLE_STYLE}>
          {item.title}
        </AppText>
        {description ? (
          <AppText variant="bodyLarge" numberOfLines={3} style={styles.description}>
            {description}
          </AppText>
        ) : null}
        <View style={styles.actions}>
          {lessonToPreview ? (
            <Button
              title={t('home:billboard.preview')}
              leftIcon="play"
              onPress={() => setPreviewLessonId(lessonToPreview)}
              accessibilityLabel={t('home:billboard.previewLabel', { title: item.title })}
            />
          ) : null}
          <Button
            title={t('home:billboard.details')}
            leftIcon="info"
            variant={lessonToPreview ? 'secondary' : 'primary'}
            onPress={openDetails}
            accessibilityLabel={t('home:billboard.detailsLabel', { title: item.title })}
          />
        </View>
      </View>
      {items.length > 1 ? (
        <View style={[styles.dots, { right: gutter }]}>
          {items.map((entry, position) => (
            <Pressable
              key={entry.id}
              onPress={() => setIndex(position)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityState={{ selected: position === index }}
              accessibilityLabel={t('home:billboard.pick', { number: position + 1 })}
              style={[styles.dot, position === index ? styles.dotActive : null]}
            />
          ))}
        </View>
      ) : null}
      <PreviewPlayerModal lessonId={previewLessonId} onClose={handleClosePreview} />
    </View>
  );
}

/** Placeholder with the billboard's footprint while Home loads. */
export function DesktopBillboardSkeleton({ height }: { height: number }) {
  return <Skeleton height={height} borderRadius={0} />;
}

const useStyles = makeStyles((t) => ({
  root: {
    width: '100%',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    backgroundColor: t.colors.surface,
  },
  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '35%' },
  content: {
    maxWidth: CONTENT_MAX_WIDTH + 200,
    paddingBottom: spacing.huge * 2,
    paddingRight: spacing.xl,
    gap: spacing.lg,
  },
  description: { maxWidth: CONTENT_MAX_WIDTH, color: withAlpha(darkPalette.white, 0.92) },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingTop: spacing.xs },
  dots: {
    position: 'absolute',
    bottom: spacing.huge * 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: withAlpha(darkPalette.white, 0.45),
  },
  dotActive: { width: 28, backgroundColor: darkPalette.primary },
}));
