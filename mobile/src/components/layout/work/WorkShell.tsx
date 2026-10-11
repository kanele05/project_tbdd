import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { makeStyles, spacing } from '@/theme';

import { DESKTOP_NAV_HEIGHT } from '../desktopLayout';
import { PageContainer } from '../PageContainer';

/** Content width of the work screens (Studio, Admin): wide enough for tables, narrow enough to read. */
export const WORK_MAX_WIDTH = 1200;

export type WorkFrameProps = { children: ReactNode; testID?: string };

/** Full-height page below the desktop top bar (wide routes pad their own top by the bar height). */
export function WorkFrame({ children, testID }: WorkFrameProps) {
  const styles = useStyles();
  return (
    <View style={styles.frame} testID={testID}>
      {children}
    </View>
  );
}

export type WorkShellProps = {
  children: ReactNode;
  /** Content column width (default `WORK_MAX_WIDTH`). */
  maxWidth?: number;
  testID?: string;
};

/**
 * A PC work page: top-bar clearance, one vertical scroll area and a centered `PageContainer`.
 * Wide screens only - phone layouts keep their own `ScreenHeader` + scroll.
 */
export function WorkShell({ children, maxWidth = WORK_MAX_WIDTH, testID }: WorkShellProps) {
  const styles = useStyles();
  return (
    <WorkFrame testID={testID}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <PageContainer maxWidth={maxWidth}>{children}</PageContainer>
      </ScrollView>
    </WorkFrame>
  );
}

const useStyles = makeStyles((t) => ({
  frame: { flex: 1, paddingTop: DESKTOP_NAV_HEIGHT, backgroundColor: t.colors.background },
  content: { paddingTop: spacing.xxl, paddingBottom: spacing.huge },
}));
