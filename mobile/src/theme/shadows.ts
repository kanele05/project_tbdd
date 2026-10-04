import type { ViewStyle } from 'react-native';

/**
 * Design tokens - shadows. Noir is flat on its surfaces (hairlines, no card shadows); shadows are
 * reserved for floating layers (toast, sheets, tab bar) and the neon glow of the primary action in
 * dark mode. Written as CSS-style `boxShadow` strings: supported on iOS, Android (RN >= 0.76) and web.
 */
function boxShadow(value: string): ViewStyle {
  return { boxShadow: value };
}

export const shadows = {
  none: {} as ViewStyle,
  card: boxShadow('0 1px 3px rgba(0, 0, 0, 0.12)'),
  floating: boxShadow('0 8px 24px rgba(0, 0, 0, 0.3)'),
  sheet: boxShadow('0 -4px 24px rgba(0, 0, 0, 0.25)'),
  /** Floating tab bar / bottom CTA bar. */
  chrome: boxShadow('0 12px 32px rgba(0, 0, 0, 0.35)'),
  /** Neon halo behind the primary button and the play button (dark mode only). */
  glow: boxShadow('0 0 24px rgba(46, 242, 255, 0.35)'),
} as const;
