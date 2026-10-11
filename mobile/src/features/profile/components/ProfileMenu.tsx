import Feather from '@expo/vector-icons/Feather';
import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, type FeatherIconName } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, shadows, spacing, useTheme } from '@/theme';

type ProfileMenuProps = {
  onClose: () => void;
  onEditProfile: () => void;
  onNotifications: () => void;
  onSettings: () => void;
  /** Teacher shortcuts (PLAN SC-30): only passed for TEACHER accounts. */
  onTeacherProfile?: () => void;
  onTeaching?: () => void;
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
  const { colors } = useTheme();
  const styles = useStyles();
  const tint = isDanger ? colors.danger : colors.text;
  const textTint = isDanger ? colors.dangerText : colors.text;
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
 * Overflow menu of the "⋮" button (SC-20): Edit profile, (teachers: Teacher profile, Teaching), Notifications, Settings, Log out. Rendered as an
 * in-screen popover (not a native Modal) so a confirmation Alert can open right after it closes.
 */
export function ProfileMenu({
  onClose,
  onEditProfile,
  onNotifications,
  onSettings,
  onTeacherProfile,
  onTeaching,
  onLogout,
}: ProfileMenuProps) {
  const { t } = useTranslation(['profile', 'auth']);
  const insets = useSafeAreaInsets();
  const styles = useStyles();

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
        accessibilityLabel={t('menu.close')}
      />
      <View
        accessibilityRole="menu"
        style={[
          styles.panel,
          shadows.floating,
          { top: insets.top + layout.headerHeight - spacing.sm },
        ]}
      >
        <MenuItem icon="edit-2" label={t('menu.editProfile')} onPress={onEditProfile} />
        {onTeacherProfile ? (
          <MenuItem icon="user" label={t('menu.teacherProfile')} onPress={onTeacherProfile} />
        ) : null}
        {onTeaching ? (
          <MenuItem icon="briefcase" label={t('menu.teaching')} onPress={onTeaching} />
        ) : null}
        <MenuItem icon="bell" label={t('menu.notifications')} onPress={onNotifications} />
        <MenuItem icon="settings" label={t('menu.settings')} onPress={onSettings} />
        <MenuItem icon="log-out" label={t('auth:logout')} onPress={onLogout} isDanger />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  overlay: { ...StyleSheet.absoluteFill },
  backdrop: { ...StyleSheet.absoluteFill },
  panel: {
    position: 'absolute',
    right: layout.screenPaddingX,
    minWidth: 200,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: radius.card,
    backgroundColor: t.colors.card,
  },
  item: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
}));
