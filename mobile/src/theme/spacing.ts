/** Design tokens - spacing (multiples of 4). */
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

/** Layout constants (concept B: 20 dp screen gutters, 32 dp between sections, 52 dp buttons). */
export const layout = {
  /** Horizontal padding of every screen and rail (content starts at x = 20). */
  screenPaddingX: 20,
  /** Minimum touch target (Android 48 dp / iOS 44 pt). */
  minTouchTarget: 48,
  headerHeight: 56,
  /** Height of the floating tab bar pill. */
  tabBarHeight: 64,
  /** Gap between the left / right screen edge and the floating tab bar. */
  tabBarMarginX: 16,
  /** Gap between the home indicator inset and the floating tab bar. */
  tabBarBottomGap: 4,
  inputHeight: 52,
  buttonHeight: 52,
  buttonHeightSmall: 40,
  /** Vertical space between two sections of a screen. */
  sectionGap: 32,
  /** Horizontal gap between two cards of a rail. */
  railGap: 14,
} as const;
