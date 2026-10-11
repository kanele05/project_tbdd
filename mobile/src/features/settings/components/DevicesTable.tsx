import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import {
  TableCard,
  TableCell,
  TableHeaderRow,
  TableRow,
  type TableColumn,
} from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { makeStyles, spacing, useTheme } from '@/theme';
import type { SessionDto } from '@/types/api';

import { getDeviceIcon, LAST_ACTIVE_FORMAT } from '../deviceFormat';

export type DevicesTableProps = {
  sessions: readonly SessionDto[];
  isBusy: boolean;
  onSignOut: (session: SessionDto) => void;
};

/** The signed-in devices as a table on a PC window: device, IP address, last active, log out. */
export function DevicesTable({ sessions, isBusy, onSignOut }: DevicesTableProps) {
  const { t } = useTranslation('settings');
  const { colors } = useTheme();
  const styles = useStyles();
  const deviceColumn: TableColumn = {
    key: 'device',
    label: t('security.devices.columns.device'),
    flex: 2,
  };
  const ipColumn: TableColumn = { key: 'ip', label: t('security.devices.columns.ip'), width: 140 };
  const lastColumn: TableColumn = {
    key: 'last',
    label: t('security.devices.columns.lastActive'),
    flex: 1.3,
  };
  const actionColumn: TableColumn = {
    key: 'action',
    label: t('security.devices.columns.action'),
    width: 110,
    align: 'right',
  };
  const columns = [deviceColumn, ipColumn, lastColumn, actionColumn];
  return (
    <TableCard testID="devices-table">
      <TableHeaderRow columns={columns} />
      {sessions.map((session, index) => (
        <TableRow
          key={session.id}
          isLast={index === sessions.length - 1}
          testID={`session-${session.id}`}
        >
          <TableCell column={deviceColumn}>
            <View style={styles.device}>
              <Feather
                name={getDeviceIcon(session.deviceName)}
                size={20}
                color={colors.textSecondary}
              />
              <AppText variant="cardTitle" numberOfLines={2} style={styles.deviceName}>
                {session.deviceName}
              </AppText>
              {session.isCurrent ? (
                <Badge label={t('security.devices.thisDevice')} shape="pill" tone="primary" />
              ) : null}
            </View>
          </TableCell>
          <TableCell column={ipColumn}>
            <AppText variant="body" color="textSecondary" numberOfLines={1}>
              {session.ipAddress ?? '-'}
            </AppText>
          </TableCell>
          <TableCell column={lastColumn}>
            <AppText variant="body" color="textSecondary">
              {formatDate(session.lastUsedAt, LAST_ACTIVE_FORMAT)}
            </AppText>
          </TableCell>
          <TableCell column={actionColumn}>
            {session.isCurrent ? null : (
              <Button
                title={t('security.devices.signOut')}
                accessibilityLabel={t('security.devices.signOutDevice', {
                  name: session.deviceName,
                })}
                variant="ghost"
                size="sm"
                disabled={isBusy}
                onPress={() => onSignOut(session)}
                testID={`session-signout-${session.id}`}
              />
            )}
          </TableCell>
        </TableRow>
      ))}
    </TableCard>
  );
}

const useStyles = makeStyles(() => ({
  device: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  deviceName: { flexShrink: 1 },
}));
