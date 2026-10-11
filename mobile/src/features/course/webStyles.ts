import { Platform, type ViewStyle } from 'react-native';

/**
 * Web-only style helpers for the PC layout (PLAN §2.5). On Android / iOS they return `{}` so the
 * phone layout is untouched. The CSS values are not in React Native's `ViewStyle` type, hence the cast.
 */

/** `position: sticky` - the element stays `top` px below the scroll container's top edge. */
export function stickyStyle(top: number): ViewStyle {
  if (Platform.OS !== 'web') return {};
  return { position: 'sticky', top } as unknown as ViewStyle;
}

/** `overflow: auto` - a column that scrolls on its own (scrollbar only when the content overflows). */
export function autoScrollStyle(): ViewStyle {
  if (Platform.OS !== 'web') return {};
  return { overflow: 'auto' } as unknown as ViewStyle;
}

/** Pointer cursor for clickable rows / cards (ignored on native). */
export const pointerStyle: ViewStyle = { cursor: 'pointer' };
