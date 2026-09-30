import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius } from '@/theme';

export type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  /** Corner radius. Default `card` (8). Use `pill` for circles/avatars. */
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Loading placeholder block with a soft pulse. The pulse is skipped when the user enabled
 * "Reduce motion" (CLAUDE.md §7 / impeccable android guidance).
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radius.card,
  style,
}: SkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let isActive = true;
    let animation: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((isReduced) => {
        if (!isActive || isReduced) return;
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
          ]),
        );
        animation.start();
      })
      .catch(() => undefined);
    return () => {
      isActive = false;
      animation?.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.block, { width, height, borderRadius, opacity }, style]}
    />
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.surface },
});
