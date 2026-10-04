import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PriceTag } from '@/components/course';
import { AppText, Button, GlassSurface } from '@/components/ui';
import { SparklesIcon } from '@/components/ui/SparklesIcon';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing, useTheme } from '@/theme';
import type { CourseDetail } from '@/types/api';

import {
  getCourseAction,
  getCourseActionLabel,
  getDiscountPercent,
  type CourseAction,
} from '../courseAction';

export type CourseBottomBarProps = {
  course: Pick<CourseDetail, 'enrollment' | 'priceCents' | 'originalPriceCents' | 'isInCart'>;
  /** True while add-to-cart / enroll is in flight: the button shows a spinner. */
  isLoading: boolean;
  onAction: (action: CourseAction) => void;
  /** Shows the round AI button (signed-in users): jumps to the AI summary. */
  onAskAi?: () => void;
};

/** The round AI button is a full 48 dp target. */
const AI_BUTTON_SIZE = layout.minTouchTarget;

/** Space the scroll content must leave under the bar (bar height without the bottom inset). */
export const COURSE_BOTTOM_BAR_CLEARANCE = 100;

/**
 * Glass CTA bar pinned to the bottom of SC-09: stacked price (or the learning progress when
 * enrolled), the one neon button that follows BR-17 and the round AI button.
 */
function CourseBottomBarBase({ course, isLoading, onAction, onAskAi }: CourseBottomBarProps) {
  const { t } = useTranslation('course');
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const action = getCourseAction(course);
  const discountPercent = getDiscountPercent(course);

  return (
    <GlassSurface
      radius={0}
      isBordered={false}
      style={styles.bar}
      contentStyle={[styles.content, { paddingBottom: insets.bottom + spacing.sm }]}
      testID="course-bottom-bar"
    >
      <View style={styles.price}>
        {course.enrollment ? (
          <>
            <AppText variant="caption">{t('bar.progress')}</AppText>
            <AppText variant="h3">
              {t('bar.progressValue', { percent: course.enrollment.progressPercent })}
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
        title={getCourseActionLabel(action)}
        loading={isLoading}
        onPress={() => onAction(action)}
        style={styles.button}
        testID="course-action-button"
      />
      {onAskAi ? (
        <Pressable
          onPress={onAskAi}
          accessibilityRole="button"
          accessibilityLabel={t('ai.askA11y')}
          style={({ pressed }) => [styles.ai, pressed ? styles.pressed : null]}
          testID="course-ai-button"
        >
          <SparklesIcon size={22} color={colors.primaryText} />
        </Pressable>
      ) : null}
    </GlassSurface>
  );
}

const useStyles = makeStyles((t) => ({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  price: { flexShrink: 1 },
  // Tighter padding: "Đăng ký miễn phí" must stay on one line next to the price.
  button: { flex: 1, paddingHorizontal: spacing.md },
  ai: {
    width: AI_BUTTON_SIZE,
    height: AI_BUTTON_SIZE,
    borderRadius: AI_BUTTON_SIZE / 2,
    borderWidth: 1.5,
    borderColor: t.colors.primaryText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
}));

export const CourseBottomBar = memo(CourseBottomBarBase);
