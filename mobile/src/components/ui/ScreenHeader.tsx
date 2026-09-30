import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { STRINGS } from '@/constants/strings';
import { colors, layout, spacing } from '@/theme';

import { AppText } from './AppText';
import { IconButton } from './IconButton';

export type ScreenHeaderProps = {
  title?: string;
  /** Show the back chevron on the left. Default true. */
  showBack?: boolean;
  /** Custom back handler; defaults to `router.back()` (or `/` when there is no history). */
  onBack?: () => void;
  /** Right-side actions (bookmark, more-vertical...). Use `IconButton`s (48 dp targets). */
  right?: ReactNode;
  /** Apply the status-bar inset above the header. Default true. */
  withTopInset?: boolean;
  /** Transparent background (over a hero image). */
  transparent?: boolean;
  style?: StyleProp<ViewStyle>;
};

function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Screen header: back chevron | centered title | right actions. Height 56 dp + top inset.
 * The system Back button/gesture keeps working independently of this widget.
 */
export function ScreenHeader({
  title,
  showBack = true,
  onBack,
  right,
  withTopInset = true,
  transparent = false,
  style,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.container,
        { paddingTop: withTopInset ? insets.top : 0 },
        transparent ? null : styles.solid,
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.side}>
          {showBack ? (
            <IconButton
              icon="chevron-left"
              onPress={onBack ?? goBack}
              accessibilityLabel={STRINGS.common.back}
              color="textSecondary"
            />
          ) : null}
        </View>
        <AppText
          variant="h3"
          align="center"
          numberOfLines={1}
          accessibilityRole="header"
          style={styles.title}
        >
          {title}
        </AppText>
        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xs },
  solid: { backgroundColor: colors.background },
  row: { height: layout.headerHeight, flexDirection: 'row', alignItems: 'center' },
  side: { minWidth: 48, flexDirection: 'row', alignItems: 'center' },
  sideRight: { justifyContent: 'flex-end' },
  title: { flex: 1, paddingHorizontal: spacing.xs },
});
