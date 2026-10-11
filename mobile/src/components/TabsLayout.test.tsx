import { act, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useAuthStore } from '@/stores/authStore';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Role } from '@/types/api';

import TabsLayout from '../../app/(tabs)/_layout';

let mockPathname = '/';
const mockScreens: { name: string; href: unknown }[] = [];
const mockTabBarProps: { visibleRouteNames?: readonly string[] }[] = [];

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  Redirect: ({ href }: { href: string }) => {
    const { Text: RNText } = jest.requireActual<typeof import('react-native')>('react-native');
    return <RNText>{`redirect:${href}`}</RNText>;
  },
}));

jest.mock('expo-router/js-tabs', () => {
  function Screen({ name, options }: { name: string; options: { href?: unknown } }) {
    mockScreens.push({ name, href: options.href });
    return null;
  }
  function Tabs({
    children,
    tabBar,
  }: {
    children: ReactNode;
    tabBar: (props: object) => { props: { visibleRouteNames?: readonly string[] } };
  }) {
    mockTabBarProps.push(tabBar({}).props);
    return <>{children}</>;
  }
  Tabs.Screen = Screen;
  return { Tabs };
});

jest.mock('@/components/FloatingTabBar', () => ({
  FloatingTabBar: () => null,
}));

function signIn(role: Role) {
  useAuthStore.setState({
    user: {
      id: 'u1',
      email: 'a@b.c',
      fullName: 'A',
      headline: null,
      avatarUrl: null,
      coverUrl: null,
      role,
    },
  });
}

describe('TabsLayout', () => {
  beforeEach(() => {
    mockPathname = '/';
    mockScreens.length = 0;
    mockTabBarProps.length = 0;
  });
  afterEach(async () => {
    await act(async () => useAuthStore.setState({ user: null }));
  });

  it('registers all six tabs but only the four base ones are visible to a student', async () => {
    signIn('STUDENT');
    await renderWithProviders(<TabsLayout />);

    expect(mockScreens.map((s) => s.name)).toEqual([
      'index',
      'search',
      'my-courses',
      'studio',
      'admin',
      'profile',
    ]);
    expect(mockTabBarProps[0]?.visibleRouteNames).toEqual([
      'index',
      'search',
      'my-courses',
      'profile',
    ]);
    expect(mockScreens.find((s) => s.name === 'studio')?.href).toBeNull();
    expect(mockScreens.find((s) => s.name === 'admin')?.href).toBeNull();
    expect(mockScreens.find((s) => s.name === 'index')?.href).toBeUndefined();
  });

  it('shows Studio to a teacher and Admin to an admin', async () => {
    signIn('TEACHER');
    const { unmount } = await renderWithProviders(<TabsLayout />);
    expect(mockTabBarProps.at(-1)?.visibleRouteNames).toContain('studio');
    expect(mockTabBarProps.at(-1)?.visibleRouteNames).not.toContain('admin');
    unmount();

    signIn('ADMIN');
    await renderWithProviders(<TabsLayout />);
    expect(mockTabBarProps.at(-1)?.visibleRouteNames).toContain('admin');
    expect(mockTabBarProps.at(-1)?.visibleRouteNames).not.toContain('studio');
  });

  it('redirects a student who opens /studio or /admin directly', async () => {
    signIn('STUDENT');
    mockPathname = '/studio';
    const { unmount } = await renderWithProviders(<TabsLayout />);
    expect(screen.getByText('redirect:/(tabs)')).toBeOnTheScreen();
    unmount();

    mockPathname = '/admin';
    await renderWithProviders(<TabsLayout />);
    expect(screen.getByText('redirect:/(tabs)')).toBeOnTheScreen();
  });

  it('does not redirect a teacher on /studio', async () => {
    signIn('TEACHER');
    mockPathname = '/studio';
    await renderWithProviders(<TabsLayout />);
    expect(screen.queryByText('redirect:/(tabs)')).not.toBeOnTheScreen();
  });
});
