import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

/** Form-level server error (wrong password, network failure...) shown above the submit button. */
export function FormError({ message }: { message: string | null }) {
  const { colors } = useTheme();
  const styles = useStyles();
  if (!message) return null;
  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      testID="form-error"
    >
      <Feather name="alert-circle" size={18} color={colors.danger} />
      <AppText variant="body" color="dangerText" style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.button,
    backgroundColor: t.colors.dangerSoft,
  },
  text: { flex: 1 },
}));
