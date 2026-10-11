import Feather from '@expo/vector-icons/Feather';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import type { FeatherIconName } from '@/components/ui/icons';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, shadows, spacing, useTheme } from '@/theme';

import type { NavTone } from './navTone';
import { useHover } from './useHover';

const AVATAR_SIZE = 34;
const MENU_WIDTH = 232;

export type NavAccountMenuProps = {
  fullName: string;
  avatarUrl: string | null;
  tone: NavTone;
  isOpen: boolean;
  onToggle: () => void;
  onPressProfile: () => void;
  onPressSettings: () => void;
  onPressLogout: () => void;
};

type MenuItemProps = {
  icon: FeatherIconName;
  label: string;
  onPress: () => void;
  testID: string;
  isDestructive?: boolean;
};

function MenuItem({ icon, label, onPress, testID, isDestructive = false }: MenuItemProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  const color = isDestructive ? colors.dangerText : colors.text;
  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [
        styles.item,
        isHovered ? styles.itemHover : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Feather name={icon} size={18} color={color} />
      <AppText variant="body" style={{ color }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * Avatar button of the top bar that opens a dropdown: Profile, Settings, Log out (last). Open state
 * is owned by the bar (it closes the menu on outside click, Escape and route change).
 */
export function NavAccountMenu({
  fullName,
  avatarUrl,
  tone,
  isOpen,
  onToggle,
  onPressProfile,
  onPressSettings,
  onPressLogout,
}: NavAccountMenuProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  return (
    <View style={styles.anchor}>
      <Pressable
        {...hoverProps}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={t('nav.accountMenuOf', { name: fullName })}
        accessibilityState={{ expanded: isOpen }}
        testID="nav-account-button"
        style={({ pressed }) => [
          styles.avatarButton,
          isHovered || isOpen ? { backgroundColor: tone.hoverBackground } : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <Avatar uri={avatarUrl} name={fullName} size={AVATAR_SIZE} />
        <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={tone.color} />
      </Pressable>
      {isOpen ? (
        <View style={styles.menu} accessibilityRole="menu" testID="nav-account-menu">
          <View style={styles.header}>
            <AppText variant="label" numberOfLines={1}>
              {fullName}
            </AppText>
          </View>
          <MenuItem
            icon="user"
            label={t('nav.profile')}
            onPress={onPressProfile}
            testID="nav-menu-profile"
          />
          <MenuItem
            icon="settings"
            label={t('nav.settings')}
            onPress={onPressSettings}
            testID="nav-menu-settings"
          />
          <MenuItem
            icon="log-out"
            label={t('nav.logout')}
            onPress={onPressLogout}
            testID="nav-menu-logout"
            isDestructive
          />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  anchor: { position: 'relative' },
  avatarButton: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.xs + 2,
    paddingRight: spacing.sm,
    borderRadius: radius.pill,
    cursor: 'pointer',
  },
  pressed: { opacity: 0.7 },
  menu: {
    position: 'absolute',
    top: 52,
    right: 0,
    width: MENU_WIDTH,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
    ...shadows.floating,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  item: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    cursor: 'pointer',
  },
  itemHover: { backgroundColor: t.colors.surface },
}));
