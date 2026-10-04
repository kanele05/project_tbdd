import type { PaletteToken, Palette } from './palettes';

/**
 * WCAG 2.x contrast helpers + the list of foreground/background pairs every palette must satisfy.
 * Pure functions (no runtime imports) so `scripts/contrast-report.mjs` can load this file directly.
 */

export type ContrastPair = {
  /** Foreground token (text / icon). */
  fg: PaletteToken;
  /** Background token it is drawn on. */
  bg: PaletteToken;
  /** Minimum ratio: 4.5 for text, 3 for meaningful icons / graphics. */
  min: 4.5 | 3;
  /** Where the pair appears (shown in the report). */
  usage: string;
};

function pair(fg: PaletteToken, bg: PaletteToken, usage: string, min: 4.5 | 3 = 4.5): ContrastPair {
  return { fg, bg, min, usage };
}

/** TEXT pairs (>= 4,5:1). Enforced for every palette. */
export const TEXT_PAIRS: readonly ContrastPair[] = [
  pair('text', 'background', 'Body text on screens'),
  pair('text', 'surface', 'Text in inputs / chips'),
  pair('text', 'surfaceAlt', 'Text on review cards'),
  pair('text', 'card', 'Text on cards'),
  pair('text', 'tabBar', 'Text on the tab bar'),
  pair('text', 'primarySoft', 'Secondary button label / active lesson title'),
  pair('text', 'primaryTrack', 'Secondary button label (pressed)'),
  pair('textSecondary', 'background', 'Secondary text'),
  pair('textSecondary', 'surface', 'Secondary text on surfaces'),
  pair('textSecondary', 'card', 'Secondary text on cards'),
  pair('textSecondary', 'surfaceAlt', 'Secondary text on review cards'),
  pair('textSecondary', 'primarySoft', 'Secondary text on the active lesson'),
  pair('textSecondary', 'tabBar', 'Inactive tab label'),
  pair('textMuted', 'background', 'Muted text (teacher, duration)'),
  pair('textMuted', 'surface', 'Muted text on surfaces'),
  pair('textMuted', 'surfaceAlt', 'Muted text on review cards'),
  pair('textMuted', 'card', 'Muted text on cards'),
  pair('textMuted', 'primarySoft', 'Muted text on the active lesson'),
  pair('placeholder', 'surface', 'Input placeholder'),
  pair('primaryText', 'background', 'Links, prices, active tab label'),
  pair('primaryText', 'surface', 'Links on surfaces'),
  pair('primaryText', 'card', 'Prices on cards'),
  pair('primaryText', 'surfaceAlt', 'Links on review cards'),
  pair('primaryText', 'primarySoft', 'Link on the active lesson'),
  pair('primaryText', 'tabBar', 'Active tab label'),
  pair('onPrimary', 'primary', 'Primary button / selected chip'),
  pair('onPrimary', 'primaryPressed', 'Primary button pressed'),
  pair('onSecondary', 'secondary', 'Secondary badge / banner'),
  pair('secondaryText', 'secondarySoft', 'Avatar initials'),
  pair('secondaryText', 'primaryTrack', 'Profile avatar initials'),
  pair('dangerText', 'background', 'Error text'),
  pair('dangerText', 'surface', 'Error text on inputs'),
  pair('dangerText', 'dangerSoft', 'Form error banner'),
  pair('dangerText', 'card', 'Log out row on cards'),
  pair('onDanger', 'danger', 'Count badge'),
  pair('onSuccess', 'success', 'Success badge'),
  pair('onToast', 'toast', 'Toast message'),
  pair('toastAccent', 'toast', 'Toast action'),
  pair('onBanner', 'banner', 'Offline banner'),
];

/**
 * Icons / graphics that carry meaning (>= 3:1, WCAG 1.4.11). Enforced for the DARK palette. The
 * light palette keeps the original brand fills (cyan `primary`, yellow `star`), which are below
 * 3:1 on white; they are never the only carrier of information (a label or the filled shape is
 * always there) and are reported as "exempt" instead of failing.
 */
export const GRAPHIC_PAIRS: readonly ContrastPair[] = [
  pair('primary', 'background', 'Active tab icon, outlines', 3),
  pair('primary', 'primarySoft', 'Empty-state icon, selected check', 3),
  pair('danger', 'background', 'Error icon', 3),
  pair('danger', 'dangerSoft', 'Error-state icon', 3),
  pair('iconMuted', 'background', 'Muted icons', 3),
  pair('star', 'background', 'Rating stars', 3),
  pair('starEmpty', 'background', 'Unfilled rating stars', 3),
  pair('starEmpty', 'card', 'Unfilled stars on cards', 3),
  pair('success', 'background', 'Success icon', 3),
  pair('success', 'toast', 'Success toast icon', 3),
  pair('danger', 'toast', 'Error toast icon', 3),
  pair('primary', 'toast', 'Info toast icon', 3),
];

export const ALL_PAIRS: readonly ContrastPair[] = [...TEXT_PAIRS, ...GRAPHIC_PAIRS];

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** Parse `#RGB` / `#RRGGBB` (alpha colors and `transparent` are not valid inputs). */
export function parseHex(hex: string): [number, number, number] {
  const clean = hex.trim().replace('#', '');
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Not a hex color: ${hex}`);
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Relative luminance (WCAG 2.x). */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio between two colors, 1 to 21. */
export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

export type PairResult = ContrastPair & { ratio: number; passes: boolean };

/** Evaluate a list of pairs against a palette. */
export function evaluatePairs(
  palette: Palette,
  pairs: readonly ContrastPair[] = ALL_PAIRS,
): PairResult[] {
  return pairs.map((p) => {
    const ratio = contrastRatio(palette[p.fg], palette[p.bg]);
    return { ...p, ratio, passes: ratio >= p.min };
  });
}
