import { memo } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { fontFamily, resolveColor, typography, useTheme } from '@/theme';
import type { ColorToken, FontFamilyToken, TextVariant } from '@/theme';

export type AppTextProps = TextProps & {
  /** Typography variant from the design type scale. Default `body`. */
  variant?: TextVariant;
  /** Color token. Default: `textMuted` for `caption`, `text` for everything else. */
  color?: ColorToken;
  align?: TextStyle['textAlign'];
  /** Override the font family (e.g. `bodyMedium`) while keeping the variant's size. */
  family?: FontFamilyToken;
  uppercase?: boolean;
};

/**
 * The only Text component to use in the app: applies Playfair Display / Be Vietnam Pro + size/line-height from the
 * theme and keeps font scaling enabled (CLAUDE.md §7). The color follows the active palette.
 */
function AppTextBase({
  variant = 'body',
  color,
  align,
  family,
  uppercase,
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();
  const resolvedColor = resolveColor(
    colors,
    color ?? (variant === 'caption' ? 'textMuted' : 'text'),
  );
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        { color: resolvedColor },
        align ? { textAlign: align } : null,
        family ? { fontFamily: fontFamily[family] } : null,
        uppercase ? { textTransform: 'uppercase' } : null,
        style,
      ]}
    />
  );
}

export const AppText = memo(AppTextBase);
