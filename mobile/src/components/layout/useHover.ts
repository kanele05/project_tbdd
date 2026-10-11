import { useCallback, useState } from 'react';

/**
 * Hover state for a `Pressable` (react-native-web fires `onHoverIn/Out` for a mouse; on touch
 * devices they never fire, so `isHovered` stays false).
 */
export function useHover() {
  const [isHovered, setIsHovered] = useState(false);
  const onHoverIn = useCallback(() => setIsHovered(true), []);
  const onHoverOut = useCallback(() => setIsHovered(false), []);
  return { isHovered, hoverProps: { onHoverIn, onHoverOut } };
}
