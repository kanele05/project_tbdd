import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout } from '@/theme';

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
  const rounded = Math.round(value);
  const isInteractive = Boolean(onChange);

  if (!isInteractive) {
    return (
      <View
        style={[styles.row, style]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Rated ${rounded} out of 5 stars`}
      >
        {STARS.map((star) => (
          <Ionicons
            key={star}
            name="star"
            size={size}
            color={star <= rounded ? colors.star : colors.border}
          />
        ))}
      </View>
    );
  }

  const slop = Math.max(0, Math.ceil((layout.minTouchTarget - size) / 2));
  return (
    <View style={[styles.row, styles.interactive, style]} accessibilityRole="radiogroup">
      {STARS.map((star) => (
        <Pressable
          key={star}
          onPress={() => onChange?.(star)}
          hitSlop={{ top: slop, bottom: slop }}
          accessibilityRole="radio"
          accessibilityLabel={`${star} ${star === 1 ? 'star' : 'stars'}`}
          accessibilityState={{ selected: star === rounded }}
        >
          <Ionicons name="star" size={size} color={star <= rounded ? colors.star : colors.border} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  interactive: { gap: 8 },
});

export const StarRating = memo(StarRatingBase);
