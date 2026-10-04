import { lightPalette, type Palette, type PaletteToken } from './palettes';

/**
 * LEGACY static colors (light palette only, old token names).
 *
 * @deprecated Phase 1 API kept only so screens that have not been migrated yet still compile. It
 * never reacts to dark mode. New and migrated code uses `useTheme().colors` / `makeStyles`
 * (`@/theme`), whose token names are listed in `palettes.ts`. Remove once every screen is migrated.
 */
export const colors = {
  primary: lightPalette.primary,
  primaryDark: lightPalette.primaryPressed,
  primaryText: lightPalette.primaryText,
  primaryLight: lightPalette.primarySoft,
  primaryTrack: lightPalette.primaryTrack,
  secondary: lightPalette.secondary,
  secondaryLight: lightPalette.secondarySoft,
  secondaryText: lightPalette.secondaryText,

  textPrimary: lightPalette.text,
  textSecondary: lightPalette.textSecondary,
  textMuted: lightPalette.textMuted,
  iconMuted: lightPalette.iconMuted,
  placeholder: lightPalette.placeholder,
  textOnPrimary: lightPalette.onPrimary,
  textOnSecondary: lightPalette.onSecondary,

  border: lightPalette.border,
  borderSubtle: lightPalette.borderSubtle,
  surface: lightPalette.surface,
  background: lightPalette.background,
  backgroundAlt: lightPalette.surfaceAlt,

  star: lightPalette.star,
  danger: lightPalette.danger,
  dangerText: lightPalette.dangerText,
  dangerLight: lightPalette.dangerSoft,
  orange: lightPalette.orange,
  blue: lightPalette.blue,
  success: lightPalette.success,

  overlay: lightPalette.overlay,
  transparent: lightPalette.transparent,
  white: lightPalette.white,
} as const;

/** @deprecated Old token names; use `PaletteToken` (semantic palette) in migrated code. */
export type LegacyColorToken = keyof typeof colors;

/**
 * Any color token accepted by shared components (`AppText color`, `IconButton color`...): the
 * semantic names of the palette, plus the old names while screens are being migrated.
 */
export type ColorToken = PaletteToken | LegacyColorToken;

/**
 * Old token name -> semantic token, so shared components (e.g. `AppText color="textMuted"`) keep
 * accepting the old names while screens are being migrated.
 */
export const LEGACY_COLOR_ALIASES: Record<LegacyColorToken, PaletteToken> = {
  primary: 'primary',
  primaryDark: 'primaryPressed',
  primaryText: 'primaryText',
  primaryLight: 'primarySoft',
  primaryTrack: 'primaryTrack',
  secondary: 'secondary',
  secondaryLight: 'secondarySoft',
  secondaryText: 'secondaryText',
  textPrimary: 'text',
  textSecondary: 'textSecondary',
  textMuted: 'textMuted',
  iconMuted: 'iconMuted',
  placeholder: 'placeholder',
  textOnPrimary: 'onPrimary',
  textOnSecondary: 'onSecondary',
  border: 'border',
  borderSubtle: 'borderSubtle',
  surface: 'surface',
  background: 'background',
  backgroundAlt: 'surfaceAlt',
  star: 'star',
  danger: 'danger',
  dangerText: 'dangerText',
  dangerLight: 'dangerSoft',
  orange: 'orange',
  blue: 'blue',
  success: 'success',
  overlay: 'overlay',
  transparent: 'transparent',
  white: 'white',
};

/** Category icon colors as in the Home / Search design (keyed by lowercase category name). */
export const categoryColors: Record<string, string> = {
  business: lightPalette.primary,
  design: lightPalette.secondary,
  code: lightPalette.danger,
  writing: lightPalette.blue,
  movie: lightPalette.secondary,
  language: lightPalette.orange,
};

/** Resolve a (semantic or legacy) token to a color of the given palette. */
export function resolveColor(palette: Palette, token: ColorToken): string {
  if (token in palette) return palette[token as PaletteToken];
  return palette[LEGACY_COLOR_ALIASES[token as LegacyColorToken]];
}
