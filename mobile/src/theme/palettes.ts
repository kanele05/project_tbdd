/**
 * Semantic color palettes (UI-02). THIS IS THE ONLY FILE TO EDIT TO RE-SKIN THE APP: when the team
 * picks a design concept, replace the values below (keep the keys) and run `npm run check:contrast`.
 *
 * Rules
 * - Components never read hex values; they read `useTheme().colors.<token>` (see `makeStyles`).
 * - TEXT tokens must reach WCAG AA (>= 4,5:1) on every surface they are drawn on - the pairs are
 *   listed in `contrast.ts` and enforced by `palettes.test.ts`.
 * - FILL tokens (primary, secondary, danger, success...) are brand fills for buttons, banners and
 *   icons; the text drawn on top of them uses the matching `onXxx` token.
 * - Keep this file free of runtime imports (it is also loaded by `scripts/contrast-report.mjs`).
 */
export type Palette = {
  /* Surfaces */
  /** Screen background. */
  background: string;
  /** Input / search-field / unselected-chip fill. */
  surface: string;
  /** Alternate background (review card, pressed rows). */
  surfaceAlt: string;
  /** Card / sheet / popover fill. */
  card: string;
  /** Dividers, unselected control outlines, tab tracks. */
  border: string;
  /** Card outline (lighter than `border`). */
  borderSubtle: string;

  /* Text */
  text: string;
  textSecondary: string;
  textMuted: string;
  placeholder: string;
  /** Icons / decorative lines / disabled controls - never used for text. */
  iconMuted: string;

  /* Brand */
  primary: string;
  primaryPressed: string;
  /** `primary` as TEXT/link on `background`, `surface`, `card`, `primarySoft`. */
  primaryText: string;
  /** Soft tint behind the active lesson, icon wraps, outline-button pressed state. */
  primarySoft: string;
  /** Track behind progress bars. */
  primaryTrack: string;
  /** Text / icon drawn on `primary` fills. */
  onPrimary: string;
  secondary: string;
  /** Text / icon drawn on `secondary` fills. */
  onSecondary: string;
  secondarySoft: string;
  /** `secondary` as TEXT on `secondarySoft` (avatar initials). */
  secondaryText: string;

  /* Status */
  danger: string;
  dangerText: string;
  dangerSoft: string;
  /** Text drawn on `danger` fills (count badge). */
  onDanger: string;
  success: string;
  /** Text drawn on `success` fills. */
  onSuccess: string;
  warning: string;
  /** Filled rating star. */
  star: string;
  /** Unfilled rating star (still visible on dark surfaces). */
  starEmpty: string;

  /* Category accents (Home / Search category tiles) */
  orange: string;
  blue: string;

  /* Chrome */
  /** Dim layer behind modals / sheets. */
  overlay: string;
  skeleton: string;
  tabBar: string;
  /** Toast surface and the colors drawn on it (dark chip in light mode, raised panel in dark mode). */
  toast: string;
  onToast: string;
  toastAccent: string;
  /** Offline banner fill and its text. */
  banner: string;
  onBanner: string;

  white: string;
  transparent: string;
};

export type PaletteToken = keyof Palette;

export const lightPalette: Palette = {
  background: '#FFFFFF',
  surface: '#F3F4F6',
  surfaceAlt: '#F8F9FA',
  card: '#FFFFFF',
  border: '#DEE1E6',
  borderSubtle: '#F3F4F6',

  text: '#171A1F',
  textSecondary: '#565E6C',
  textMuted: '#636B78',
  placeholder: '#636B78',
  iconMuted: '#9095A0',

  primary: '#00BDD6',
  primaryPressed: '#00A3BA',
  primaryText: '#00788A',
  primarySoft: '#EBFDFF',
  primaryTrack: '#A6F5FF',
  onPrimary: '#171A1F',
  secondary: '#8353E2',
  onSecondary: '#FFFFFF',
  secondarySoft: '#D9CBF6',
  secondaryText: '#6336BE',

  danger: '#E05858',
  dangerText: '#C23B3B',
  dangerSoft: '#FDECEC',
  onDanger: '#171A1F',
  success: '#2FA66A',
  onSuccess: '#171A1F',
  warning: '#F59E0B',
  star: '#F3C63F',
  starEmpty: '#DEE1E6',

  orange: '#ED7D2D',
  blue: '#4069E5',

  overlay: 'rgba(23, 26, 31, 0.5)',
  skeleton: '#F3F4F6',
  tabBar: '#FFFFFF',
  toast: '#171A1F',
  onToast: '#FFFFFF',
  toastAccent: '#A6F5FF',
  banner: '#565E6C',
  onBanner: '#FFFFFF',

  white: '#FFFFFF',
  transparent: 'transparent',
};

export const darkPalette: Palette = {
  background: '#0E1217',
  surface: '#1B222B',
  surfaceAlt: '#151B22',
  card: '#151B22',
  border: '#2E3744',
  borderSubtle: '#232B36',

  text: '#F1F3F6',
  textSecondary: '#B9C1CD',
  textMuted: '#9AA3B2',
  placeholder: '#9AA3B2',
  iconMuted: '#6F7A8A',

  primary: '#00BDD6',
  primaryPressed: '#26CFE6',
  primaryText: '#3DD3E8',
  primarySoft: '#10303A',
  primaryTrack: '#1F4A55',
  onPrimary: '#06161A',
  secondary: '#8353E2',
  onSecondary: '#FFFFFF',
  secondarySoft: '#2B2250',
  secondaryText: '#C9B6F7',

  danger: '#E05858',
  dangerText: '#FF8D8D',
  dangerSoft: '#3A1E22',
  onDanger: '#171A1F',
  success: '#2FA66A',
  onSuccess: '#06160D',
  warning: '#F5B53D',
  star: '#F3C63F',
  starEmpty: '#5F6B7D',

  orange: '#ED7D2D',
  blue: '#6C8CF0',

  overlay: 'rgba(0, 0, 0, 0.65)',
  skeleton: '#232B36',
  tabBar: '#11161C',
  toast: '#2B3442',
  onToast: '#F1F3F6',
  toastAccent: '#6FE0F0',
  banner: '#2E3744',
  onBanner: '#F1F3F6',

  white: '#FFFFFF',
  transparent: 'transparent',
};
