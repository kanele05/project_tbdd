import { ScrollView, View } from 'react-native';

import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing } from '@/theme';

import { ChangePasswordCard } from '../components/ChangePasswordCard';
import { DevicesCard } from '../components/DevicesCard';
import { TwoFactorCard } from '../components/TwoFactorCard';
import { useSecurityOverview } from '../hooks';

/**
 * AUTH-09 Settings -> Security: two-step verification (on / off, recovery codes), change password
 * and the list of signed-in devices with remote sign-out.
 */
export function SecurityScreen() {
  const { t } = useTranslation('settings');
  const styles = useStyles();
  const overview = useSecurityOverview();

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('security.title')} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {overview.isPending ? (
          <Skeleton width="100%" height={168} borderRadius={radius.card} />
        ) : overview.isError ? (
          <ErrorState
            error={overview.error}
            title={t('security.loadFailed')}
            onRetry={() => void overview.refetch()}
          />
        ) : (
          <TwoFactorCard overview={overview.data} />
        )}
        <ChangePasswordCard />
        <DevicesCard />
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: {
    gap: spacing.xl,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
}));
