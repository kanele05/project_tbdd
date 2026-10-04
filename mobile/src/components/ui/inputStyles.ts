import { Platform, type TextStyle } from 'react-native';

/**
 * Web only: browsers draw their own (black / blue) focus outline around an `<input>`. Our fields
 * already show a themed focus state (border `primaryText`), so the native outline is removed.
 * react-native-web understands `outlineStyle: 'none'`, which the RN typings do not list, hence the
 * cast. Empty on iOS / Android.
 */
export const noWebFocusOutline: TextStyle =
  Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle) : {};
