import { parseHex } from './contrast';

/** `#RRGGBB` + opacity (0-1) -> `rgba(r, g, b, a)`. Used for scrims, glass fills and glows. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}
