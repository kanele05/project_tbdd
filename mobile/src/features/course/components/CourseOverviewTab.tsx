import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, spacing } from '@/theme';
import type { CourseDetail } from '@/types/api';

import { buildBenefits } from '../courseAction';
import { BenefitsList } from './BenefitsList';
import { CourseAiSummary } from './CourseAiSummary';
import { ExpandableText } from './ExpandableText';
import { SimilarCourses } from './SimilarCourses';

export type CourseOverviewTabProps = {
  course: CourseDetail;
  /** The AI summary exists only for signed-in users. */
  canUseAi: boolean;
  isAiRequested: boolean;
  onRequestAi: () => void;
  /** Reports the y of the AI block inside this tab so the bottom bar's AI button can scroll to it. */
  onAiLayout?: (y: number) => void;
};

/**
 * SC-09 Overview tab: description (4 lines + See more), "This course includes" checklist, the AI
 * summary block and a rail of similar courses.
 */
export function CourseOverviewTab({
  course,
  canUseAi,
  isAiRequested,
  onRequestAi,
  onAiLayout,
}: CourseOverviewTabProps) {
  const { t } = useTranslation('course');
  const benefits = useMemo(
    () => buildBenefits({ benefits: course.benefits, totalDurationSec: course.totalDurationSec }),
    [course.benefits, course.totalDurationSec],
  );

  return (
    <View style={styles.container}>
      <View style={styles.padded}>
        <ExpandableText text={course.description} />
      </View>
      {benefits.length > 0 ? (
        <View style={[styles.padded, styles.section]}>
          <AppText variant="h2" accessibilityRole="header">
            {t('overview.includes')}
          </AppText>
          <BenefitsList benefits={benefits} />
        </View>
      ) : null}
      {canUseAi ? (
        <View
          style={styles.padded}
          onLayout={(event) => onAiLayout?.(event.nativeEvent.layout.y)}
          testID="course-ai-block"
        >
          <CourseAiSummary
            courseId={course.id}
            isRequested={isAiRequested}
            onRequest={onRequestAi}
          />
        </View>
      ) : null}
      <SimilarCourses courseId={course.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: layout.sectionGap },
  padded: { paddingHorizontal: layout.screenPaddingX },
  section: { gap: spacing.lg },
});
