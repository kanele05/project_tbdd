import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';
import type { ColorToken } from '@/theme';

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

const BADGE_PADDING_X = 6;

const TONE_COLOR: Record<BadgeTone, string> = {
  primary: colors.primary,
  secondary: colors.secondary,
  danger: colors.danger,
  success: colors.success,
};

/** Label colour per fill: white fails AA on primary / danger / success, so those use dark text. */
const TONE_TEXT: Record<BadgeTone, ColorToken> = {
  primary: 'textOnPrimary',
  secondary: 'textOnSecondary',
  danger: 'textPrimary',
  success: 'textPrimary',
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
        <AppText
          variant="micro"
          color={TONE_TEXT[tone ?? 'danger']}
          family="bodySemiBold"
          style={styles.countText}
        >
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
      <AppText variant="micro" color={TONE_TEXT[tone ?? 'primary']} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    alignSelf: 'flex-start',
    // Design: "Best-seller" = 69 x 20 dp, "Teacher" = 54 x 20 dp (11 px text, 6 dp side padding).
    paddingHorizontal: BADGE_PADDING_X,
    paddingVertical: 3,
    justifyContent: 'center',
  },
  rect: { borderRadius: radius.badge },
  pill: { borderRadius: radius.pill },
  count: {
    minWidth: 16,
    minHeight: 16,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { lineHeight: 14, fontSize: 10 },
});

export const Badge = memo(BadgeBase);
