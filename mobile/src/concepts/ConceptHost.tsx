import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONCEPTS } from './registry';
import { ConceptEnvProvider } from './shared/env';
import { Icon } from './shared/icons';
import type { ConceptId, ConceptScreen, Scheme } from './shared/types';

type ConceptHostProps = {
  id: ConceptId;
  scheme: Scheme;
  screen: ConceptScreen;
  /** Screenshot mode: natural height instead of an inner ScrollView. */
  isFull: boolean;
  /** Draw the small on-device switcher (scheme / screen / concept). */
  hasControls: boolean;
  /** Draws a 6 px magenta line at the very end so a screenshot can be cropped exactly. */
  hasEndMarker: boolean;
  onChange: (next: { id?: ConceptId; scheme?: Scheme; screen?: ConceptScreen }) => void;
};

/** Mounts one concept screen with fonts, theme env and (optionally) the dev switcher. */
export function ConceptHost({
  id,
  scheme,
  screen,
  isFull,
  hasControls,
  hasEndMarker,
  onChange,
}: ConceptHostProps) {
  const entry = CONCEPTS[id];
  const [areFontsLoaded, fontError] = useFonts(entry.fonts);
  const Screen = entry.screens[screen];

  if (!areFontsLoaded && !fontError) return <View style={styles.blank} />;
  const isDark = scheme === 'dark';
  // A's course hero and B (both screens) start with a full-bleed photo, so the status bar is
  // light there. C always starts on the aurora background, so it follows the colour scheme.
  const hasPhotoTop = id === 'b' || (id === 'a' && screen === 'course');
  const statusStyle = hasPhotoTop || isDark ? 'light' : 'dark';

  return (
    <ConceptEnvProvider scheme={scheme} isFull={isFull}>
      <StatusBar style={statusStyle} />
      <View style={isFull ? styles.full : styles.fill}>
        <Screen />
        {hasEndMarker ? <View style={styles.marker} /> : null}
      </View>
      {hasControls ? (
        // Re-keyed so the panel collapses after every switch instead of covering the screen.
        <Switcher
          key={`${id}-${scheme}-${screen}`}
          id={id}
          scheme={scheme}
          screen={screen}
          onChange={onChange}
        />
      ) : null}
    </ConceptEnvProvider>
  );
}

type SwitcherProps = Pick<ConceptHostProps, 'id' | 'scheme' | 'screen' | 'onChange'>;

function Switcher({ id, scheme, screen, onChange }: SwitcherProps) {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={[styles.switcher, { top: insets.top + 96 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Công cụ so sánh mẫu giao diện"
        onPress={() => setIsOpen((value) => !value)}
        style={styles.fab}
      >
        <Icon name={isOpen ? 'check' : 'more'} size={22} color="#FFFFFF" />
      </Pressable>
      {isOpen ? (
        <View style={styles.panel}>
          {(['a', 'b', 'c'] as const).map((key) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: id === key }}
              onPress={() => onChange({ id: key })}
              style={[styles.opt, id === key ? styles.optOn : null]}
            >
              <Text style={styles.optText}>{key.toUpperCase()}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              scheme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'
            }
            onPress={() => onChange({ scheme: scheme === 'dark' ? 'light' : 'dark' })}
            style={styles.opt}
          >
            <Text style={styles.optText}>{scheme === 'dark' ? 'Sáng' : 'Tối'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đổi màn hình"
            onPress={() => onChange({ screen: screen === 'home' ? 'course' : 'home' })}
            style={styles.opt}
          >
            <Text style={styles.optText}>{screen === 'home' ? 'Chi tiết' : 'Home'}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: '#0E0B24' },
  fill: { flex: 1 },
  full: { width: '100%', maxWidth: Platform.OS === 'web' ? 390 : undefined },
  marker: { height: 6, backgroundColor: '#FF00FE' },
  switcher: {
    position: 'absolute',
    right: 8,
    alignItems: 'flex-end',
    gap: 6,
    zIndex: 100,
    pointerEvents: 'box-none',
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(20,20,30,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    padding: 6,
    gap: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(20,20,30,0.92)',
  },
  opt: {
    minWidth: 64,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optOn: { backgroundColor: '#00BDD6' },
  optText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
