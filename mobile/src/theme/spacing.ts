/** Design tokens - spacing (multiples of 4, CLAUDE.md §7). */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export type SpacingToken = keyof typeof spacing;

/** Layout constants measured from the design (375 px wide artboards, 1 px = 1 dp). */
export const layout = {
  /** Horizontal padding of every screen (content starts at x = 20 in the design). */
  screenPaddingX: 20,
  /** Minimum touch target (Android 48 dp / iOS 44 pt). */
  minTouchTarget: 48,
  headerHeight: 56,
  tabBarHeight: 64,
  inputHeight: 48,
  buttonHeight: 48,
  buttonHeightSmall: 36,
} as const;
