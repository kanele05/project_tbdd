/**
 * Design tokens - radius (concept B "Noir"): generous curves. Buttons / chips / search are pills,
 * cards and photos 12-16, the AI card and sheets 24-28, the floating tab bar 32.
 */
export const radius = {
  xs: 4,
  /** Tags on photos (sale / best-seller) and small boxes. */
  badge: 6,
  /** Thumbnails, small icon tiles. NOT the Button (that one is a `pill`). */
  button: 12,
  /** Text fields. */
  input: 16,
  /** Cards, posters, list rows. */
  card: 16,
  lg: 20,
  /** AI card, large panels. */
  xl: 24,
  /** Bottom sheets, hero bottom corners (light mode). */
  sheet: 28,
  /** Floating tab bar. */
  bar: 32,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;
