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

/** The design's button is 162 x 36 dp, right-aligned to the 20 dp screen padding. */
const MIN_BUTTON_WIDTH = 162;

/**
 * Fixed bottom bar of SC-09: price + "x% Disc. ~~$original~~" on the left, the BR-17 action button
 * on the right. Enrolled users see their progress instead of a price.
 */
function CourseBottomBarBase({ course, isLoading, onAction }: CourseBottomBarProps) {
  const insets = useSafeAreaInsets();
  const action = getCourseAction(course);
  const discountPercent = getDiscountPercent(course);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <View style={styles.price}>
        {course.enrollment ? (
          <>
            <AppText variant="caption">Your progress</AppText>
            <AppText variant="h3" family="headingBold">
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
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    // The design's divider is a barely visible hairline (#F6F6F7), not the card `border` color.
    borderTopColor: colors.surface,
    backgroundColor: colors.background,
  },
  price: { flexShrink: 1 },
  button: { minWidth: MIN_BUTTON_WIDTH },
});

export const CourseBottomBar = memo(CourseBottomBarBase);
