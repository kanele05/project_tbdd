import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { FeatherIconName } from '@/components/ui/icons';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

type FormNoticeProps = {
  message: string | null;
  /** `success` = green check (done), `info` = accent icon (hint). */
  tone?: 'success' | 'info';
  icon?: FeatherIconName;
  testID?: string;
};

/** Positive / neutral counterpart of `FormError`: "Code sent", "Password updated", "2 attempts left"... */
export function FormNotice({
  message,
  tone = 'info',
  icon,
  testID = 'form-notice',
}: FormNoticeProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  if (!message) return null;
  const iconName: FeatherIconName = icon ?? (tone === 'success' ? 'check-circle' : 'info');
  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <Feather
        name={iconName}
        size={18}
        color={tone === 'success' ? colors.success : colors.primaryText}
      />
      <AppText variant="body" style={styles.text}>
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
    backgroundColor: t.colors.primarySoft,
  },
  text: { flex: 1 },
}));
