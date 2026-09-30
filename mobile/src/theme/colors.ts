/**
 * Design tokens - colors (CLAUDE.md §7, extracted from design/screens/*.png).
 * Never hard-code hex values in components; import from `@/theme`.
 */
export const colors = {
  primary: '#00BDD6',
  /** Pressed state of primary buttons. */
  primaryDark: '#00A3BA',
  primaryLight: '#EBFDFF',
  primaryTrack: '#A6F5FF',
  secondary: '#8353E2',
  secondaryLight: '#D9CBF6',

  textPrimary: '#171A1F',
  textSecondary: '#565E6C',
  textMuted: '#9095A0',
  /** Text/icon on top of primary/secondary/danger fills. */
  textOnPrimary: '#FFFFFF',

  border: '#DEE1E6',
  surface: '#F3F4F6',
  background: '#FFFFFF',
  /** Review card / alternate background. */
  backgroundAlt: '#F8F9FA',

  star: '#F3C63F',
  danger: '#E05858',
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
