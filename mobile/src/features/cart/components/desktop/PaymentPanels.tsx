import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Switch, View } from 'react-native';

import { WorkPanel } from '@/components/layout/work';
import { AppText, Avatar } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { PaymentMethod } from '@/types/api';

import { PaymentMethodPicker } from '../PaymentMethodPicker';

/** "Billed to" card of the PC checkout: the signed-in user's name and e-mail. */
export function BillingPanel() {
  const { t } = useTranslation('cart');
  const user = useAuthStore((state) => state.user);
  return (
    <WorkPanel title={t('checkout.billedTo')} testID="billing-panel">
      <View style={styles.user}>
        <Avatar uri={user?.avatarUrl} name={user?.fullName} size={44} />
        <View style={styles.userText}>
          <AppText variant="label" numberOfLines={1}>
            {user?.fullName ?? ''}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {user?.email ?? ''}
          </AppText>
        </View>
      </View>
    </WorkPanel>
  );
}

export type PaymentPanelProps = {
  method: PaymentMethod;
  onChangeMethod: (method: PaymentMethod) => void;
  simulateFailure: boolean;
  onChangeSimulateFailure: (value: boolean) => void;
  isPaying: boolean;
};

/** Payment method card of the PC checkout: the radio group, the demo note and the dev-only switch. */
export function PaymentPanel({
  method,
  onChangeMethod,
  simulateFailure,
  onChangeSimulateFailure,
  isPaying,
}: PaymentPanelProps) {
  const { t } = useTranslation('cart');
  const { colors } = useTheme();
  const themed = useStyles();
  return (
    <WorkPanel title={t('checkout.paymentMethod')} testID="payment-panel">
      <PaymentMethodPicker value={method} onChange={onChangeMethod} disabled={isPaying} />
      <View style={themed.note} accessible accessibilityLabel={t('checkout.demoNote')}>
        <Feather name="info" size={18} color={colors.primaryText} />
        <AppText variant="caption" color="textSecondary" style={styles.noteText}>
          {t('checkout.demoNote')}
        </AppText>
      </View>
      {__DEV__ ? (
        <View style={styles.devRow}>
          <AppText variant="body" style={styles.noteText}>
            {t('checkout.simulateFailure')}
          </AppText>
          <Switch
            value={simulateFailure}
            onValueChange={onChangeSimulateFailure}
            disabled={isPaying}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.white}
            accessibilityLabel={t('checkout.simulateFailure')}
          />
        </View>
      ) : null}
    </WorkPanel>
  );
}

const useStyles = makeStyles((t) => ({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: t.colors.primarySoft,
  },
}));

const styles = StyleSheet.create({
  user: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  userText: { flex: 1, minWidth: 0 },
  noteText: { flex: 1 },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
