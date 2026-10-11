import Feather from '@expo/vector-icons/Feather';
import { Pressable, View } from 'react-native';

import { useHover } from '@/components/layout/useHover';
import { pointerStyle } from '@/components/layout/work';
import { AppText, type FeatherIconName } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

export type AccountCardProps = {
  onEditProfile: () => void;
  onNotifications: () => void;
  onSettings: () => void;
  /** Teacher shortcuts (PLAN SC-30): only passed for TEACHER accounts. */
  onTeacherProfile?: () => void;
  onTeaching?: () => void;
  /** Admin shortcut: only passed for ADMIN accounts. */
  onAdmin?: () => void;
  /** Called on click; the screen asks for confirmation. */
  onLogout: () => void;
};

type AccountLinkProps = {
  icon: FeatherIconName;
  label: string;
  onPress: () => void;
  testID: string;
  isDanger?: boolean;
};

function AccountLink({ icon, label, onPress, testID, isDanger = false }: AccountLinkProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  const color = isDanger ? colors.dangerText : colors.text;
  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={[styles.link, isHovered ? styles.linkHover : null]}
      testID={testID}
    >
      <Feather name={icon} size={20} color={color} />
      <AppText variant="body" style={[styles.linkLabel, { color }]}>
        {label}
      </AppText>
      {isDanger ? null : <Feather name="chevron-right" size={18} color={colors.textMuted} />}
    </Pressable>
  );
}

/**
 * Account card of the PC profile (right column): Edit profile, the teacher / admin shortcuts of the
 * role, Notifications, Settings and Log out (last, red). Same actions as the phone "⋮" menu.
 */
export function AccountCard({
  onEditProfile,
  onNotifications,
  onSettings,
  onTeacherProfile,
  onTeaching,
  onAdmin,
  onLogout,
}: AccountCardProps) {
  const { t } = useTranslation(['profile', 'auth']);
  const styles = useStyles();
  return (
    <View style={styles.card} testID="profile-account-card">
      <AppText variant="h3" accessibilityRole="header" style={styles.title}>
        {t('profile:account.title')}
      </AppText>
      <AccountLink
        icon="edit-2"
        label={t('profile:menu.editProfile')}
        onPress={onEditProfile}
        testID="profile-link-edit"
      />
      {onTeacherProfile ? (
        <AccountLink
          icon="user"
          label={t('profile:menu.teacherProfile')}
          onPress={onTeacherProfile}
          testID="profile-link-teacher-profile"
        />
      ) : null}
      {onTeaching ? (
        <AccountLink
          icon="briefcase"
          label={t('profile:menu.teaching')}
          onPress={onTeaching}
          testID="profile-link-teaching"
        />
      ) : null}
      {onAdmin ? (
        <AccountLink
          icon="shield"
          label={t('profile:menu.admin')}
          onPress={onAdmin}
          testID="profile-link-admin"
        />
      ) : null}
      <AccountLink
        icon="bell"
        label={t('profile:menu.notifications')}
        onPress={onNotifications}
        testID="profile-link-notifications"
      />
      <AccountLink
        icon="settings"
        label={t('profile:menu.settings')}
        onPress={onSettings}
        testID="profile-link-settings"
      />
      <View style={styles.divider} />
      <AccountLink
        icon="log-out"
        label={t('auth:logout')}
        onPress={onLogout}
        testID="profile-link-logout"
        isDanger
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  title: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  link: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    ...pointerStyle,
  },
  linkHover: { backgroundColor: t.colors.surface },
  linkLabel: { flex: 1 },
  divider: { height: 1, marginVertical: spacing.xs, backgroundColor: t.colors.border },
}));
