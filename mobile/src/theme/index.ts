import { colors } from './colors';
import { radius } from './radius';
import { shadows } from './shadows';
import { layout, spacing } from './spacing';
import { fontFamily, typography } from './typography';

export { categoryColors, colors } from './colors';
export type { ColorToken } from './colors';
export { radius } from './radius';
export type { RadiusToken } from './radius';
export { shadows } from './shadows';
export { layout, spacing } from './spacing';
export type { SpacingToken } from './spacing';
export { fontAssets, fontFamily, typography } from './typography';
export type { FontFamilyToken, TextVariant } from './typography';

/** Aggregated theme object for convenience: `import { theme } from '@/theme'`. */
export const theme = { colors, spacing, layout, radius, shadows, fontFamily, typography } as const;
