import Feather from '@expo/vector-icons/Feather';
import { fireEvent, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { renderHookWithProviders, renderWithProviders } from '@/test/renderWithProviders';
import { darkPalette, lightPalette } from '@/theme';

import { FloatingTabBar, TAB_BAR_OVERLAYS_CONTENT, useTabBarClearance } from './FloatingTabBar';

const LABELS = ['Home', 'Search', 'My courses', 'Profile'] as const;

function makeProps(
  index: number,
  overrides: { defaultPrevented?: boolean; labels?: readonly string[] } = {},
) {
  const emit = jest.fn(() => ({ defaultPrevented: overrides.defaultPrevented ?? false }));
  const navigate = jest.fn();
  const routes = (overrides.labels ?? LABELS).map((label) => ({
    key: `${label}-key`,
    name: label,
  }));
  const descriptors = Object.fromEntries(
    routes.map((route) => [
      route.key,
      {
        options: {
          title: route.name,
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Feather name="home" size={size} color={color} />
          ),
        },
      },
    ]),
  );
  // The bar only reads these fields; the full React Navigation objects are not needed in a test.
  const props = {
    state: { index, routes },
    descriptors,
    navigation: { emit, navigate },
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  } as unknown as BottomTabBarProps;
  return { props, emit, navigate };
}

describe('FloatingTabBar', () => {
  it('shows every tab as a tab-role button and selects the focused one', async () => {
    const { props } = makeProps(2);
    await renderWithProviders(<FloatingTabBar {...props} />);

    for (const label of LABELS) {
      expect(screen.getByRole('tab', { name: label })).toBeOnTheScreen();
    }
    expect(screen.getByRole('tab', { name: 'My courses' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Home' })).not.toBeSelected();
  });

  it('keeps idle tabs at the 48 dp touch target so the active label has room on a 360 dp phone', async () => {
    const { props } = makeProps(0);
    await renderWithProviders(<FloatingTabBar {...props} />);

    expect(screen.getByRole('tab', { name: 'Search' })).toHaveStyle({ width: 48, height: 48 });
  });

  it('prints the label only on the active tab (the others are icon-only)', async () => {
    const { props } = makeProps(0);
    await renderWithProviders(<FloatingTabBar {...props} />);

    expect(screen.getByText('Home')).toBeOnTheScreen();
    expect(screen.queryByText('Search')).not.toBeOnTheScreen();
  });

  it('navigates when another tab is pressed, and emits tabPress first', async () => {
    const { props, emit, navigate } = makeProps(0);
    await renderWithProviders(<FloatingTabBar {...props} />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Profile' }));
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'tabPress' }));
    expect(navigate).toHaveBeenCalledWith('Profile', undefined);
  });

  it('does not navigate to the tab that is already focused or when the press is prevented', async () => {
    const focused = makeProps(0);
    const { unmount } = await renderWithProviders(<FloatingTabBar {...focused.props} />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Home' }));
    expect(focused.navigate).not.toHaveBeenCalled();
    unmount();

    const prevented = makeProps(0, { defaultPrevented: true });
    await renderWithProviders(<FloatingTabBar {...prevented.props} />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Search' }));
    expect(prevented.navigate).not.toHaveBeenCalled();
  });

  it('colors the active pill with the neon fill and a dark label in both themes', async () => {
    const { props } = makeProps(0);
    const { unmount } = await renderWithProviders(<FloatingTabBar {...props} />, {
      theme: 'dark',
    });
    expect(screen.getByRole('tab', { name: 'Home' })).toHaveStyle({
      backgroundColor: darkPalette.primary,
    });
    expect(screen.getByText('Home')).toHaveStyle({ color: darkPalette.onPrimary });
    unmount();

    await renderWithProviders(<FloatingTabBar {...props} />, { theme: 'light' });
    expect(screen.getByRole('tab', { name: 'Home' })).toHaveStyle({
      backgroundColor: lightPalette.primary,
    });
  });
});

describe('FloatingTabBar role-based tabs', () => {
  const ALL = [...LABELS, 'Studio', 'Admin'] as const;

  it('draws only the routes named in visibleRouteNames (a student has no Studio / Admin tab)', async () => {
    const { props } = makeProps(0, { labels: ALL });
    await renderWithProviders(<FloatingTabBar {...props} visibleRouteNames={LABELS} />);

    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.queryByRole('tab', { name: 'Studio' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('tab', { name: 'Admin' })).not.toBeOnTheScreen();
  });

  it('shows a fifth tab for a teacher and still selects by the real route index', async () => {
    const { props, navigate } = makeProps(4, { labels: ALL });
    await renderWithProviders(
      <FloatingTabBar {...props} visibleRouteNames={[...LABELS, 'Studio']} />,
    );

    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByRole('tab', { name: 'Studio' })).toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: 'Home' }));
    expect(navigate).toHaveBeenCalledWith('Home', undefined);
  });

  it('draws every route when visibleRouteNames is omitted', async () => {
    const { props } = makeProps(0, { labels: ALL });
    await renderWithProviders(<FloatingTabBar {...props} />);
    expect(screen.getAllByRole('tab')).toHaveLength(6);
  });
});

describe('useTabBarClearance', () => {
  it('is 0 while the bar takes its own row, and a positive padding once it overlays content', async () => {
    const { result } = await renderHookWithProviders(() => useTabBarClearance(), {
      insets: { bottom: 20 },
    });
    if (TAB_BAR_OVERLAYS_CONTENT) expect(result.current).toBeGreaterThan(64);
    else expect(result.current).toBe(0);
  });
});
