/**
 * Semantic color palettes (UI-02, skinned with concept B "Noir" in UI-04a). THIS IS THE ONLY FILE
 * TO EDIT TO RE-SKIN THE APP: replace the values below (keep the keys) and run
 * `npm run check:contrast`.
 *
 * Concept B in one sentence: dark-first and cinematic (near-black surfaces, warm off-white text),
 * ONE neon cyan accent for the primary action, champagne gold for ratings / promotions. The light
 * palette is the same structure printed on warm "magazine paper" (cream background, white cards).
 *
 * Rules
 * - Components never read hex values; they read `useTheme().colors.<token>` (see `makeStyles`).
 * - TEXT tokens must reach WCAG AA (>= 4,5:1) on every surface they are drawn on - the pairs are
 *   listed in `contrast.ts` and enforced by `palettes.test.ts`.
 * - FILL tokens (primary, secondary, danger, gold...) are brand fills for buttons, banners and
 *   icons; the text drawn on top of them uses the matching `onXxx` token.
 * - Keep this file free of runtime imports (it is also loaded by `scripts/contrast-report.mjs`).
 */
export type Palette = {
  /* Surfaces */
  /** Screen background (dark: near-black, light: cream paper). */
  background: string;
  /** Input / search-field / unselected-chip fill (raised one step above `card`). */
  surface: string;
  /** Alternate background (review card, pressed rows). */
  surfaceAlt: string;
  /** Card / sheet / popover fill. */
  card: string;
  /** Hairlines, unselected control outlines, tab tracks. */
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
  /** Neon fill: primary buttons, active tab pill, progress. Text on it is `onPrimary`. */
  primary: string;
  primaryPressed: string;
  /** The accent as TEXT / link / thin line on `background`, `surface`, `card`, `primarySoft`. */
  primaryText: string;
  /** Soft tint behind the active lesson, selected chips, icon wraps. */
  primarySoft: string;
  /** Track behind progress bars. */
  primaryTrack: string;
  /** Text / icon drawn on `primary` fills. */
  onPrimary: string;
  /** Violet: AI glow, secondary badges. */
  secondary: string;
  /** Text / icon drawn on `secondary` fills. */
  onSecondary: string;
  secondarySoft: string;
  /** `secondary` as TEXT on `secondarySoft` (avatar initials). */
  secondaryText: string;
  /** Champagne gold fill: promo / sale / best-seller tags. Text on it is `onGold`. */
  gold: string;
  onGold: string;
  /** Gold as TEXT (rating number, "-44%") on `background`, `surface`, `card`. */
  goldText: string;

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
  /** Filled rating star (champagne gold). */
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
  /**
   * Base color of floating chrome (tab bar, bottom CTA bar). Drawn at ~86 % opacity over a blur,
   * so every text token must also hold on this color blended with white and with black
   * (`GLASS_PAIRS` in `contrast.ts`).
   */
  tabBar: string;
  /** Hairline around floating glass (translucent on purpose). */
  glassBorder: string;
  /** Last color of the bottom scrim on a hero photo (the page background in dark mode). */
  scrim: string;
  /** Toast surface and the colors drawn on it (raised panel in dark mode, ink chip in light mode). */
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

/** Tokens whose value is not a plain `#RRGGBB` (translucent / keyword). */
export const NON_HEX_TOKENS: readonly PaletteToken[] = ['overlay', 'glassBorder', 'transparent'];

/** Warm "magazine paper" - same structure as the dark palette. */
export const lightPalette: Palette = {
  background: '#F5F2EA',
  surface: '#ECE7DB',
  surfaceAlt: '#FBF9F4',
  card: '#FFFFFF',
  border: '#D9D2C2',
  borderSubtle: '#E8E2D4',

  text: '#0D0D12',
  textSecondary: '#3D3A47',
  textMuted: '#5A5764',
  placeholder: '#625F6C',
  iconMuted: '#8C877A',

  primary: '#00DCEB',
  primaryPressed: '#00C4D2',
  primaryText: '#006B78',
  primarySoft: '#DCF1EF',
  primaryTrack: '#CBE7E5',
  onPrimary: '#04161A',
  secondary: '#5B3FD9',
  onSecondary: '#FFFFFF',
  secondarySoft: '#E6E0FB',
  secondaryText: '#4B2FB8',
  gold: '#C9A24B',
  onGold: '#1A1203',
  goldText: '#7A5A0B',

  danger: '#D2343F',
  dangerText: '#B3261E',
  dangerSoft: '#F9E3E1',
  onDanger: '#FFFFFF',
  success: '#12844F',
  onSuccess: '#FFFFFF',
  warning: '#C98A12',
  star: '#C9A24B',
  starEmpty: '#CCC4AE',

  orange: '#D9661C',
  blue: '#3B5BDB',

  overlay: 'rgba(13, 13, 18, 0.5)',
  skeleton: '#E6E0D2',
  tabBar: '#FFFFFF',
  glassBorder: 'rgba(13, 13, 18, 0.1)',
  scrim: '#0D0D12',
  toast: '#0D0D12',
  onToast: '#F6F2EA',
  toastAccent: '#2EF2FF',
  banner: '#3D3A47',
  onBanner: '#F5F2EA',

  white: '#FFFFFF',
  transparent: 'transparent',
};

/** Near-black with warm off-white text and the neon accent at full strength. */
export const darkPalette: Palette = {
  background: '#08080C',
  surface: '#1C1C27',
  surfaceAlt: '#101016',
  card: '#13131A',
  border: '#2A2A38',
  borderSubtle: '#1F1F2B',

  text: '#F6F2EA',
  textSecondary: '#C8C6D4',
  textMuted: '#A9A7B8',
  placeholder: '#9B99AC',
  iconMuted: '#7A7A92',

  primary: '#2EF2FF',
  primaryPressed: '#1FD3E0',
  primaryText: '#2EF2FF',
  primarySoft: '#0C2326',
  primaryTrack: '#14383D',
  onPrimary: '#021417',
  secondary: '#6D4DFF',
  onSecondary: '#FFFFFF',
  secondarySoft: '#221B4D',
  secondaryText: '#CBBDFF',
  gold: '#E9C77B',
  onGold: '#1A1203',
  goldText: '#E9C77B',

  danger: '#FF5C6C',
  dangerText: '#FF8E98',
  dangerSoft: '#2B1219',
  onDanger: '#1A0508',
  success: '#3DDC97',
  onSuccess: '#04170E',
  warning: '#F2B84B',
  star: '#E9C77B',
  starEmpty: '#6A6A84',

  orange: '#FF9F5A',
  blue: '#7C9CFF',

  overlay: 'rgba(0, 0, 0, 0.7)',
  skeleton: '#1C1C27',
  tabBar: '#13131A',
  glassBorder: 'rgba(255, 255, 255, 0.14)',
  scrim: '#08080C',
  toast: '#1C1C27',
  onToast: '#F6F2EA',
  toastAccent: '#2EF2FF',
  banner: '#2A2A38',
  onBanner: '#F6F2EA',

  white: '#FFFFFF',
  transparent: 'transparent',
};
