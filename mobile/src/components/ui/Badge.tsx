import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTranslation } from '@/i18n';
import { radius, useTheme } from '@/theme';
import type { Palette, PaletteToken } from '@/theme';

import { AppText } from './AppText';

export type BadgeTone = 'primary' | 'secondary' | 'danger' | 'success' | 'gold';

export type BadgeProps = {
  /** Text badge: "Best-seller", "20% Off", "Teacher", "Top-rated"... */
  label?: string;
  /** Count badge (round, red): cart / notification counters. Hidden when 0. */
  count?: number;
  /** Counts above `max` render as "99+". */
  max?: number;
  tone?: BadgeTone;
  /** `pill` = fully rounded (Teacher / Top-rated); `rect` = 6 dp radius (Best-seller / -40 %). */
  shape?: 'rect' | 'pill';
  style?: StyleProp<ViewStyle>;
};

const BADGE_PADDING_X = 8;

/** Fill token per tone. */
const TONE_FILL: Record<BadgeTone, PaletteToken> = {
  primary: 'primary',
  secondary: 'secondary',
  danger: 'danger',
  success: 'success',
  gold: 'gold',
};

/** Label color per fill: white fails AA on primary / danger / success, so those use dark text. */
const TONE_TEXT: Record<BadgeTone, PaletteToken> = {
  primary: 'onPrimary',
  secondary: 'onSecondary',
  danger: 'onDanger',
  success: 'onSuccess',
  gold: 'onGold',
};

function fillOf(colors: Palette, tone: BadgeTone): string {
  return colors[TONE_FILL[tone]];
}

function BadgeBase({ label, count, max = 99, tone, shape = 'rect', style }: BadgeProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (count !== undefined) {
    if (count <= 0) return null;
    const text = count > max ? `${max}+` : String(count);
    const countTone = tone ?? 'danger';
    return (
      <View
        style={[styles.count, { backgroundColor: fillOf(colors, countTone) }, style]}
        accessibilityLabel={t('badge.newCount', { count })}
      >
        <AppText
          variant="micro"
          color={TONE_TEXT[countTone]}
          family="bodySemiBold"
          style={styles.countText}
        >
          {text}
        </AppText>
      </View>
    );
  }
  if (!label) return null;
  const labelTone = tone ?? 'primary';
  return (
    <View
      style={[
        styles.label,
        shape === 'pill' ? styles.pill : styles.rect,
        { backgroundColor: fillOf(colors, labelTone) },
        style,
      ]}
    >
      <AppText variant="micro" color={TONE_TEXT[labelTone]} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    alignSelf: 'flex-start',
    paddingHorizontal: BADGE_PADDING_X,
    paddingVertical: 3,
    justifyContent: 'center',
  },
  rect: { borderRadius: radius.badge },
  pill: { borderRadius: radius.pill },
  count: {
    minWidth: 18,
    minHeight: 18,
    paddingHorizontal: 5,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { lineHeight: 14, fontSize: 10 },
});

export const Badge = memo(BadgeBase);
