import { type ReactNode } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useConceptEnv } from '../shared/env';
import type { Scheme } from '../shared/types';

/**
 * Concept C "Aurora": modern glassmorphism. A soft aurora (violet, teal, pink) glows behind
 * frosted-glass cards with a bright hairline edge, large radii and Plus Jakarta Sans.
 * Light = pastel daylight, dark = deep indigo night with the same aurora lit up.
 *
 * Text contrast is guaranteed by the `glass` / `strong` fills (not by the blur): see
 * notes/concepts/_contrast_c.py for the audited numbers (all text >= 4.5:1).
 */
export type PaletteC = {
  isDark: boolean;
  /** Page gradient, top to bottom. */
  bg: readonly [string, string, string];
  bgSolid: string;
  glowViolet: string;
  glowTeal: string;
  glowPink: string;
  glowOpacity: number;
  /** Frosted fill for cards floating over the aurora. */
  glass: string;
  /** Denser fill for panels that sit on photographs (worst case = a black or white photo). */
  strong: string;
  /** Hairline edge of every glass surface. */
  edge: string;
  shadow: string;
  blurTint: 'light' | 'dark';
  text: string;
  muted: string;
  violetText: string;
  tealText: string;
  pinkText: string;
  goldText: string;
  gold: string;
  /** Subtle fill for inputs / chips drawn on top of glass. */
  chip: string;
  hairline: string;
  track: string;
  /** Brand gradient (buttons, active states); white text on both stops is >= 4.5:1. */
  gradFrom: string;
  gradTo: string;
};

const LIGHT: PaletteC = {
  isDark: false,
  bg: ['#F4F1FF', '#EAF4FF', '#FFF0F7'],
  bgSolid: '#F4F1FF',
  glowViolet: '#9B7BFF',
  glowTeal: '#3FD6C4',
  glowPink: '#FF8DBF',
  glowOpacity: 0.55,
  glass: 'rgba(255,255,255,0.72)',
  strong: 'rgba(255,255,255,0.86)',
  edge: 'rgba(255,255,255,0.95)',
  shadow: '0 10px 32px rgba(82,54,214,0.14)',
  blurTint: 'light',
  text: '#1B1840',
  muted: '#514E78',
  violetText: '#5236D6',
  tealText: '#08635A',
  pinkText: '#B01459',
  goldText: '#7A4F00',
  gold: '#F5B72E',
  chip: 'rgba(91,61,240,0.09)',
  hairline: 'rgba(27,24,64,0.12)',
  track: 'rgba(91,61,240,0.14)',
  gradFrom: '#5B3DF0',
  gradTo: '#A23DD9',
};

const DARK: PaletteC = {
  isDark: true,
  bg: ['#080A1F', '#0B0F2C', '#150B2E'],
  bgSolid: '#080A1F',
  glowViolet: '#6A4BFF',
  glowTeal: '#0FBFB0',
  glowPink: '#FF4F9E',
  glowOpacity: 0.68,
  glass: 'rgba(16,18,50,0.72)',
  strong: 'rgba(14,16,44,0.82)',
  edge: 'rgba(255,255,255,0.18)',
  shadow: '0 12px 34px rgba(0,0,0,0.4)',
  blurTint: 'dark',
  text: '#F4F3FF',
  muted: '#BDBCE0',
  violetText: '#C2B3FF',
  tealText: '#5EEAD4',
  pinkText: '#FF9FCB',
  goldText: '#FFD27A',
  gold: '#FFC94D',
  chip: 'rgba(255,255,255,0.08)',
  hairline: 'rgba(255,255,255,0.14)',
  track: 'rgba(255,255,255,0.14)',
  gradFrom: '#6246F2',
  gradTo: '#A23DD9',
};

export const PALETTES_C: Record<Scheme, PaletteC> = { light: LIGHT, dark: DARK };

export function usePaletteC(): PaletteC {
  return PALETTES_C[useConceptEnv().scheme];
}

/** Each weight is its own family name (Android ignores fontWeight for custom fonts). */
export const FONT_C = {
  medium: 'PlusJakartaSans_500Medium',
  semi: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  black: 'PlusJakartaSans_800ExtraBold',
} as const;

export const PAD = 20;

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'tiny';
type ColorKey =
  'text' | 'muted' | 'violetText' | 'tealText' | 'pinkText' | 'goldText' | 'white' | 'whiteSoft';

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontFamily: FONT_C.black, fontSize: 30, lineHeight: 37, letterSpacing: -0.6 },
  h1: { fontFamily: FONT_C.black, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  h2: { fontFamily: FONT_C.bold, fontSize: 19, lineHeight: 26, letterSpacing: -0.2 },
  h3: { fontFamily: FONT_C.bold, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: FONT_C.medium, fontSize: 15, lineHeight: 24 },
  small: { fontFamily: FONT_C.semi, fontSize: 13, lineHeight: 18 },
  tiny: { fontFamily: FONT_C.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
};

type TProps = {
  v?: Variant;
  color?: ColorKey;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  align?: 'left' | 'center' | 'right';
};

export function T({ v = 'body', color = 'text', children, style, numberOfLines, align }: TProps) {
  const p = usePaletteC();
  const map: Record<ColorKey, string> = {
    text: p.text,
    muted: p.muted,
    violetText: p.violetText,
    tealText: p.tealText,
    pinkText: p.pinkText,
    goldText: p.goldText,
    white: '#FFFFFF',
    whiteSoft: 'rgba(255,255,255,0.92)',
  };
  return (
    <Text
      style={[VARIANTS[v], { color: map[color] }, align ? { textAlign: align } : null, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}
