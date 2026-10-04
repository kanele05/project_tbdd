import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

export type CareerBannerProps = {
  onPress: () => void;
};

/** Violet promo block at the end of My Courses: "Courses that boost your career!" + "Check Now" (-> Search). */
export function CareerBanner({ onPress }: CareerBannerProps) {
  const { t } = useTranslation('myCourses');
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.banner}>
      <View style={styles.texts}>
        <AppText variant="h3" color="onSecondary" accessibilityRole="header">
          {t('bannerTitle')}
        </AppText>
        <Button title={t('bannerAction')} variant="secondary" size="sm" onPress={onPress} />
      </View>
      <View style={styles.art} importantForAccessibility="no-hide-descendants">
        <Feather name="trending-up" size={64} color={colors.secondarySoft} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: t.colors.secondary,
  },
  texts: { flex: 1, gap: spacing.md, alignItems: 'flex-start' },
  art: { width: 72, alignItems: 'center', justifyContent: 'center' },
}));
