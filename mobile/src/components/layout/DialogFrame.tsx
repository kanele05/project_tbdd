import type { ReactNode } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { makeStyles, radius, shadows, spacing } from '@/theme';

import { DESKTOP_NAV_HEIGHT } from './desktopLayout';
import { useEscapeKey } from './useEscapeKey';

/** Default card width of a PC dialog (forms: submit project, write a review, filters). */
export const DIALOG_DEFAULT_WIDTH = 600;

export type DialogFrameProps = {
  title: string;
  /** Closes the dialog: the close button, a click on the dimmed backdrop and the Escape key. */
  onClose: () => void;
  closeLabel: string;
  /** Card width in dp (default `DIALOG_DEFAULT_WIDTH`); shrinks on narrow windows. */
  width?: number;
  /** Controls next to the close button (e.g. "Reset"). */
  headerRight?: ReactNode;
  /** Pinned below the scrolling body (the primary action of a long form). */
  footer?: ReactNode;
  children: ReactNode;
  testID?: string;
};

/**
 * A modal route on a PC window (PLAN §2.5): the screen is a dimmed backdrop below the top bar with
 * a centered card - title + close button, a scrolling body and an optional pinned footer. Used for
 * the routes that are `presentation: 'modal'` on a phone; Expo Router has no overlay on the web, so
 * the "dialog" is the page itself. The backdrop and Escape close it like a native modal.
 */
export function DialogFrame({
  title,
  onClose,
  closeLabel,
  width = DIALOG_DEFAULT_WIDTH,
  headerRight,
  footer,
  children,
  testID,
}: DialogFrameProps) {
  const styles = useStyles();
  const { height } = useWindowDimensions();
  useEscapeKey(true, onClose);
  const maxHeight = Math.max(320, height - DESKTOP_NAV_HEIGHT - spacing.xxxl * 2);
  return (
    <View style={styles.frame} testID={testID}>
      <Pressable
        onPress={onClose}
        accessible={false}
        style={styles.backdrop}
        testID={testID ? `${testID}-backdrop` : undefined}
      />
      <View
        role="dialog"
        accessibilityViewIsModal
        accessibilityLabel={title}
        style={[styles.card, { maxWidth: width, maxHeight }]}
        testID={testID ? `${testID}-card` : undefined}
      >
        <View style={styles.header}>
          <AppText variant="h2" accessibilityRole="header" style={styles.title} numberOfLines={2}>
            {title}
          </AppText>
          {headerRight}
          <IconButton icon="x" onPress={onClose} accessibilityLabel={closeLabel} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  // Wide routes pad their own top by the bar height; the card is centered in what is left.
  frame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: DESKTOP_NAV_HEIGHT,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    backgroundColor: t.colors.background,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: t.colors.overlay,
  },
  card: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.card,
    ...shadows.floating,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.xxl,
    paddingRight: spacing.sm,
  },
  title: { flex: 1 },
  scroll: { flexShrink: 1 },
  body: { gap: spacing.lg, paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg },
  footer: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: t.colors.borderSubtle,
  },
}));
