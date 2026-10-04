import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** Settings and its sub-screens (Security, two-step verification setup) share one stack. */
export default function SettingsLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}
