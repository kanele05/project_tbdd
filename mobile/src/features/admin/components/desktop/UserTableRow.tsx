import { memo } from 'react';
import { View } from 'react-native';

import { TableCell, TableRow, type TableColumn } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';
import type { AdminUserDto, Role } from '@/types/api';
import { formatRelativeTimeInline } from '@/utils/formatRelativeTime';

const ROLE_TONE: Record<Role, BadgeTone> = {
  STUDENT: 'primary',
  TEACHER: 'secondary',
  ADMIN: 'gold',
};

/** Columns of the users table; `joined` is dropped on tablets. */
export type UserColumns = {
  user: TableColumn;
  role: TableColumn;
  usage: TableColumn;
  joined?: TableColumn;
  status: TableColumn;
  actions: TableColumn;
};

export type UserTableRowProps = {
  user: AdminUserDto;
  columns: UserColumns;
  isLast: boolean;
  /** The enable request of this user is in flight. */
  isBusy: boolean;
  /** Keep these callbacks stable (`useCallback`) so `React.memo` can skip re-renders. */
  onDisable: (user: AdminUserDto) => void;
  onEnable: (user: AdminUserDto) => void;
};

const AVATAR_SIZE = 40;

/** One account as a table row (SC-34, PC): identity, role, usage, join date, status and the lock action. */
function UserTableRowBase({
  user,
  columns,
  isLast,
  isBusy,
  onDisable,
  onEnable,
}: UserTableRowProps) {
  const { t } = useTranslation('admin');
  const styles = useStyles();
  const isDisabled = user.disabledAt !== null;
  const usage =
    user.role === 'TEACHER'
      ? t('users.courseCount', { count: user.courseCount })
      : t('users.enrollmentCount', { count: user.enrollmentCount });
  const joined = t('users.joined', { when: formatRelativeTimeInline(user.createdAt) });
  return (
    <TableRow isLast={isLast} testID={`user-row-${user.id}`}>
      <TableCell column={columns.user}>
        <View style={styles.identity}>
          <Avatar uri={user.avatarUrl} name={user.fullName} size={AVATAR_SIZE} />
          <View style={styles.texts}>
            <AppText variant="cardTitle" numberOfLines={2}>
              {user.fullName}
            </AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={2}>
              {user.email}
            </AppText>
            {isDisabled && user.disabledReason ? (
              <AppText variant="caption" color="dangerText">
                {t('users.disabledReason', { reason: user.disabledReason })}
              </AppText>
            ) : null}
          </View>
        </View>
      </TableCell>
      <TableCell column={columns.role}>
        <Badge label={t(`roles.${user.role}`)} tone={ROLE_TONE[user.role]} shape="pill" />
      </TableCell>
      <TableCell column={columns.usage}>
        <AppText variant="caption">{usage}</AppText>
        {columns.joined ? null : <AppText variant="caption">{joined}</AppText>}
      </TableCell>
      {columns.joined ? (
        <TableCell column={columns.joined}>
          <AppText variant="caption">{joined}</AppText>
        </TableCell>
      ) : null}
      <TableCell column={columns.status}>
        <View style={styles.badges}>
          {isDisabled ? (
            <Badge label={t('users.disabledBadge')} tone="danger" shape="pill" />
          ) : (
            <Badge label={t('users.status.active')} tone="success" shape="pill" />
          )}
          {user.emailVerified ? null : (
            <Badge label={t('users.unverified')} tone="secondary" shape="pill" />
          )}
        </View>
      </TableCell>
      <TableCell column={columns.actions}>
        {user.role === 'ADMIN' ? null : isDisabled ? (
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
      </TableCell>
    </TableRow>
  );
}

export const UserTableRow = memo(UserTableRowBase);

const useStyles = makeStyles(() => ({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, minWidth: 0, gap: spacing.xxs },
  badges: { gap: spacing.xs, alignItems: 'flex-start' },
}));
