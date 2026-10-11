import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { darkPalette, fontFamily } from '@/theme';
import type { ColorToken } from '@/theme';

import { AppText } from './AppText';

export type WordmarkProps = {
  /** Font size of the "elearn" text in dp. Default 28 (the Home top bar). */
  size?: number;
  /** Color of the text. Default `white` (on photography); pass `text` on a solid page background. */
  textColor?: ColorToken;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export const WORDMARK_TEXT = 'elearn';

/**
 * The brand wordmark: "elearn" in Playfair italic plus the neon dot. Always white-on-dark (it sits
 * on photography / the intro), so it uses the fixed brand colors instead of the theme.
 */
function WordmarkBase({ size = 28, textColor = 'white', style, testID }: WordmarkProps) {
  const dot = Math.max(5, Math.round(size / 4));
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={WORDMARK_TEXT}
      style={[styles.row, { gap: Math.round(size / 9) }, style]}
    >
      <AppText
        color={textColor}
        importantForAccessibility="no"
        style={{
          fontFamily: fontFamily.displayItalic,
          fontSize: size,
          lineHeight: Math.round(size * 1.25),
          letterSpacing: -size / 56,
        }}
      >
        {WORDMARK_TEXT}
      </AppText>
      <View
        style={{
          width: dot,
          height: dot,
          borderRadius: dot,
          marginBottom: Math.round(size * 0.3),
          backgroundColor: darkPalette.primary,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
});

export const Wordmark = memo(WordmarkBase);
