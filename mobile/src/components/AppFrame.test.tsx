import { act, screen } from '@testing-library/react-native';
import { Text, useWindowDimensions } from 'react-native';

import { DESKTOP_NAV_HEIGHT, NARROW_FALLBACK_WIDTH } from '@/components/layout/desktopLayout';
import { MAX_CONTENT_WIDTH } from '@/constants/config';
import { useAuthStore } from '@/stores/authStore';
import { renderWithProviders } from '@/test/renderWithProviders';

import { AppFrame } from './AppFrame';

let mockPathname = '/';
const mockIsWideRoute = jest.fn((path: string) => path === '/wide-page');

jest.mock('expo-router', () => ({ usePathname: () => mockPathname }));
jest.mock('@/components/layout/desktopLayout', () => ({
  ...jest.requireActual<object>('@/components/layout/desktopLayout'),
  isWideRoute: (path: string) => mockIsWideRoute(path),
}));
jest.mock('@/features/learning/progressSync', () => ({ startPendingProgressSync: jest.fn() }));
jest.mock('@/hooks/useIsOnline', () => ({ useIsOnline: () => true }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 390, height: 844, scale: 1, fontScale: 1 })),
}));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const setWidth = (width: number) =>
  mockUseWindowDimensions.mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });

function signIn() {
  useAuthStore.setState({ status: 'authenticated' });
}

describe('AppFrame', () => {
  beforeEach(() => {
    mockPathname = '/';
    setWidth(390);
  });
  afterEach(async () => {
    await act(async () => useAuthStore.setState({ status: 'idle' }));
  });

  it('renders its children', async () => {
    await renderWithProviders(
      <AppFrame>
        <Text>content</Text>
      </AppFrame>,
    );
    expect(screen.getByText('content')).toBeOnTheScreen();
  });

  it('caps the content column at the max width and centers it', async () => {
    await renderWithProviders(
      <AppFrame>
        <Text>content</Text>
      </AppFrame>,
    );
    expect(screen.getByTestId('app-frame-column')).toHaveStyle({ maxWidth: MAX_CONTENT_WIDTH });
    expect(screen.getByTestId('app-frame')).toHaveStyle({ alignItems: 'center' });
  });

  it('draws the column edges on a signed-out window just below the tablet breakpoint', async () => {
    setWidth(700);
    await renderWithProviders(
      <AppFrame>
        <Text>content</Text>
      </AppFrame>,
    );
    expect(screen.getByTestId('app-frame-column')).toHaveStyle({ borderLeftWidth: 1 });
    expect(screen.getByTestId('app-frame-column')).toHaveStyle({ maxWidth: MAX_CONTENT_WIDTH });
  });

  it.each([768, 1024, 1440])(
    'gives the auth screens the full width when signed out at %i dp',
    async (width) => {
      setWidth(width);
      await renderWithProviders(
        <AppFrame>
          <Text>content</Text>
        </AppFrame>,
      );
      expect(screen.getByTestId('app-frame-column')).toHaveStyle({ maxWidth: '100%' });
      expect(screen.getByTestId('app-frame-column')).not.toHaveStyle({ borderLeftWidth: 1 });
      // No desktop top bar and no narrow fallback column for signed-out users.
      expect(screen.getByTestId('app-frame-stage')).not.toHaveStyle({
        maxWidth: NARROW_FALLBACK_WIDTH,
      });
      expect(screen.getByTestId('app-frame-stage')).not.toHaveStyle({
        paddingTop: DESKTOP_NAV_HEIGHT,
      });
    },
  );

  it('draws no edges on a phone-sized window', async () => {
    await renderWithProviders(
      <AppFrame>
        <Text>content</Text>
      </AppFrame>,
    );
    expect(screen.getByTestId('app-frame-column')).not.toHaveStyle({ borderLeftWidth: 1 });
  });

  describe('signed in on a wide window', () => {
    it('removes the width cap and edges, and renders the top bar', async () => {
      signIn();
      setWidth(1440);
      await renderWithProviders(
        <AppFrame topNav={<Text>top-nav</Text>}>
          <Text>content</Text>
        </AppFrame>,
      );
      expect(screen.getByTestId('app-frame-column')).toHaveStyle({ maxWidth: '100%' });
      expect(screen.getByTestId('app-frame-column')).not.toHaveStyle({ borderLeftWidth: 1 });
      expect(screen.getByText('top-nav')).toBeOnTheScreen();
    });

    it('puts a screen without a desktop layout in a centered column below the bar', async () => {
      signIn();
      setWidth(1440);
      mockPathname = '/settings';
      await renderWithProviders(
        <AppFrame>
          <Text>content</Text>
        </AppFrame>,
      );
      expect(screen.getByTestId('app-frame-stage')).toHaveStyle({
        maxWidth: NARROW_FALLBACK_WIDTH,
        paddingTop: DESKTOP_NAV_HEIGHT,
        alignSelf: 'center',
      });
    });

    it('gives a screen with a desktop layout the full width and no top padding', async () => {
      signIn();
      setWidth(1440);
      mockPathname = '/wide-page';
      await renderWithProviders(
        <AppFrame>
          <Text>content</Text>
        </AppFrame>,
      );
      expect(screen.getByTestId('app-frame-stage')).not.toHaveStyle({
        paddingTop: DESKTOP_NAV_HEIGHT,
      });
      expect(screen.getByTestId('app-frame-stage')).not.toHaveStyle({
        maxWidth: NARROW_FALLBACK_WIDTH,
      });
    });

    it('is exactly the phone column below 768 even when signed in', async () => {
      signIn();
      setWidth(700);
      await renderWithProviders(
        <AppFrame>
          <Text>content</Text>
        </AppFrame>,
      );
      expect(screen.getByTestId('app-frame-column')).toHaveStyle({ maxWidth: MAX_CONTENT_WIDTH });
      expect(screen.getByTestId('app-frame-stage')).not.toHaveStyle({
        paddingTop: DESKTOP_NAV_HEIGHT,
      });
    });
  });
});
