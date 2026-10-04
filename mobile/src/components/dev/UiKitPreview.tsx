import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { FloatingTabBar } from '@/components/FloatingTabBar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { GlassIconButton } from '@/components/ui/GlassIconButton';
import { HeroImage } from '@/components/ui/HeroImage';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { usePreferencesStore, type ThemeMode } from '@/stores/preferencesStore';
import { darkPalette, layout, makeStyles, spacing, useTheme } from '@/theme';

import { COPY, PHOTOS, sampleCourses, type PreviewLanguage } from './uiKitSamples';
import {
  AiSection,
  ButtonsSection,
  CardsSection,
  ChipsSection,
  GlassSection,
  RailSection,
  SmallPartsSection,
  StatesSection,
  TabsAndFieldsSection,
  TypographySection,
} from './UiKitSections';

export type UiKitPreviewProps = {
  /** Force light / dark for screenshots (applied once the saved preferences are loaded). */
  scheme?: ThemeMode;
  language?: PreviewLanguage;
  /** Natural height instead of an inner ScrollView, ends with a magenta line (screenshot mode). */
  isFull?: boolean;
  /** Show a toast on mount (to look at it). */
  hasToast?: boolean;
  /** Which tab of the demo floating bar starts active (0-3). */
  activeTab?: number;
};

const TAB_ICONS = ['home', 'search', 'book-open', 'user'] as const;

/** Fake navigation state so the real `FloatingTabBar` can be shown outside a navigator. */
function useFakeTabBarProps(labels: readonly string[], initialIndex: number): BottomTabBarProps {
  const [index, setIndex] = useState(initialIndex);
  return useMemo(() => {
    const routes = labels.map((label, position) => ({ key: `tab-${position}`, name: label }));
    const descriptors = Object.fromEntries(
      routes.map((route, position) => [
        route.key,
        {
          options: {
            title: labels[position],
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Feather name={TAB_ICONS[position] ?? 'home'} size={size} color={color} />
            ),
          },
        },
      ]),
    );
    // The preview only needs the fields `FloatingTabBar` reads; the rest of the navigation
    // object is not needed, so the shape is asserted instead of rebuilt.
    return {
      state: { index, routes },
      descriptors,
      navigation: {
        emit: () => ({ defaultPrevented: false }),
        navigate: (name: string) => setIndex(labels.indexOf(name)),
      },
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    } as unknown as BottomTabBarProps;
  }, [index, labels]);
}

function PreviewHero({ copy }: { copy: (typeof COPY)[PreviewLanguage] }) {
  const styles = useStyles();
  return (
    <HeroImage
      uri={PHOTOS.hero}
      height={560}
      top={
        <>
          <View style={styles.wordmark}>
            <AppText family="displayItalic" color="white" style={styles.wordmarkText}>
              elearn
            </AppText>
            <View style={styles.wordmarkDot} />
          </View>
          <View style={styles.row}>
            <GlassIconButton icon="search" accessibilityLabel="Search" />
            <GlassIconButton icon="bell" accessibilityLabel="Notifications" />
          </View>
        </>
      }
    >
      <AppText variant="hero" color="white">
        {copy.heroTitle}
      </AppText>
      <View style={styles.row}>
        <Feather name="star" size={15} color={darkPalette.star} />
        <AppText variant="caption" color="white" family="bodyMedium">
          {copy.heroMeta}
        </AppText>
      </View>
      <View style={styles.row}>
        <Button title={copy.heroCta} leftIcon="play" style={styles.flex} />
        <GlassIconButton icon="plus" accessibilityLabel="Add" size={52} />
        <GlassIconButton icon="zap" accessibilityLabel="AI" size={52} />
      </View>
      <View style={styles.row}>
        <Feather name="clock" size={15} color={darkPalette.gold} />
        <AppText variant="caption" family="bodyMedium" style={styles.promo}>
          {copy.heroPromo}
        </AppText>
      </View>
    </HeroImage>
  );
}

/**
 * Dev-only kitchen sink of the UI kit (concept B "Noir"): every shared component and primitive in
 * the active theme and language, so a redesign can be checked in one scroll. Route:
 * `/dev/ui-kit?scheme=light|dark&lang=vi|en&full=1`.
 */
export function UiKitPreview({
  scheme,
  language,
  isFull = false,
  hasToast = false,
  activeTab = 0,
}: UiKitPreviewProps) {
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const isHydrated = usePreferencesStore((state) => state.isHydrated);
  const lang: PreviewLanguage = i18n.language.startsWith('vi') ? 'vi' : 'en';
  const copy = COPY[lang];
  const courses = useMemo(() => sampleCourses(lang), [lang]);
  const tabBarProps = useFakeTabBarProps(copy.tabLabels, activeTab);

  useEffect(() => {
    if (!isHydrated) return;
    const store = usePreferencesStore.getState();
    if (scheme) store.setThemeMode(scheme);
    if (language) store.setLanguage(language);
  }, [isHydrated, scheme, language]);

  useEffect(() => {
    if (hasToast) toast.success(copy.toast, { duration: 120_000 });
  }, [hasToast, toast, copy.toast]);

  const body = (
    <View style={{ backgroundColor: colors.background }}>
      <PreviewHero copy={copy} />
      <View style={styles.content}>
        <RailSection copy={copy} courses={courses} />
        <TypographySection copy={copy} />
        <ButtonsSection copy={copy} />
        <ChipsSection copy={copy} />
        <TabsAndFieldsSection copy={copy} />
        <SmallPartsSection copy={copy} />
        <CardsSection copy={copy} courses={courses} />
        <AiSection copy={copy} />
        <StatesSection copy={copy} />
        <GlassSection copy={copy} />
      </View>
      <View style={styles.tabBarDemo}>
        <FloatingTabBar {...tabBarProps} />
      </View>
    </View>
  );

  if (isFull) {
    return (
      <View style={styles.full}>
        {body}
        <View style={styles.marker} />
      </View>
    );
  }
  return (
    <ScrollView style={{ backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
      {body}
    </ScrollView>
  );
}

const useStyles = makeStyles(() => ({
  full: { width: '100%' },
  content: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.xxl, gap: spacing.xxxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  flex: { flex: 1 },
  wordmark: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  wordmarkText: { fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  wordmarkDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginBottom: 9,
    backgroundColor: darkPalette.primary,
  },
  promo: { color: darkPalette.gold },
  tabBarDemo: { marginTop: spacing.xxxl },
  marker: { height: 6, backgroundColor: '#FF00FE' },
}));
