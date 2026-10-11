import { Platform, type ViewStyle } from 'react-native';

/**
 * Web-only style helpers of the PC work screens (Studio, Admin, teaching - PLAN §2.5). On Android /
 * iOS they return `{}` so the phone layout is untouched. The CSS values are missing from the
 * React Native `ViewStyle` type, hence the casts.
 */

/** `position: sticky` - the element stays `top` px below the scroll container's top edge. */
export function stickyTopStyle(top: number): ViewStyle {
  if (Platform.OS !== 'web') return {};
  return { position: 'sticky', top } as unknown as ViewStyle;
}

/** `position: sticky` at the bottom edge - a footer that stays in view while the page scrolls. */
export function stickyBottomStyle(bottom: number): ViewStyle {
  if (Platform.OS !== 'web') return {};
  return { position: 'sticky', bottom } as unknown as ViewStyle;
}

/** Pointer cursor for clickable rows (ignored on native). */
export const pointerStyle: ViewStyle = { cursor: 'pointer' };
