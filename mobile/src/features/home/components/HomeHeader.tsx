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
          <AppText variant="h2" color="white" numberOfLines={1} accessibilityRole="header">
            {greeting}
          </AppText>
          <AppText variant="caption" color="white">
            {HOME_SUBTITLE}
          </AppText>
        </View>
        <IconButton
          icon="shopping-cart"
          color="white"
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
          color="white"
          badgeCount={unreadCount}
          onPress={onPressNotifications}
          accessibilityLabel={countLabel('Open notifications', unreadCount, 'unread')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingLeft: spacing.xl,
    paddingRight: spacing.xs,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primary,
  },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center' },
  texts: { flex: 1, paddingRight: spacing.sm },
});
