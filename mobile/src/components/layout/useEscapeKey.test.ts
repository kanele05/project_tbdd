import { cleanup, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { useEscapeKey } from './useEscapeKey';

type Listener = (event: { key: string }) => void;

describe('useEscapeKey', () => {
  const originalOs = Platform.OS;
  const listeners = new Set<Listener>();

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
    (globalThis as { document?: unknown }).document = {
      addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
    };
  });
  afterEach(async () => {
    await cleanup();
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOs });
    delete (globalThis as { document?: unknown }).document;
    listeners.clear();
  });

  const press = (key: string) => listeners.forEach((listener) => listener({ key }));

  it('calls back on Escape only while active', async () => {
    const onEscape = jest.fn();
    const { rerender } = await renderHook(
      ({ isActive }: { isActive: boolean }) => useEscapeKey(isActive, onEscape),
      { initialProps: { isActive: false } },
    );
    press('Escape');
    expect(onEscape).not.toHaveBeenCalled();

    await rerender({ isActive: true });
    press('Enter');
    expect(onEscape).not.toHaveBeenCalled();
    press('Escape');
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('stops listening after unmount', async () => {
    const onEscape = jest.fn();
    const { unmount } = await renderHook(() => useEscapeKey(true, onEscape));
    expect(listeners.size).toBe(1);
    await unmount();
    expect(listeners.size).toBe(0);
  });
});
