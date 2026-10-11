import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { SessionDto } from '@/types/api';

import { getDeviceIcon, LAST_ACTIVE_FORMAT } from '../deviceFormat';
import { useSessions } from '../hooks';
import { useDeviceActions } from '../useDeviceActions';
import { DevicesTable } from './DevicesTable';
import { SecurityCard } from './SecurityCard';

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
  const icon = getDeviceIcon(session.deviceName);
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
  const { isDesktop } = useBreakpoint();
  const styles = useStyles();
  const sessions = useSessions();
  const { signOutDevice, signOutOthers, isBusy, isRevokingOthers } = useDeviceActions();
  const hasOthers = (sessions.data ?? []).some((session) => !session.isCurrent);

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
          {isDesktop ? (
            <DevicesTable
              sessions={sessions.data}
              isBusy={isBusy}
              onSignOut={(target) => void signOutDevice(target)}
            />
          ) : (
            sessions.data.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                isBusy={isBusy}
                onSignOut={(target) => void signOutDevice(target)}
              />
            ))
          )}
          {hasOthers ? (
            <Button
              title={t('settings:security.devices.signOutOthers')}
              variant="secondary"
              leftIcon="log-out"
              loading={isRevokingOthers}
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
