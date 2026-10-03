/**
 * Design tokens - colors (CLAUDE.md §7, extracted from design/screens/*.png).
 * Never hard-code hex values in components; import from `@/theme`.
 */
export const colors = {
  primary: '#00BDD6',
  /** Pressed state of primary buttons. */
  primaryDark: '#00A3BA',
  /**
   * `primary` as a TEXT/link colour on light backgrounds (white, primaryLight, surface):
   * 5,18:1 on white (WCAG AA). Keep `primary` for fills, borders, icons, progress.
   */
  primaryText: '#00788A',
  primaryLight: '#EBFDFF',
  primaryTrack: '#A6F5FF',
  secondary: '#8353E2',
  secondaryLight: '#D9CBF6',
  /** `secondary` as text on light backgrounds incl. secondaryLight (avatar initials): 4,93:1. */
  secondaryText: '#6336BE',

  textPrimary: '#171A1F',
  textSecondary: '#565E6C',
  /**
   * Muted TEXT (instructor names, durations, counts): 5,38:1 on white, 4,89:1 on surface, 5,10:1
   * on backgroundAlt (WCAG AA). The lighter design grey lives on as `iconMuted`.
   */
  textMuted: '#636B78',
  /** Design grey #9095A0 for icons, decorative lines and disabled controls - never for text. */
  iconMuted: '#9095A0',
  /** Placeholder text inside inputs / the search field: >= 4,5:1 on surface. */
  placeholder: '#636B78',
  /** Text/icon on top of `primary` fills (white only reaches 2,27:1 there; this is 7,68:1). */
  textOnPrimary: '#171A1F',
  /** Text/icon on top of `secondary` fills (4,88:1). */
  textOnSecondary: '#FFFFFF',

  border: '#DEE1E6',
  /**
   * Card / tile outline. The design cards (Home, Search, Profile) are outlined with #F3F4F6, much
   * lighter than `border` (#DEE1E6), which stays for dividers, tab tracks and unselected controls.
   */
  borderSubtle: '#F3F4F6',
  surface: '#F3F4F6',
  background: '#FFFFFF',
  /** Review card / alternate background. */
  backgroundAlt: '#F8F9FA',

  star: '#F3C63F',
  danger: '#E05858',
  /** `danger` as text (errors) on white / dangerLight / surface: 5,27 / 4,62 / 4,79:1. */
  dangerText: '#C23B3B',
  dangerLight: '#FDECEC',
  orange: '#ED7D2D',
  blue: '#4069E5',
  success: '#2FA66A',

  /** Dim layer behind modals / sheets. */
  overlay: 'rgba(23, 26, 31, 0.5)',
  transparent: 'transparent',
  white: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;

/** Category icon colors as in the Home / Search design (keyed by lowercase category name). */
export const categoryColors: Record<string, string> = {
  business: colors.primary,
  design: colors.secondary,
  code: colors.danger,
  writing: colors.blue,
  movie: colors.secondary,
  language: colors.orange,
};
