import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme';

/** Form-level server error (wrong password, network failure...) shown above the submit button. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      testID="form-error"
    >
      <Feather name="alert-circle" size={18} color={colors.danger} />
      <AppText variant="body" color="danger" style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.button,
    backgroundColor: colors.dangerLight,
  },
  text: { flex: 1 },
});
