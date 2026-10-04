import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { POSTERS } from '@/constants/posters';
import { useTranslation } from '@/i18n';
import { darkPalette, layout, spacing, useTheme, withAlpha } from '@/theme';

import { AppText } from './AppText';
import { GlassIconButton } from './GlassIconButton';

export type CinematicHeaderProps = {
  title: string;
  /** Second line under the title (white, 90 %). */
  subtitle?: string;
  /** Remote image (course thumbnail, avatar). Falls back to a bundled poster while empty. */
  uri?: string | null;
  /** Bundled image, used when `uri` is empty. */
  source?: ImageSource | number;
  /** Which bundled poster to use when neither `uri` nor `source` is given (same index = same photo). */
  posterIndex?: number;
  /** Show the glass back button. Default true. */
  showBack?: boolean;
  onBack?: () => void;
  /** Controls on the right of the top row: use `GlassIconButton`s (they sit on a photo). */
  right?: ReactNode;
  /** Blur strength of the photo (`blurRadius`). Default 10. */
  blur?: number;
  withTopInset?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Minimum height without the status-bar inset: room for the photo to show above the title. */
const MIN_HEIGHT = 216;

/** Space at the bottom of the header where the photo melts into the page background. */
const FADE_HEIGHT = 36;

function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Header of the "cinematic" forms (checkout, write a review, submit a project, edit profile,
 * settings, filters): a blurred photo behind a glass back button, the title in big white serif and
 * a scrim that melts into the page background. Drop-in for `ScreenHeader` (same `title`, `showBack`,
 * `onBack`, `right`). The photo is decoration only; text contrast comes from the dark scrim
 * (>= 0.7) under the white text, in both themes.
 */
function CinematicHeaderBase({
  title,
  subtitle,
  uri,
  source,
  posterIndex = 0,
  showBack = true,
  onBack,
  right,
  blur = 10,
  withTopInset = true,
  style,
  testID,
}: CinematicHeaderProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const photo = uri ? { uri } : (source ?? POSTERS[posterIndex % POSTERS.length]);
  const hasTopRow = showBack || right !== undefined;

  return (
    <View
      testID={testID}
      style={[
        styles.root,
        {
          backgroundColor: darkPalette.scrim,
          minHeight: MIN_HEIGHT + (withTopInset ? insets.top : 0),
        },
        style,
      ]}
    >
      <Image
        source={photo}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        blurRadius={blur}
        transition={200}
        accessibilityIgnoresInvertColors
        accessible={false}
      />
      <LinearGradient
        colors={[
          withAlpha(darkPalette.scrim, 0.18),
          withAlpha(darkPalette.scrim, 0.3),
          withAlpha(darkPalette.scrim, 0.8),
          withAlpha(darkPalette.scrim, 0.86),
          colors.background,
        ]}
        locations={[0, 0.3, 0.58, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, { paddingTop: withTopInset ? insets.top : 0 }]}>
        {hasTopRow ? (
          <View style={styles.topRow}>
            {showBack ? (
              <GlassIconButton
                icon="chevron-left"
                onPress={onBack ?? goBack}
                accessibilityLabel={t('actions.back')}
                testID="header-back"
              />
            ) : (
              <View />
            )}
            <View style={styles.right}>{right}</View>
          </View>
        ) : (
          <View style={styles.topSpacer} />
        )}
        <View style={styles.titles}>
          <AppText variant="h1" color="white" accessibilityRole="header" numberOfLines={2}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="body" style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingX - spacing.sm,
    paddingBottom: FADE_HEIGHT,
  },
  topRow: {
    minHeight: layout.minTouchTarget + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  topSpacer: { height: spacing.lg },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titles: { gap: spacing.xs, paddingTop: spacing.sm, paddingHorizontal: spacing.sm },
  subtitle: { color: withAlpha(darkPalette.white, 0.9) },
});

export const CinematicHeader = memo(CinematicHeaderBase);
