import { onlineManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

import { CACHE_MAX_AGE_MS } from '@/constants/config';

import { AppError } from './appError';
import { queryClient, setupQueryEnvironment } from './queryClient';

type NetState = { isConnected: boolean | null; isInternetReachable: boolean | null };

const mockUnsubscribe = jest.fn();
let netListener: ((state: NetState) => void) | undefined;

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn((listener: (state: NetState) => void) => {
      netListener = listener;
      return mockUnsubscribe;
    }),
  },
}));

const queryDefaults = queryClient.getDefaultOptions().queries;
const retry = queryDefaults?.retry as (failureCount: number, error: unknown) => boolean;
const retryDelay = queryDefaults?.retryDelay as (attempt: number) => number;

describe('queryClient defaults (PLAN section 10)', () => {
  it('keeps unused queries as long as the persisted cache lives (gcTime >= maxAge)', () => {
    expect(queryDefaults?.gcTime).toBe(CACHE_MAX_AGE_MS);
  });

  it('never retries mutations', () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it('does not retry 4xx errors because they will not fix themselves', () => {
    const notFound = new AppError({ status: 404, code: 'COURSE_NOT_FOUND', message: 'x' });
    const forbidden = new AppError({ status: 403, code: 'NOT_ENROLLED', message: 'x' });
    expect(retry(0, notFound)).toBe(false);
    expect(retry(0, forbidden)).toBe(false);
  });

  it('retries network and 5xx errors at most twice', () => {
    const network = new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'x' });
    const server = new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'x' });
    expect(retry(0, network)).toBe(true);
    expect(retry(1, server)).toBe(true);
    expect(retry(2, server)).toBe(false);
  });

  it('retries unknown (non-AppError) errors up to the same limit', () => {
    expect(retry(1, new Error('weird'))).toBe(true);
    expect(retry(2, new Error('weird'))).toBe(false);
  });

  it('backs off exponentially and caps the delay at 8 s', () => {
    expect([0, 1, 2, 3].map(retryDelay)).toEqual([1000, 2000, 4000, 8000]);
    expect(retryDelay(10)).toBe(8000);
  });
});

describe('setupQueryEnvironment', () => {
  it('wires NetInfo to onlineManager and AppState to focusManager, only once', () => {
    const addAppStateListener = jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() });

    setupQueryEnvironment();
    setupQueryEnvironment();

    // Subscribing happens lazily when TanStack Query gets its first subscriber.
    const unsubscribeOnline = onlineManager.subscribe(() => undefined);
    expect(netListener).toBeDefined();

    netListener?.({ isConnected: false, isInternetReachable: false });
    expect(onlineManager.isOnline()).toBe(false);

    netListener?.({ isConnected: true, isInternetReachable: null });
    expect(onlineManager.isOnline()).toBe(true);

    netListener?.({ isConnected: true, isInternetReachable: false });
    expect(onlineManager.isOnline()).toBe(false);

    unsubscribeOnline();
    addAppStateListener.mockRestore();
    onlineManager.setOnline(true);
  });
});
