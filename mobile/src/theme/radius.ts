/** Design tokens - radius (card 8, button 6, chip pill - CLAUDE.md §7). */
export const radius = {
  xs: 2,
  badge: 4,
  button: 6,
  input: 6,
  card: 8,
  lg: 12,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;
