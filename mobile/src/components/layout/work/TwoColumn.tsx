import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { makeStyles, spacing } from '@/theme';

import { DESKTOP_NAV_HEIGHT } from '../desktopLayout';
import { stickyTopStyle } from './workStyles';

export type TwoColumnProps = {
  /** Main column (grows). */
  main: ReactNode;
  /** Side column: actions, history. Fixed width on desktop, stacked under `main` below 1024. */
  side: ReactNode;
  sideWidth?: number;
  /** The side column stays in view while the main column scrolls (web). Default `true`. */
  isSideSticky?: boolean;
  testID?: string;
};

/**
 * Main + side columns for PC work pages (course status, review detail). Below the desktop
 * breakpoint (tablet) the side column is stacked under the main one.
 */
export function TwoColumn({
  main,
  side,
  sideWidth = 340,
  isSideSticky = true,
  testID,
}: TwoColumnProps) {
  const { isDesktop } = useBreakpoint();
  const styles = useStyles();
  if (!isDesktop) {
    return (
      <View style={styles.stacked} testID={testID}>
        {main}
        {side}
      </View>
    );
  }
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.main}>{main}</View>
      <View
        style={[
          styles.side,
          { width: sideWidth },
          isSideSticky ? stickyTopStyle(DESKTOP_NAV_HEIGHT + spacing.lg) : null,
        ]}
        testID={testID ? `${testID}-side` : undefined}
      >
        {side}
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xxl },
  main: { flex: 1, minWidth: 0, gap: spacing.xl },
  // `alignSelf: flex-start` keeps the column as tall as its content, which `position: sticky` needs.
  side: { alignSelf: 'flex-start', flexShrink: 0, gap: spacing.lg },
  stacked: { gap: spacing.xl },
}));
