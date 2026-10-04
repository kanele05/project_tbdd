import { useEffect, useReducer } from 'react';

import { nowMs } from './clock';

/**
 * Seconds left (rounded up) until `targetMs` (an epoch timestamp), re-rendering once a second while
 * the target is in the future. `0` when there is no target or it has passed.
 * Used for the "resend code in 42 s" and "account locked, try again in 14:30" countdowns.
 */
export function useCountdown(targetMs: number | null): number {
  const [, tick] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    if (targetMs === null || targetMs <= nowMs()) return undefined;
    const timer = setInterval(() => {
      tick();
      if (nowMs() >= targetMs) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [targetMs]);

  // Computed during render from the clock: always right, even right after `targetMs` changes.
  return targetMs === null ? 0 : Math.max(0, Math.ceil((targetMs - nowMs()) / 1000));
}

/** "14:05" for 845 seconds. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
