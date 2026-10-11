import { memo, useMemo } from 'react';
import { View } from 'react-native';

import { PriceTag } from '@/components/course';
import { DESKTOP_NAV_HEIGHT } from '@/components/layout/desktopLayout';
import { AppText, Button, SparklesIcon } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { CourseDetail } from '@/types/api';

import {
  buildBenefits,
  getCourseAction,
  getCourseActionLabel,
  getDiscountPercent,
} from '../../courseAction';
import type { CourseDetailActions } from '../../useCourseDetailActions';
import { stickyStyle } from '../../webStyles';
import { BenefitsList } from '../BenefitsList';
import { ACTION_ICONS } from './actionIcons';

export type CoursePurchaseCardProps = {
  course: CourseDetail;
  actions: CourseDetailActions;
  onPlayPreview: () => void;
  /** Signed-in users get "Summarize with AI" (jumps to the AI block of the Overview tab). */
  onAskAi?: () => void;
  /** Stick under the nav bar while the page scrolls (PC only; the tablet card scrolls away). */
  isSticky?: boolean;
};

/**
 * The purchase card of the PC course page (PLAN §2.5): price (or progress when enrolled), the one
 * BR-17 button, the preview and AI buttons and "This course includes". Sticky on desktop.
 */
function CoursePurchaseCardBase({
  course,
  actions,
  onPlayPreview,
  onAskAi,
  isSticky = false,
}: CoursePurchaseCardProps) {
  const { t } = useTranslation('course');
  const { colors } = useTheme();
  const styles = useStyles();
  const action = getCourseAction(course, actions.isOwner);
  const discountPercent = getDiscountPercent(course);
  const benefits = useMemo(
    () => buildBenefits({ benefits: course.benefits, totalDurationSec: course.totalDurationSec }),
    [course.benefits, course.totalDurationSec],
  );

  let summary;
  if (actions.isOwner && !course.enrollment) {
    summary = (
      <AppText variant="title" testID="purchase-card-owner">
        {t('bar.yourCourse')}
      </AppText>
    );
  } else if (course.enrollment) {
    summary = (
      <>
        <AppText variant="caption">{t('bar.progress')}</AppText>
        <AppText variant="h2">
          {t('bar.progressValue', { percent: course.enrollment.progressPercent })}
        </AppText>
      </>
    );
  } else {
    summary = (
      <PriceTag
        layout="stacked"
        priceCents={course.priceCents}
        originalPriceCents={course.originalPriceCents}
        discountPercent={discountPercent > 0 ? discountPercent : null}
      />
    );
  }

  return (
    <View
      style={[styles.card, isSticky ? stickyStyle(DESKTOP_NAV_HEIGHT + spacing.lg) : null]}
      testID="course-purchase-card"
    >
      <View style={styles.summary}>{summary}</View>
      <Button
        title={getCourseActionLabel(action)}
        leftIcon={ACTION_ICONS[action]}
        loading={actions.isActionLoading}
        onPress={() => actions.onAction(action)}
        fullWidth
        testID="course-action-button"
      />
      {course.previewLessonId !== null ? (
        <Button
          title={t('desktop.preview')}
          variant="outline"
          leftIcon="play-circle"
          onPress={onPlayPreview}
          fullWidth
          testID="course-card-preview"
        />
      ) : null}
      {actions.isOwner ? (
        <Button
          title={t('bar.manage')}
          variant="ghost"
          leftIcon="edit-3"
          onPress={actions.onManage}
          fullWidth
          testID="course-manage-button"
        />
      ) : null}
      {onAskAi ? (
        <Button
          title={t('ai.generate')}
          variant="ghost"
          leftAdornment={<SparklesIcon size={20} color={colors.primaryText} />}
          onPress={onAskAi}
          fullWidth
          accessibilityLabel={t('ai.askA11y')}
          testID="course-ai-button"
        />
      ) : null}
      {benefits.length > 0 ? (
        <View style={styles.includes}>
          <AppText variant="title" accessibilityRole="header">
            {t('overview.includes')}
          </AppText>
          <BenefitsList benefits={benefits} />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.md,
    padding: spacing.xxl,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.card,
  },
  summary: { gap: spacing.xs, paddingBottom: spacing.xs },
  includes: { gap: spacing.md, paddingTop: spacing.md },
}));

export const CoursePurchaseCard = memo(CoursePurchaseCardBase);
