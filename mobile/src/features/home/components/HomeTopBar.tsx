import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Badge, GlassIconButton, IconButton, type FeatherIconName } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { spacing, useTheme, withAlpha } from '@/theme';

type HomeTopBarProps = {
  greeting: string;
  subtitle: string;
  cartCount: number;
  unreadCount: number;
  /** On the hero photo: white text + frosted buttons. Otherwise: theme text + plain icon buttons. */
  isOnPhoto: boolean;
  onPressCart: () => void;
  onPressNotifications: () => void;
};

type BarButtonProps = {
  icon: FeatherIconName;
  label: string;
  count: number;
  isOnPhoto: boolean;
  onPress: () => void;
};

function BarButton({ icon, label, count, isOnPhoto, onPress }: BarButtonProps) {
  if (!isOnPhoto) {
    return (
      <IconButton
        icon={icon}
        accessibilityLabel={label}
        badgeCount={count}
        onPress={onPress}
        filled
      />
    );
  }
  return (
    <View>
      <GlassIconButton icon={icon} accessibilityLabel={label} onPress={onPress} />
      {count > 0 ? (
        <View style={styles.badge} pointerEvents="none" importantForAccessibility="no">
          <Badge count={count} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Top row of Home (SC-04): greeting + subtitle on the left, cart and bell (with count badges) on
 * the right. It floats over the hero photo, so the texts get a faint shadow for legibility.
 */
function HomeTopBarBase({
  greeting,
  subtitle,
  cartCount,
  unreadCount,
  isOnPhoto,
  onPressCart,
  onPressNotifications,
}: HomeTopBarProps) {
  const { t } = useTranslation('home');
  const { colors } = useTheme();
  const shadow = isOnPhoto ? styles.photoShadow : null;
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <AppText
          variant="h3"
          color={isOnPhoto ? 'white' : 'text'}
          numberOfLines={1}
          accessibilityRole="header"
          style={shadow}
        >
          {greeting}
        </AppText>
        <AppText
          variant="caption"
          numberOfLines={2}
          style={[shadow, isOnPhoto ? { color: withAlpha(colors.white, 0.88) } : null]}
        >
          {subtitle}
        </AppText>
      </View>
      <BarButton
        icon="shopping-cart"
        label={cartCount > 0 ? t('cart.openCount', { count: cartCount }) : t('cart.open')}
        count={cartCount}
        isOnPhoto={isOnPhoto}
        onPress={onPressCart}
      />
      <BarButton
        icon="bell"
        label={
          unreadCount > 0
            ? t('notifications.openCount', { unread: unreadCount })
            : t('notifications.open')
        }
        count={unreadCount}
        isOnPhoto={isOnPhoto}
        onPress={onPressNotifications}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  texts: { flex: 1, paddingRight: spacing.xs },
  badge: { position: 'absolute', top: 0, right: 0 },
  photoShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});

export const HomeTopBar = memo(HomeTopBarBase);
