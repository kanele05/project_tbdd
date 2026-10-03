import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { AppText } from './AppText';
import { ScreenHeader } from './ScreenHeader';

export type PlaceholderScreenProps = {
  /** Screen code from PLAN.md §7.1, e.g. "SC-04". */
  code: string;
  title: string;
  /** Hide the header (tab screens have no back button). */
  showHeader?: boolean;
  showBack?: boolean;
};

/**
 * Stand-in rendered by routes whose real screen is not implemented yet. The agent/member that
 * implements the screen replaces the body of the matching `features/<x>/screens/*Screen.tsx`.
 */
export function PlaceholderScreen({
  code,
  title,
  showHeader = true,
  showBack = true,
}: PlaceholderScreenProps) {
  return (
    <View style={styles.container} testID={`placeholder-${code}`}>
      {showHeader ? <ScreenHeader title={title} showBack={showBack} /> : null}
      <View style={styles.body}>
        <AppText variant="caption" color="primaryText" family="bodySemiBold">
          {code}
        </AppText>
        <AppText variant="h2" align="center">
          {title}
        </AppText>
        <AppText variant="body" color="textSecondary" align="center">
          This screen is not implemented yet.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
  },
});
