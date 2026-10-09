import { KeyboardAvoidingView, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CinematicHeader } from '@/components/ui/CinematicHeader';
import { ErrorState } from '@/components/ui/ErrorState';
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
  const insets = useSafeAreaInsets();
  const overview = useSecurityOverview();

  return (
    // Padding on both platforms like every other form: the password fields sit mid-screen.
    <KeyboardAvoidingView style={styles.screen} behavior="padding" testID="security-screen">
      <CinematicHeader title={t('security.title')} posterIndex={4} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="security-scroll"
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
    </KeyboardAvoidingView>
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
