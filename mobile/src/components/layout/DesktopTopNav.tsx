import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Animated, Pressable, View, useWindowDimensions } from 'react-native';

import { Wordmark } from '@/components/ui/Wordmark';
import { useConfirmLogout } from '@/features/auth/useConfirmLogout';
import { useCartCount } from '@/features/cart/hooks';
import { useUnreadNotificationCount } from '@/features/notification/hooks';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { darkPalette, makeStyles, spacing, useTheme, withAlpha } from '@/theme';

import { DESKTOP_NAV_HEIGHT, useDesktopNavStore } from './desktopLayout';
import { getNavLinks, isNavLinkActive } from './desktopNavLinks';
import { NavAccountMenu } from './NavAccountMenu';
import { NavIconButton } from './NavIconButton';
import { NavLink } from './NavLink';
import { NavSearch } from './NavSearch';
import { useNavTone } from './navTone';
import { PageContainer } from './PageContainer';
import { useEscapeKey } from './useEscapeKey';
import { useIsDesktopNavVisible } from './useIsDesktopNavVisible';
import { useIsReducedMotion } from './useIsReducedMotion';

/** Length (ms) of the transparent <-> solid fade. */
const FADE_MS = 220;
/** The dark fade of the transparent bar reaches this far below the bar. */
const GRADIENT_EXTRA = 56;
const WORDMARK_SIZE = 30;

/**
 * Netflix-style top bar for wide windows (>= 768), signed-in users only. Fixed over the content:
 * transparent with a top-to-bottom dark fade while a page with a hero asks for it
 * (`useDesktopNavStore.isTransparent`), otherwise solid with a hairline. Left: wordmark + links
 * (Home, My courses, Teaching / Admin by role). Right: search, cart, notifications, account menu.
 */
export function DesktopTopNav() {
  const isVisible = useIsDesktopNavVisible();
  const user = useAuthStore((state) => state.user);
  if (!isVisible || !user) return null;
  return <TopNavBar fullName={user.fullName} avatarUrl={user.avatarUrl} role={user.role} />;
}

type TopNavBarProps = {
  fullName: string;
  avatarUrl: string | null;
  role: Parameters<typeof getNavLinks>[0];
};

function TopNavBar({ fullName, avatarUrl, role }: TopNavBarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const pathname = usePathname();
  const { height: windowHeight } = useWindowDimensions();
  const isTransparent = useDesktopNavStore((state) => state.isTransparent);
  const confirmLogout = useConfirmLogout();
  const cartCount = useCartCount();
  const unreadCount = useUnreadNotificationCount();
  const tone = useNavTone(isTransparent);
  const isReducedMotion = useIsReducedMotion();
  const { isDesktop } = useBreakpoint();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // 0 = transparent (gradient layer visible), 1 = solid.
  const [solid] = useState(() => new Animated.Value(isTransparent ? 0 : 1));
  const [gradientOpacity] = useState(() => Animated.subtract(1, solid));
  useEffect(() => {
    const animation = Animated.timing(solid, {
      toValue: isTransparent ? 0 : 1,
      duration: isReducedMotion ? 0 : FADE_MS,
      // The bar only exists on the web, where the JS driver is the one used anyway.
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [isTransparent, isReducedMotion, solid]);

  // The menu belongs to the page it was opened on: navigating closes it without an effect.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const isMenuOpen = menuPath === pathname;
  const closeMenu = useCallback(() => setMenuPath(null), []);
  const toggleMenu = useCallback(
    () => setMenuPath((current) => (current === pathname ? null : pathname)),
    [pathname],
  );
  useEscapeKey(isMenuOpen, closeMenu);

  const handleSearchOpenChange = useCallback(
    (isOpen: boolean) => {
      setIsSearchOpen(isOpen);
      if (isOpen) closeMenu();
    },
    [closeMenu],
  );
  const handleProfile = useCallback(() => {
    closeMenu();
    router.navigate('/profile');
  }, [closeMenu]);
  const handleSettings = useCallback(() => {
    closeMenu();
    router.push('/settings');
  }, [closeMenu]);
  const handleLogout = useCallback(() => {
    closeMenu();
    void confirmLogout();
  }, [closeMenu, confirmLogout]);

  // On a tablet the expanded search field needs the room of the links.
  const links = isSearchOpen && !isDesktop ? [] : getNavLinks(role);
  const cartLabel = cartCount > 0 ? t('nav.cartWithCount', { count: cartCount }) : t('nav.cart');
  const bellLabel =
    unreadCount > 0 ? t('nav.notificationsUnread', { count: unreadCount }) : t('nav.notifications');

  return (
    <View style={styles.container} testID="desktop-top-nav">
      <Animated.View
        pointerEvents="none"
        style={[styles.gradientLayer, { opacity: gradientOpacity }]}
        testID="desktop-top-nav-gradient"
      >
        <LinearGradient
          colors={[withAlpha(darkPalette.background, 0.85), withAlpha(darkPalette.background, 0)]}
          style={styles.fill}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.solidLayer, { opacity: solid, backgroundColor: colors.background }]}
        testID="desktop-top-nav-solid"
      />
      {isMenuOpen ? (
        <Pressable
          onPress={closeMenu}
          accessible={false}
          style={[styles.backdrop, { height: windowHeight }]}
          testID="nav-backdrop"
        />
      ) : null}
      <PageContainer style={styles.bar}>
        <View style={styles.side} role="navigation" aria-label={t('nav.main')}>
          <Pressable
            onPress={() => router.navigate('/')}
            accessibilityRole="link"
            accessibilityLabel={t('nav.brandHome')}
            style={styles.brand}
            testID="nav-brand"
          >
            <Wordmark size={WORDMARK_SIZE} textColor={isTransparent ? 'white' : 'text'} />
          </Pressable>
          {links.map((link) => (
            <NavLink
              key={link.key}
              label={t(`tabs.${link.titleKey}`)}
              isActive={isNavLinkActive(link, pathname)}
              tone={tone}
              onPress={() => router.navigate(link.href)}
              testID={`nav-link-${link.key}`}
            />
          ))}
        </View>
        <View style={styles.side}>
          <NavSearch tone={tone} onOpenChange={handleSearchOpenChange} />
          <NavIconButton
            icon="shopping-cart"
            accessibilityLabel={cartLabel}
            tone={tone}
            badgeCount={cartCount}
            onPress={() => router.navigate('/cart')}
            testID="nav-cart"
          />
          <NavIconButton
            icon="bell"
            accessibilityLabel={bellLabel}
            tone={tone}
            badgeCount={unreadCount}
            onPress={() => router.navigate('/notifications')}
            testID="nav-notifications"
          />
          <NavAccountMenu
            fullName={fullName}
            avatarUrl={avatarUrl}
            tone={tone}
            isOpen={isMenuOpen}
            onToggle={toggleMenu}
            onPressProfile={handleProfile}
            onPressSettings={handleSettings}
            onPressLogout={handleLogout}
          />
        </View>
      </PageContainer>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  // Absolute inside the app frame = pinned to the top while the screens scroll underneath.
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: DESKTOP_NAV_HEIGHT,
    zIndex: 100,
  },
  fill: { flex: 1 },
  gradientLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -GRADIENT_EXTRA,
  },
  solidLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0 },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  brand: { marginRight: spacing.xl, justifyContent: 'center', cursor: 'pointer' },
}));
