import { type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useConceptEnv } from './env';

type ScreenShellProps = {
  /** Solid page colour (also the fallback behind `background`). */
  backgroundColor: string;
  /** Decorative layer drawn behind the content, scrolls with it (gradient mesh, glows...). */
  background?: ReactNode;
  /** Floating / sticky layer pinned to the bottom (tab bar, CTA bar). */
  footer?: ReactNode;
  /** Layer pinned to the top, above the scrolling content (e.g. a floating header). */
  header?: ReactNode;
  children: ReactNode;
};

/** Scroll container for a concept screen. In screenshot mode it grows to the natural height. */
export function ScreenShell({
  backgroundColor,
  background,
  footer,
  header,
  children,
}: ScreenShellProps) {
  const { isFull } = useConceptEnv();
  const content = (
    <View style={[styles.content, { backgroundColor }]}>
      {background ? <View style={styles.background}>{background}</View> : null}
      {children}
    </View>
  );

  if (isFull) {
    return (
      <View style={[styles.fullRoot, { backgroundColor }]}>
        {content}
        {header}
        {footer}
      </View>
    );
  }
  return (
    <View style={[styles.root, { backgroundColor }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {content}
      </ScrollView>
      {header}
      {footer}
    </View>
  );
}

/** Web-only fake status bar so screenshots read like a phone. Native uses the real one. */
export function FakeStatusBar({ color }: { color: string }) {
  const { topInset } = useConceptEnv();
  if (Platform.OS !== 'web') return null;
  const style: ViewStyle = { height: topInset };
  return (
    <View style={[styles.statusBar, style]}>
      <Text style={[styles.statusTime, { color }]}>9:41</Text>
      <View style={styles.statusRight}>
        <View style={[styles.signalBar, { height: 5, backgroundColor: color }]} />
        <View style={[styles.signalBar, { height: 7, backgroundColor: color }]} />
        <View style={[styles.signalBar, { height: 9, backgroundColor: color }]} />
        <View style={[styles.signalBar, { height: 11, backgroundColor: color }]} />
        <View style={[styles.battery, { borderColor: color }]}>
          <View style={[styles.batteryFill, { backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fullRoot: { width: '100%' },
  scroll: { flexGrow: 1 },
  content: { width: '100%', overflow: 'hidden' },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    pointerEvents: 'none',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 6,
  },
  statusTime: { fontSize: 15, fontWeight: '700' },
  statusRight: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  signalBar: { width: 3, borderRadius: 1 },
  battery: {
    marginLeft: 6,
    width: 24,
    height: 12,
    borderWidth: 1,
    borderRadius: 4,
    padding: 1,
    opacity: 0.9,
  },
  batteryFill: { flex: 1, borderRadius: 2 },
});
