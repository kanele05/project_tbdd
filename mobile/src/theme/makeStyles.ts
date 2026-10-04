import { useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import { useTheme, type Theme } from './ThemeProvider';

type NamedStyles<T> = { [K in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Themed `StyleSheet.create`. Declare the styles once at module level with a factory that receives
 * the theme, and call the returned hook inside the component:
 *
 * ```ts
 * const useStyles = makeStyles((t) => ({
 *   card: { backgroundColor: t.colors.card, borderColor: t.colors.borderSubtle },
 * }));
 *
 * function Card() {
 *   const styles = useStyles();           // memoized: rebuilt only when the theme changes
 *   return <View style={styles.card} />;
 * }
 * ```
 *
 * Spacing, radius, typography and layout stay static imports from `@/theme`. Values that depend on
 * props (sizes, insets) are passed as inline style arrays on top of the themed style.
 */
export function makeStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T): () => T {
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}
