import { act, renderHook } from '@testing-library/react-native';

import { formatCountdown, useCountdown } from './useCountdown';

describe('useCountdown', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('is 0 without a target', async () => {
    const { result } = await renderHook(() => useCountdown(null));
    expect(result.current).toBe(0);
  });

  it('counts down every second and stops at 0', async () => {
    const target = Date.now() + 3000;
    const { result } = await renderHook(() => useCountdown(target));
    expect(result.current).toBe(3);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(2);

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(0);
  });

  it('is 0 for a target in the past', async () => {
    const { result } = await renderHook(() => useCountdown(Date.now() - 5000));
    expect(result.current).toBe(0);
  });

  it('restarts when the target changes', async () => {
    const { result, rerender } = await renderHook(
      ({ target }: { target: number }) => useCountdown(target),
      { initialProps: { target: Date.now() + 2000 } },
    );
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(0);

    await rerender({ target: Date.now() + 60_000 });
    expect(result.current).toBe(60);
  });
});

describe('formatCountdown', () => {
  it('formats minutes and padded seconds', () => {
    expect(formatCountdown(845)).toBe('14:05');
    expect(formatCountdown(60)).toBe('1:00');
    expect(formatCountdown(9)).toBe('0:09');
    expect(formatCountdown(-3)).toBe('0:00');
  });
});
