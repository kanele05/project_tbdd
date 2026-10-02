import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PriceTag } from '@/components/course';
import { AppText, Button } from '@/components/ui';
import { colors, spacing } from '@/theme';
import type { CourseDetail } from '@/types/api';

import {
  COURSE_ACTION_LABEL,
  getCourseAction,
  getDiscountPercent,
  type CourseAction,
} from '../courseAction';

export type CourseBottomBarProps = {
  course: Pick<CourseDetail, 'enrollment' | 'priceCents' | 'originalPriceCents' | 'isInCart'>;
  /** True while add-to-cart / enroll is in flight: the button shows a spinner. */
  isLoading: boolean;
  onAction: (action: CourseAction) => void;
};

const MIN_BUTTON_WIDTH = 160;

/**
 * Fixed bottom bar of SC-09: price + "x% Disc. ~~$original~~" on the left, the BR-17 action button
 * on the right. Enrolled users see their progress instead of a price.
 */
function CourseBottomBarBase({ course, isLoading, onAction }: CourseBottomBarProps) {
  const insets = useSafeAreaInsets();
  const action = getCourseAction(course);
  const discountPercent = getDiscountPercent(course);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.price}>
        {course.enrollment ? (
          <>
            <AppText variant="caption">Your progress</AppText>
            <AppText variant="title" family="headingBold">
              {`${course.enrollment.progressPercent}% complete`}
            </AppText>
          </>
        ) : (
          <PriceTag
            layout="stacked"
            priceCents={course.priceCents}
            originalPriceCents={course.originalPriceCents}
            discountPercent={discountPercent > 0 ? discountPercent : null}
          />
        )}
      </View>
      <Button
        title={COURSE_ACTION_LABEL[action]}
        size="sm"
        loading={isLoading}
        leftIcon={action === 'CONTINUE' ? 'play' : 'shopping-cart'}
        onPress={() => onAction(action)}
        style={styles.button}
        testID="course-action-button"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  price: { flexShrink: 1 },
  button: { minWidth: MIN_BUTTON_WIDTH },
});

export const CourseBottomBar = memo(CourseBottomBarBase);
