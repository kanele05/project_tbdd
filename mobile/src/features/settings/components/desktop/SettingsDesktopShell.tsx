import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useHover } from '@/components/layout/useHover';
import { pointerStyle, WorkHeader, WorkShell } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import type { FeatherIconName } from '@/components/ui/icons';
import { useConfirmLogout } from '@/features/auth/useConfirmLogout';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

export type SettingsSectionKey = 'appearance' | 'language' | 'security' | 'about';

/** Width of the content column of the Settings pages: a form never stretches past a readable line. */
export const SETTINGS_MAX_WIDTH = 1120;
const MENU_WIDTH = 248;

const MENU: readonly { key: SettingsSectionKey; icon: FeatherIconName }[] = [
  { key: 'appearance', icon: 'sun' },
  { key: 'language', icon: 'globe' },
  { key: 'security', icon: 'shield' },
  { key: 'about', icon: 'info' },
];

type MenuItemProps = {
  icon: FeatherIconName;
  label: string;
  isActive?: boolean;
  isDanger?: boolean;
  onPress: () => void;
  testID: string;
};

function MenuItem({
  icon,
  label,
  isActive = false,
  isDanger = false,
  onPress,
  testID,
}: MenuItemProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  const iconColor = isDanger
    ? colors.dangerText
    : isActive
      ? colors.primaryText
      : colors.textSecondary;
  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      style={[styles.item, isActive ? styles.itemActive : isHovered ? styles.itemHover : null]}
      testID={testID}
    >
      <Feather name={icon} size={20} color={iconColor} />
      <AppText
        variant="body"
        family={isActive ? 'bodySemiBold' : 'bodyMedium'}
        color={isDanger ? 'dangerText' : isActive ? 'text' : 'textSecondary'}
        style={styles.itemLabel}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export type SettingsDesktopShellProps = {
  /** The menu entry that is highlighted. */
  active: SettingsSectionKey;
  title: string;
  subtitle?: string;
  /** Sub-page of a section (two-step setup): shows the "Back" link. */
  hasBack?: boolean;
  children: ReactNode;
};

/**
 * Account-settings frame on a PC window (PLAN §2.5, like Netflix "Account"): a title row, a vertical
 * section menu on the left (the menu becomes a wrapping row on a tablet) and the content of the
 * chosen section on the right. Sections of the index page are `/settings?section=`, Security is its
 * own route; "Log out" sits at the end of the menu.
 */
export function SettingsDesktopShell({
  active,
  title,
  subtitle,
  hasBack = false,
  children,
}: SettingsDesktopShellProps) {
  const { t } = useTranslation(['settings', 'auth']);
  const { isDesktop } = useBreakpoint();
  const styles = useStyles();
  const user = useAuthStore((state) => state.user);
  const confirmLogout = useConfirmLogout();

  const labels: Record<SettingsSectionKey, string> = {
    appearance: t('settings:appearance.title'),
    language: t('settings:language.title'),
    security: t('settings:security.row'),
    about: t('settings:about.title'),
  };

  const select = (key: SettingsSectionKey) => {
    if (key === active && !hasBack) return;
    if (key === 'security') router.replace('/settings/security');
    else router.replace({ pathname: '/settings', params: { section: key } });
  };

  return (
    <WorkShell maxWidth={SETTINGS_MAX_WIDTH} testID="settings-desktop">
      <WorkHeader title={title} subtitle={subtitle} hasBack={hasBack} />
      <View style={isDesktop ? styles.row : styles.stack}>
        <View
          style={[styles.menu, isDesktop ? styles.menuColumn : styles.menuRow]}
          accessibilityLabel={t('settings:desktop.menuLabel')}
          testID="settings-menu"
        >
          {user && isDesktop ? (
            <View
              style={styles.account}
              accessible
              accessibilityLabel={`${t('settings:account.signedInAs')}: ${user.email}`}
            >
              <AppText variant="caption">{t('settings:account.signedInAs')}</AppText>
              <AppText variant="body" numberOfLines={1} ellipsizeMode="middle">
                {user.email}
              </AppText>
            </View>
          ) : null}
          {MENU.map((item) => (
            <MenuItem
              key={item.key}
              icon={item.icon}
              label={labels[item.key]}
              isActive={item.key === active}
              onPress={() => select(item.key)}
              testID={`settings-menu-${item.key}`}
            />
          ))}
          <MenuItem
            icon="log-out"
            label={t('auth:logout')}
            isDanger
            onPress={() => void confirmLogout()}
            testID="settings-logout"
          />
        </View>
        <View style={styles.content}>{children}</View>
      </View>
    </WorkShell>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xxl },
  stack: { gap: spacing.xl },
  menu: { gap: spacing.xs },
  menuColumn: { width: MENU_WIDTH, flexShrink: 0 },
  menuRow: { flexDirection: 'row', flexWrap: 'wrap' },
  account: { gap: spacing.xxs, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  item: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
    ...pointerStyle,
  },
  itemActive: { backgroundColor: t.colors.primarySoft },
  itemHover: { backgroundColor: t.colors.surface },
  itemLabel: { flexShrink: 1 },
  content: { flex: 1, minWidth: 0, gap: spacing.xl },
}));
