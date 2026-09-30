import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

function subscribe(onStoreChange: () => void): () => void {
  return onlineManager.subscribe(onStoreChange);
}

function getSnapshot(): boolean {
  return onlineManager.isOnline();
}

/**
 * `true` while the device is online. Backed by TanStack Query's `onlineManager`, which is wired to
 * NetInfo in `setupQueryEnvironment()` - so UI and query behavior always agree.
 */
export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
