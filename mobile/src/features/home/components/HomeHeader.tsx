import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, IconButton } from '@/components/ui';
import { colors, spacing } from '@/theme';

type HomeHeaderProps = {
  greeting: string;
  cartCount: number;
  unreadCount: number;
  onPressCart: () => void;
  onPressNotifications: () => void;
};

export const HOME_SUBTITLE = 'What do you want to learn today?';

function countLabel(base: string, count: number, noun: string): string {
  return count > 0 ? `${base}, ${count} ${noun}` : base;
}

/** Primary-colored header of SC-04: greeting + subtitle, cart and bell icons with badges. */
export function HomeHeader({
  greeting,
  cartCount,
  unreadCount,
  onPressCart,
  onPressNotifications,
}: HomeHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={styles.texts}>
          <AppText variant="h2" color="textOnPrimary" numberOfLines={1} accessibilityRole="header">
            {greeting}
          </AppText>
          <AppText variant="caption" color="textOnPrimary" style={styles.subtitle}>
            {HOME_SUBTITLE}
          </AppText>
        </View>
        <IconButton
          icon="shopping-cart"
          color="textOnPrimary"
          badgeCount={cartCount}
          onPress={onPressCart}
          accessibilityLabel={countLabel(
            'Open cart',
            cartCount,
            cartCount === 1 ? 'item' : 'items',
          )}
        />
        <IconButton
          icon="bell"
          color="textOnPrimary"
          badgeCount={unreadCount}
          onPress={onPressNotifications}
          accessibilityLabel={countLabel('Open notifications', unreadCount, 'unread')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Design (375 x 812 frame): greeting line starts right below the status bar, header is 66 dp
  // tall without the inset, icons end 8 dp before the right edge.
  container: {
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primary,
  },
  // The design centers the icons on the greeting line (11 dp higher); the 48 dp targets are kept
  // inside the safe area instead, so they are centered on the text block.
  row: { flexDirection: 'row', alignItems: 'center' },
  texts: { flex: 1, paddingRight: spacing.sm },
  subtitle: { marginTop: spacing.xxs, lineHeight: 20 },
});
