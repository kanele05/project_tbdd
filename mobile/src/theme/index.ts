import { colors } from './colors';
import { radius } from './radius';
import { shadows } from './shadows';
import { layout, spacing } from './spacing';
import { fontFamily, typography } from './typography';

export { categoryColors, colors, resolveColor } from './colors';
export type { ColorToken, LegacyColorToken } from './colors';
export { makeStyles } from './makeStyles';
export { darkPalette, lightPalette } from './palettes';
export type { Palette, PaletteToken } from './palettes';
export { radius } from './radius';
export type { RadiusToken } from './radius';
export { shadows } from './shadows';
export { layout, spacing } from './spacing';
export type { SpacingToken } from './spacing';
export { ThemeProvider, useTheme } from './ThemeProvider';
export type { Theme, ThemeMode } from './ThemeProvider';
export { fontAssets, fontFamily, typography } from './typography';
export type { FontFamilyToken, TextVariant } from './typography';

/**
 * Aggregated static tokens. `colors` here is the LEGACY light-only object; use `useTheme().colors`
 * (or `makeStyles`) for anything that must follow dark mode.
 */
export const theme = { colors, spacing, layout, radius, shadows, fontFamily, typography } as const;
