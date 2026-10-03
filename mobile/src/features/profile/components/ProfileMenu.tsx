import Feather from '@expo/vector-icons/Feather';
import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, type FeatherIconName } from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import { colors, layout, radius, shadows, spacing } from '@/theme';

type ProfileMenuProps = {
  onClose: () => void;
  onEditProfile: () => void;
  onNotifications: () => void;
  /** Called after the menu closed; the screen asks for confirmation. */
  onLogout: () => void;
};

type MenuItemProps = {
  icon: FeatherIconName;
  label: string;
  onPress: () => void;
  isDanger?: boolean;
};

function MenuItem({ icon, label, onPress, isDanger = false }: MenuItemProps) {
  const tint = isDanger ? colors.danger : colors.textPrimary;
  const textTint = isDanger ? colors.dangerText : colors.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
    >
      <Feather name={icon} size={20} color={tint} />
      <AppText variant="body" style={{ color: textTint }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * Overflow menu of the "⋮" button (SC-20): Edit profile, Notifications, Log out. Rendered as an
 * in-screen popover (not a native Modal) so a confirmation Alert can open right after it closes.
 */
export function ProfileMenu({
  onClose,
  onEditProfile,
  onNotifications,
  onLogout,
}: ProfileMenuProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close menu"
      />
      <View
        accessibilityRole="menu"
        style={[
          styles.panel,
          shadows.floating,
          { top: insets.top + layout.headerHeight - spacing.sm },
        ]}
      >
        <MenuItem icon="edit-2" label="Edit profile" onPress={onEditProfile} />
        <MenuItem icon="bell" label="Notifications" onPress={onNotifications} />
        <MenuItem icon="log-out" label={STRINGS.auth.logout} onPress={onLogout} isDanger />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill },
  backdrop: { ...StyleSheet.absoluteFill },
  panel: {
    position: 'absolute',
    right: layout.screenPaddingX,
    minWidth: 200,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.background,
  },
  item: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: { backgroundColor: colors.backgroundAlt },
});
