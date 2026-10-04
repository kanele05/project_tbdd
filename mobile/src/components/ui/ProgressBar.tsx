import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTranslation } from '@/i18n';
import { radius, useTheme } from '@/theme';

export type ProgressBarProps = {
  /** 0-100. Values outside the range are clamped. */
  percent: number;
  height?: number;
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
};

/** Course progress: primary fill on a `primaryTrack` background (My Courses cards). */
function ProgressBarBase({ percent, height = 4, color, trackColor, style }: ProgressBarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('a11y.percentComplete', { percent: Math.round(clamped) })}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={[styles.track, { height, backgroundColor: trackColor ?? colors.primaryTrack }, style]}
    >
      <View
        style={[styles.fill, { width: `${clamped}%`, backgroundColor: color ?? colors.primary }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});

export const ProgressBar = memo(ProgressBarBase);
