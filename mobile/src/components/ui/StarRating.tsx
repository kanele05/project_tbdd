import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTranslation } from '@/i18n';
import { layout, useTheme } from '@/theme';

export type StarRatingProps = {
  /** Current rating, 0-5 (whole stars). */
  value: number;
  /** When provided, stars are tappable (Write review). Otherwise it is display-only. */
  onChange?: (rating: number) => void;
  /** Star size in dp. Default 16 (display) - use ~32 for the input variant. */
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const STARS = [1, 2, 3, 4, 5] as const;

/** Five stars: filled yellow up to `value`, light gray after. Interactive when `onChange` is set. */
function StarRatingBase({ value, onChange, size = 16, style }: StarRatingProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rounded = Math.round(value);
  const isInteractive = Boolean(onChange);

  if (!isInteractive) {
    return (
      <View
        style={[styles.row, style]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('a11y.ratedStars', { rating: rounded })}
      >
        {STARS.map((star) => (
          <Ionicons
            key={star}
            name="star"
            size={size}
            color={star <= rounded ? colors.star : colors.starEmpty}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.row, styles.interactive, style]} accessibilityRole="radiogroup">
      {STARS.map((star) => (
        <Pressable
          key={star}
          onPress={() => onChange?.(star)}
          style={styles.starButton}
          accessibilityRole="radio"
          accessibilityLabel={t('a11y.star', { count: star })}
          accessibilityState={{ selected: star === rounded }}
        >
          <Ionicons
            name="star"
            size={size}
            color={star <= rounded ? colors.star : colors.starEmpty}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  interactive: { gap: 0 },
  // Each star is a full 48 x 48 dp target; the icon is centered inside it.
  starButton: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const StarRating = memo(StarRatingBase);
