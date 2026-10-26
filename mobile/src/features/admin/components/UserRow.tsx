import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing } from '@/theme';
import type { AdminUserDto, Role } from '@/types/api';
import { formatRelativeTimeInline } from '@/utils/formatRelativeTime';

const ROLE_TONE: Record<Role, BadgeTone> = {
  STUDENT: 'primary',
  TEACHER: 'secondary',
  ADMIN: 'gold',
};

export type UserRowProps = {
  user: AdminUserDto;
  /** The enable request of this user is in flight. */
  isBusy: boolean;
  onDisable: (user: AdminUserDto) => void;
  onEnable: (user: AdminUserDto) => void;
};

/** One account of SC-34: avatar, name, e-mail, role + disabled badges, usage and the disable / enable action. */
function UserRowBase({ user, isBusy, onDisable, onEnable }: UserRowProps) {
  const { t } = useTranslation('admin');
  const styles = useStyles();
  const isDisabled = user.disabledAt !== null;
  const isAdmin = user.role === 'ADMIN';
  const usage =
    user.role === 'TEACHER'
      ? t('users.courseCount', { count: user.courseCount })
      : t('users.enrollmentCount', { count: user.enrollmentCount });

  return (
    <View style={styles.row} testID={`user-row-${user.id}`}>
      <View style={styles.head}>
        <Avatar uri={user.avatarUrl} name={user.fullName} size={44} />
        <View style={styles.identity}>
          <AppText variant="cardTitle" numberOfLines={1}>
            {user.fullName}
          </AppText>
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {user.email}
          </AppText>
        </View>
      </View>
      <View style={styles.badges}>
        <Badge label={t(`roles.${user.role}`)} tone={ROLE_TONE[user.role]} shape="pill" />
        {isDisabled ? <Badge label={t('users.disabledBadge')} tone="danger" shape="pill" /> : null}
        {!user.emailVerified ? (
          <Badge label={t('users.unverified')} tone="secondary" shape="pill" />
        ) : null}
      </View>
      <AppText variant="caption" color="textSecondary">
        {usage} · {t('users.joined', { when: formatRelativeTimeInline(user.createdAt) })}
      </AppText>
      {isDisabled && user.disabledReason ? (
        <AppText variant="caption" color="dangerText">
          {t('users.disabledReason', { reason: user.disabledReason })}
        </AppText>
      ) : null}
      {isAdmin ? null : (
        <View style={styles.actions}>
          {isDisabled ? (
            <Button
              title={t('users.enable')}
              accessibilityLabel={t('users.enableLabel', { name: user.fullName })}
              variant="outline"
              size="sm"
              leftIcon="unlock"
              loading={isBusy}
              onPress={() => onEnable(user)}
              testID={`enable-${user.id}`}
            />
          ) : (
            <Button
              title={t('users.disable')}
              accessibilityLabel={t('users.disableLabel', { name: user.fullName })}
              variant="secondary"
              size="sm"
              leftIcon="lock"
              onPress={() => onDisable(user)}
              testID={`disable-${user.id}`}
            />
          )}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    gap: spacing.sm,
    padding: spacing.lg,
    marginHorizontal: layout.screenPaddingX,
    marginBottom: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identity: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.xs },
}));

export const UserRow = memo(UserRowBase);
