import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

export type BadgeTone = 'primary' | 'secondary' | 'danger' | 'success';

export type BadgeProps = {
  /** Text badge: "Best-seller", "20% Off", "Teacher", "Top-rated"... */
  label?: string;
  /** Count badge (round, red): cart / notification counters. Hidden when 0. */
  count?: number;
  /** Counts above `max` render as "99+". */
  max?: number;
  tone?: BadgeTone;
  /** `pill` = fully rounded (Teacher / Top-rated); `rect` = 4 dp radius (Best-seller / 20% Off). */
  shape?: 'rect' | 'pill';
  style?: StyleProp<ViewStyle>;
};

const TONE_COLOR: Record<BadgeTone, string> = {
  primary: colors.primary,
  secondary: colors.secondary,
  danger: colors.danger,
  success: colors.success,
};

function BadgeBase({ label, count, max = 99, tone, shape = 'rect', style }: BadgeProps) {
  if (count !== undefined) {
    if (count <= 0) return null;
    const text = count > max ? `${max}+` : String(count);
    return (
      <View
        style={[styles.count, { backgroundColor: TONE_COLOR[tone ?? 'danger'] }, style]}
        accessibilityLabel={`${count} new`}
      >
        <AppText variant="micro" color="white" family="bodySemiBold" style={styles.countText}>
          {text}
        </AppText>
      </View>
    );
  }
  if (!label) return null;
  return (
    <View
      style={[
        styles.label,
        shape === 'pill' ? styles.pill : styles.rect,
        { backgroundColor: TONE_COLOR[tone ?? 'primary'] },
        style,
      ]}
    >
      <AppText variant="caption" color="white" family="bodyMedium" numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    justifyContent: 'center',
  },
  rect: { borderRadius: radius.badge },
  pill: { borderRadius: radius.pill, paddingHorizontal: spacing.md },
  count: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { lineHeight: 14, fontSize: 10 },
});

export const Badge = memo(BadgeBase);
