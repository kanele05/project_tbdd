import { Platform, type ViewStyle } from 'react-native';

/**
 * Design tokens - shadows. The design uses 1 px borders on cards and (almost) no shadows,
 * so shadows are reserved for floating layers (toast, sheets, tab bar).
 */
function shadow(offsetY: number, radiusPx: number, opacity: number, elevation: number): ViewStyle {
  return Platform.select<ViewStyle>({
    android: { elevation },
    default: {
      shadowColor: '#171A1F',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radiusPx,
    },
  }) as ViewStyle;
}

export const shadows = {
  none: {} as ViewStyle,
  card: shadow(1, 3, 0.06, 1),
  floating: shadow(4, 12, 0.14, 6),
  sheet: shadow(-2, 12, 0.12, 8),
} as const;
