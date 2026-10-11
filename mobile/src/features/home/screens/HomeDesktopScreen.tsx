import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { DESKTOP_NAV_HEIGHT, useDesktopNavStore } from '@/components/layout/desktopLayout';
import { EmptyState, ErrorState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';
import type { HomeResponse } from '@/types/api';

import { buildBillboards } from '../billboards';
import { DesktopBillboard, DesktopBillboardSkeleton } from '../components/DesktopBillboard';
import { HomeDesktopRows } from '../components/HomeDesktopRows';
import { HomeDesktopSkeleton } from '../components/HomeDesktopSkeleton';
import { useHome } from '../hooks';

/** Scroll distance (dp) after which the top navigation turns solid. */
export const NAV_SOLID_SCROLL_Y = 64;
const MIN_BILLBOARD_HEIGHT = 480;
const MAX_BILLBOARD_HEIGHT = 780;

function isHomeEmpty(home: HomeResponse): boolean {
  return (
    home.banners.length === 0 &&
    home.categories.length === 0 &&
    home.popular.length === 0 &&
    home.recommended.length === 0 &&
    home.inspires.length === 0 &&
    home.topTeachers.length === 0
  );
}

/**
 * Home on wide screens (PLAN §2.5, WEB-02): a full-bleed billboard under the transparent top
 * navigation, then the sections as Netflix rows. The navigation turns solid once the page scrolls.
 */
export function HomeDesktopScreen() {
  const { t } = useTranslation('home');
  const styles = useStyles();
  const isFocused = useIsFocused();
  const { width, height } = useWindowDimensions();
  const { data, isPending, isError, error, refetch } = useHome();
  const scrollYRef = useRef(0);

  const billboards = useMemo(
    () => (data ? buildBillboards(data, t('hero.featuredTag')) : []),
    [data, t],
  );
  const hasBillboard = billboards.length > 0 || (isPending && !data);
  const billboardHeight = Math.round(
    Math.min(Math.max(height * 0.74, MIN_BILLBOARD_HEIGHT), MAX_BILLBOARD_HEIGHT),
  );

  const applyNavTransparency = useCallback(
    (scrollY: number) => {
      const shouldBeTransparent = isFocused && hasBillboard && scrollY < NAV_SOLID_SCROLL_Y;
      const { isTransparent, setTransparent } = useDesktopNavStore.getState();
      if (isTransparent !== shouldBeTransparent) setTransparent(shouldBeTransparent);
    },
    [hasBillboard, isFocused],
  );
  useEffect(() => {
    applyNavTransparency(scrollYRef.current);
    return () => useDesktopNavStore.getState().setTransparent(false);
  }, [applyNavTransparency]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = event.nativeEvent.contentOffset.y;
      applyNavTransparency(scrollYRef.current);
    },
    [applyNavTransparency],
  );

  let top = null;
  let body = null;
  if (data && billboards.length > 0) {
    top = <DesktopBillboard items={billboards} height={billboardHeight} width={width} />;
  } else if (isPending) {
    top = <DesktopBillboardSkeleton height={billboardHeight} />;
  }
  if (data) {
    body = isHomeEmpty(data) ? (
      <View style={{ paddingTop: DESKTOP_NAV_HEIGHT }}>
        <EmptyState
          icon="book-open"
          title={t('emptyTitle')}
          message={t('emptyMessage')}
          actionLabel={t('refresh')}
          onAction={() => void refetch()}
        />
      </View>
    ) : (
      <HomeDesktopRows home={data} width={width} />
    );
  } else if (isPending) {
    body = <HomeDesktopSkeleton width={width} />;
  } else if (isError) {
    body = (
      <View style={{ paddingTop: DESKTOP_NAV_HEIGHT }}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        testID="home-scroll"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {top}
        <View style={top ? styles.rowsUnderBillboard : null}>{body}</View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { flexGrow: 1, paddingBottom: spacing.huge },
  // The billboard fades into the page; the first row overlaps its lower edge a little (Netflix).
  rowsUnderBillboard: { marginTop: -spacing.huge * 1.5 },
}));
