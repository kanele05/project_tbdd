import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { getAuthErrorMessage } from '@/features/auth/authErrors';
import { useTranslation } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { SessionDto } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { useRevokeOtherSessions, useRevokeSession, useSessions } from '../hooks';
import { SecurityCard } from './SecurityCard';

const LAST_ACTIVE_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/** Browser names / OSes the server reports for web sessions ("Chrome on Windows"). */
const DESKTOP_PATTERN = /windows|macos|linux|chrome|edge|firefox|safari|opera|browser/i;

type SessionRowProps = {
  session: SessionDto;
  isBusy: boolean;
  onSignOut: (session: SessionDto) => void;
};

const SessionRow = memo(function SessionRow({ session, isBusy, onSignOut }: SessionRowProps) {
  const { t } = useTranslation('settings');
  const { colors } = useTheme();
  const styles = useStyles();
  const lastActive = t('security.devices.lastActive', {
    date: formatDate(session.lastUsedAt, LAST_ACTIVE_FORMAT),
  });
  const details = [session.ipAddress, lastActive].filter(Boolean).join(' · ');
  const icon = DESKTOP_PATTERN.test(session.deviceName) ? 'monitor' : 'smartphone';
  return (
    <View style={styles.row} testID={`session-${session.id}`}>
      <Feather name={icon} size={22} color={colors.textSecondary} />
      <View style={styles.rowText}>
        <View style={styles.rowTitle}>
          <AppText variant="cardTitle" numberOfLines={2} style={styles.deviceName}>
            {session.deviceName}
          </AppText>
          {session.isCurrent ? (
            <Badge label={t('security.devices.thisDevice')} shape="pill" tone="primary" />
          ) : null}
        </View>
        <AppText variant="caption">{details}</AppText>
      </View>
      {session.isCurrent ? null : (
        <Button
          title={t('security.devices.signOut')}
          accessibilityLabel={t('security.devices.signOutDevice', { name: session.deviceName })}
          variant="ghost"
          size="sm"
          disabled={isBusy}
          onPress={() => onSignOut(session)}
          testID={`session-signout-${session.id}`}
        />
      )}
    </View>
  );
});

/** "Devices": every signed-in session, with remote sign-out of one or all of the others. */
export function DevicesCard() {
  const { t } = useTranslation(['settings', 'common']);
  const toast = useToast();
  const styles = useStyles();
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const isBusy = revoke.isPending || revokeOthers.isPending;
  const hasOthers = (sessions.data ?? []).some((session) => !session.isCurrent);

  const signOutDevice = async (session: SessionDto) => {
    const isConfirmed = await confirmAction({
      title: t('settings:security.devices.confirmTitle'),
      message: t('settings:security.devices.confirmMessage', { name: session.deviceName }),
      confirmLabel: t('settings:security.devices.signOut'),
      cancelLabel: t('common:actions.cancel'),
      isDestructive: true,
    });
    if (!isConfirmed) return;
    try {
      await revoke.mutateAsync(session.id);
      toast.success(t('settings:security.devices.revoked'));
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    }
  };

  const signOutOthers = async () => {
    const isConfirmed = await confirmAction({
      title: t('settings:security.devices.confirmOthersTitle'),
      message: t('settings:security.devices.confirmOthersMessage'),
      confirmLabel: t('settings:security.devices.signOutOthers'),
      cancelLabel: t('common:actions.cancel'),
      isDestructive: true,
    });
    if (!isConfirmed) return;
    try {
      const { revokedCount } = await revokeOthers.mutateAsync();
      toast.success(t('settings:security.devices.revokedOthers', { count: revokedCount }));
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    }
  };

  return (
    <SecurityCard
      icon="smartphone"
      title={t('settings:security.devices.title')}
      description={t('settings:security.devices.description')}
      testID="devices-card"
    >
      {sessions.isPending ? (
        <View style={styles.list} accessibilityLabel={t('common:loading')}>
          <Skeleton width="100%" height={56} borderRadius={radius.button} />
          <Skeleton width="100%" height={56} borderRadius={radius.button} />
        </View>
      ) : sessions.isError ? (
        <View style={styles.error} accessibilityRole="alert">
          <AppText variant="body" color="dangerText">
            {t('settings:security.devices.loadFailed')}
          </AppText>
          <Button
            title={t('common:actions.retry')}
            variant="outline"
            size="sm"
            onPress={() => void sessions.refetch()}
            testID="devices-retry"
          />
        </View>
      ) : (
        <View style={styles.list}>
          {sessions.data.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              isBusy={isBusy}
              onSignOut={(target) => void signOutDevice(target)}
            />
          ))}
          {hasOthers ? (
            <Button
              title={t('settings:security.devices.signOutOthers')}
              variant="secondary"
              leftIcon="log-out"
              loading={revokeOthers.isPending}
              disabled={isBusy}
              onPress={() => void signOutOthers()}
              testID="devices-signout-others"
            />
          ) : (
            <AppText variant="caption">{t('settings:security.devices.noOthers')}</AppText>
          )}
        </View>
      )}
    </SecurityCard>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    backgroundColor: t.colors.surfaceAlt,
  },
  rowText: { flex: 1, gap: spacing.xxs },
  rowTitle: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  deviceName: { flexShrink: 1 },
  error: { gap: spacing.md, alignItems: 'flex-start' },
}));
