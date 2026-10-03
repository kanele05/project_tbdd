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
        <AppText
          variant="title"
          family="headingBold"
          color="white"
          style={styles.title}
          accessibilityRole="header"
        >
          {MY_COURSES_STRINGS.bannerTitle}
        </AppText>
        <Button
          title={MY_COURSES_STRINGS.bannerAction}
          size="sm"
          onPress={onPress}
          style={styles.button}
        />
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
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.badge,
    backgroundColor: colors.secondary,
  },
  // Design: text block pinned to the top-left (title 16 px / 27 dp line pitch, 12 dp, button).
  texts: { flex: 1, gap: spacing.md, alignItems: 'flex-start' },
  title: { lineHeight: 27 },
  button: { paddingHorizontal: spacing.sm },
  art: { width: 88, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
});
