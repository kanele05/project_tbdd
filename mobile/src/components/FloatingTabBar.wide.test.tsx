import Feather from '@expo/vector-icons/Feather';
import { screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useWindowDimensions } from 'react-native';

import { renderHookWithProviders, renderWithProviders } from '@/test/renderWithProviders';

import { FloatingTabBar, useTabBarClearance } from './FloatingTabBar';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 390, height: 844, scale: 1, fontScale: 1 })),
}));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const setWidth = (width: number) =>
  mockUseWindowDimensions.mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });

const props = {
  state: { index: 0, routes: [{ key: 'home-key', name: 'Home' }] },
  descriptors: {
    'home-key': {
      options: {
        title: 'Home',
        tabBarIcon: ({ color, size }: { color: string; size: number }) => (
          <Feather name="home" size={size} color={color} />
        ),
      },
    },
  },
  navigation: { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
} as unknown as BottomTabBarProps;

describe('FloatingTabBar on wide windows', () => {
  it('draws the bar on a phone-sized window', async () => {
    setWidth(390);
    await renderWithProviders(<FloatingTabBar {...props} />);
    expect(screen.getByTestId('floating-tab-bar')).toBeOnTheScreen();
  });

  it.each([768, 1280])('is hidden at %d dp (the desktop top bar replaces it)', async (width) => {
    setWidth(width);
    await renderWithProviders(<FloatingTabBar {...props} />);
    expect(screen.queryByTestId('floating-tab-bar')).not.toBeOnTheScreen();
  });

  it('only needs the normal bottom margin when the bar is not drawn', async () => {
    setWidth(390);
    const phone = await renderHookWithProviders(() => useTabBarClearance());
    expect(phone.result.current).toBeGreaterThan(24);
    phone.unmount();

    setWidth(1280);
    const wide = await renderHookWithProviders(() => useTabBarClearance());
    expect(wide.result.current).toBe(24);
  });
});
