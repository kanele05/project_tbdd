import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { View } from 'react-native';

import { PageContainer } from '@/components/layout/PageContainer';
import { AppText, Badge, Button, GlassIconButton, HeroImage } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { makeStyles, spacing, useTheme, withAlpha } from '@/theme';
import type { CourseDetail } from '@/types/api';
import { formatTotalHours } from '@/utils/formatDuration';

import { ACTION_ICONS } from './actionIcons';
import { getCourseAction, getCourseActionLabel } from '../../courseAction';
import type { CourseDetailActions } from '../../useCourseDetailActions';

export type CourseDesktopHeroProps = {
  course: CourseDetail;
  /** Gold tag above the title ("Best-seller · Design"). */
  tag: string;
  height: number;
  actions: CourseDetailActions;
  onPlayPreview: () => void;
};

/** Desktop title size (the phone hero uses the 38 dp `hero` variant). */
const TITLE_SIZE = 52;
const TITLE_LINE_HEIGHT = 62;
const TEXT_MAX_WIDTH = 720;

/**
 * Netflix-style title-page hero (PLAN §2.5): the banner runs full-bleed under the transparent nav,
 * with the serif title, subtitle, facts and the two main buttons (BR-17 action + preview) bottom-left.
 */
function CourseDesktopHeroBase({
  course,
  tag,
  height,
  actions,
  onPlayPreview,
}: CourseDesktopHeroProps) {
  const { t } = useTranslation(['course', 'common']);
  const { colors } = useTheme();
  const styles = useStyles();
  const action = getCourseAction(course, actions.isOwner);
  const ratingText = formatNumber(course.ratingAvg, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const facts = [
    `${formatNumber(course.lessonCount)} ${t('course:stats.lessons')}`,
    `${formatTotalHours(course.totalDurationSec)} ${t('course:stats.duration')}`,
    `${formatNumber(course.likeCount)} ${t('course:stats.likes')}`,
  ];

  return (
    <HeroImage
      uri={course.bannerUrl ?? course.thumbnailUrl}
      height={height}
      withTopInset={false}
      isRoundedBottom={false}
      contentStyle={styles.content}
      testID="course-hero"
    >
      <PageContainer style={styles.inner}>
        <Badge label={tag} tone="gold" />
        <AppText
          variant="hero"
          color="white"
          numberOfLines={3}
          accessibilityRole="header"
          style={styles.title}
        >
          {course.title}
        </AppText>
        {course.subtitle ? (
          <AppText variant="bodyLarge" numberOfLines={3} style={styles.subtitle}>
            {course.subtitle}
          </AppText>
        ) : null}
        <View style={styles.meta}>
          <View
            style={styles.rating}
            accessible
            accessibilityLabel={`${ratingText} (${course.ratingCount})`}
          >
            <Ionicons name="star" size={16} color={colors.star} />
            <AppText variant="label" color="white">
              {ratingText}
            </AppText>
            <AppText variant="caption" style={styles.soft}>
              {`(${formatNumber(course.ratingCount)})`}
            </AppText>
          </View>
          {facts.map((fact) => (
            <AppText key={fact} variant="caption" style={styles.soft}>
              {fact}
            </AppText>
          ))}
          <AppText variant="caption" style={styles.soft}>
            {t('course:desktop.by', { name: course.teacher.fullName })}
          </AppText>
        </View>
        <View style={styles.buttons}>
          <Button
            title={getCourseActionLabel(action)}
            leftIcon={ACTION_ICONS[action]}
            loading={actions.isActionLoading}
            onPress={() => actions.onAction(action)}
            testID="course-hero-action"
          />
          {course.previewLessonId !== null ? (
            <Button
              title={t('course:desktop.preview')}
              variant="secondary"
              leftIcon="play-circle"
              onPress={onPlayPreview}
              testID="course-hero-preview"
            />
          ) : null}
          <GlassIconButton
            icon="share-2"
            accessibilityLabel={t('course:hero.share')}
            onPress={actions.onShare}
          />
          <GlassIconButton
            icon="heart"
            accessibilityLabel={course.isLiked ? t('course:hero.unlike') : t('course:hero.like')}
            isActive={course.isLiked}
            onPress={actions.onToggleLike}
          />
          <GlassIconButton
            icon="bookmark"
            accessibilityLabel={
              course.isBookmarked ? t('common:bookmark.remove') : t('common:bookmark.save')
            }
            isActive={course.isBookmarked}
            onPress={actions.onToggleBookmark}
          />
        </View>
      </PageContainer>
    </HeroImage>
  );
}

const useStyles = makeStyles((t) => ({
  // HeroImage pads its content by the phone gutter: the PageContainer inside sets the PC margins.
  content: { paddingHorizontal: 0, paddingBottom: spacing.huge },
  inner: { gap: spacing.lg },
  title: { fontSize: TITLE_SIZE, lineHeight: TITLE_LINE_HEIGHT, maxWidth: TEXT_MAX_WIDTH },
  subtitle: { color: withAlpha(t.colors.white, 0.9), maxWidth: TEXT_MAX_WIDTH },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.lg },
  rating: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  soft: { color: withAlpha(t.colors.white, 0.88) },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
}));

export const CourseDesktopHero = memo(CourseDesktopHeroBase);
