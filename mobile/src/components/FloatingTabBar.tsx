import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useContext, useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';

/**
 * Does the floating tab bar overlay the screen content (true Noir look: content scrolls under the
 * frosted bar) or does it take its own row below the content?
 *
 * Overlay needs every tab screen to end its scroll content with `useTabBarClearance()` padding;
 * all four tab screens (Home, Search, My courses, Profile) do, so it is on.
 */
export const TAB_BAR_OVERLAYS_CONTENT = true;

/** Height of the pill that holds the tabs. */
export const FLOATING_TAB_BAR_HEIGHT = layout.tabBarHeight;

/**
 * Bottom padding a tab screen's scroll content needs so its last item clears the floating bar.
 * 0 while the bar is not an overlay (it already takes its own row), so screens can add it today.
 */
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  if (!TAB_BAR_OVERLAYS_CONTENT) return 0;
  return FLOATING_TAB_BAR_HEIGHT + layout.tabBarBottomGap + insets.bottom + spacing.xxl;
}

function useIsKeyboardVisible(): boolean {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const show = Keyboard.addListener('keyboardDidShow', () => setIsVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setIsVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return isVisible;
}

/**
 * Concept B floating tab bar: a frosted pill with 16 dp margins, icons only, and the active tab as
 * a neon pill with its label. Text/icon contrast is guaranteed by the glass fill (`GLASS_ALPHA`),
 * not by the blur, so it also holds on Android where `BlurView` draws no real blur.
 * Hidden while the keyboard is open (it would sit on top of the input).
 */
export function FloatingTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  const isKeyboardVisible = useIsKeyboardVisible();

  if (isKeyboardVisible) return null;

  return (
    <View
      style={[
        styles.wrap,
        TAB_BAR_OVERLAYS_CONTENT ? styles.overlay : styles.flow,
        { paddingBottom: insets.bottom + layout.tabBarBottomGap },
      ]}
      onLayout={(event) => reportHeight?.(event.nativeEvent.layout.height)}
      testID="floating-tab-bar"
    >
      <GlassSurface hasShadow radius={radius.bar} contentStyle={styles.bar} style={styles.glass}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key] ?? { options: {} };
          const label = options.title ?? route.name;
          const isFocused = state.index === index;
          const color = isFocused ? colors.onPrimary : colors.textSecondary;

          const handlePress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={handlePress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityRole="tab"
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              accessibilityState={{ selected: isFocused }}
              testID={options.tabBarButtonTestID}
              style={({ pressed }) => [
                styles.tab,
                isFocused ? styles.tabActive : styles.tabIdle,
                pressed && !isFocused ? styles.pressed : null,
              ]}
            >
              {options.tabBarIcon?.({ focused: isFocused, color, size: 22 })}
              {isFocused ? (
                <AppText variant="micro" family="bodyBold" numberOfLines={1} style={styles.label}>
                  {label}
                </AppText>
              ) : null}
            </Pressable>
          );
        })}
      </GlassSurface>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { paddingHorizontal: layout.tabBarMarginX },
  // In flow mode the bar has its own row on the page background.
  flow: { backgroundColor: t.colors.background, paddingTop: spacing.sm },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' },
  glass: { alignSelf: 'stretch' },
  bar: {
    height: FLOATING_TAB_BAR_HEIGHT,
    paddingHorizontal: spacing.xs + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tab: {
    height: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm - 2,
  },
  tabIdle: { width: 56 },
  tabActive: { backgroundColor: t.colors.primary, paddingHorizontal: spacing.lg, flexShrink: 1 },
  pressed: { opacity: 0.6 },
  label: { color: t.colors.onPrimary, flexShrink: 1 },
}));
