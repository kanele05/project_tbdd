import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing } from '@/theme';

import { MY_COURSES_STRINGS } from '../strings';

export type CareerBannerProps = {
  onPress: () => void;
};

/** Purple promo banner of SC-14: "Courses that boost your career!" + "Check Now" (-> Search). */
export function CareerBanner({ onPress }: CareerBannerProps) {
  return (
    <View style={styles.banner}>
      <View style={styles.texts}>
        <AppText variant="h3" color="primary" accessibilityRole="header">
          {MY_COURSES_STRINGS.bannerTitle}
        </AppText>
        <Button title={MY_COURSES_STRINGS.bannerAction} size="sm" onPress={onPress} />
      </View>
      <View style={styles.art} importantForAccessibility="no-hide-descendants">
        <Feather name="trending-up" size={72} color={colors.secondaryLight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.card,
    backgroundColor: colors.secondary,
  },
  texts: { flex: 1, gap: spacing.lg, alignItems: 'flex-start' },
  art: { width: 88, alignItems: 'center', justifyContent: 'center' },
});
