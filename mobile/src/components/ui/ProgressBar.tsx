import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

export type ProgressBarProps = {
  /** 0-100. Values outside the range are clamped. */
  percent: number;
  height?: number;
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
};

/** Course progress: primary fill on a `primaryTrack` background (My Courses cards). */
function ProgressBarBase({
  percent,
  height = 4,
  color = colors.primary,
  trackColor = colors.primaryTrack,
  style,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${Math.round(clamped)}% complete`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={[styles.track, { height, backgroundColor: trackColor }, style]}
    >
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});

export const ProgressBar = memo(ProgressBarBase);
