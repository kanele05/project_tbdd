import { act, renderHook } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';

import { useAuthStore } from '@/stores/authStore';

import { useAppBootstrap } from './useAppBootstrap';

let mockIsRestoring = false;
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useIsRestoring: () => mockIsRestoring,
}));

jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(() => Promise.resolve()) }));

const mockHydrate = jest.fn(() => Promise.resolve());
const hideAsync = SplashScreen.hideAsync as jest.Mock;

function setAuth(status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated') {
  useAuthStore.setState({ status, hydrate: mockHydrate });
}

describe('useAppBootstrap', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockIsRestoring = false;
    setAuth('idle');
  });

  afterEach(async () => {
    jest.useRealTimers();
    await act(async () => {
      useAuthStore.setState({ status: 'idle' });
    });
  });

  it('starts hydrating the session once the persisted cache is restored', async () => {
    await renderHook(() => useAppBootstrap(true));
    expect(mockHydrate).toHaveBeenCalledTimes(1);
  });

  it('waits for the cache restore before reading the token', async () => {
    mockIsRestoring = true;
    const { rerender } = await renderHook(() => useAppBootstrap(true));
    expect(mockHydrate).not.toHaveBeenCalled();

    mockIsRestoring = false;
    await rerender({});
    expect(mockHydrate).toHaveBeenCalledTimes(1);
  });

  it('keeps the splash until fonts are ready and the session is resolved', async () => {
    setAuth('unauthenticated');
    const { result, rerender } = await renderHook(
      (props: { fontsReady: boolean }) => useAppBootstrap(props.fontsReady),
      { initialProps: { fontsReady: false } },
    );
    expect(result.current).toBe(false);
    expect(hideAsync).not.toHaveBeenCalled();

    await rerender({ fontsReady: true });
    expect(result.current).toBe(true);
    expect(hideAsync).toHaveBeenCalled();
  });

  it('stays on the splash while the session is still loading', async () => {
    setAuth('loading');
    const { result } = await renderHook(() => useAppBootstrap(true));
    expect(result.current).toBe(false);
  });

  it('is ready for an authenticated user', async () => {
    setAuth('authenticated');
    const { result } = await renderHook(() => useAppBootstrap(true));
    expect(result.current).toBe(true);
  });

  it('gives up waiting after 12 s so a hanging request never traps the user on the splash', async () => {
    setAuth('loading');
    const { result } = await renderHook(() => useAppBootstrap(false));
    expect(result.current).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(12_000);
    });

    expect(result.current).toBe(true);
    expect(hideAsync).toHaveBeenCalled();
  });
});
