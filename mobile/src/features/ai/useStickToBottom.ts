import { useCallback, useRef } from 'react';
import type { FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/** How close to the bottom (dp) still counts as "reading the latest message". */
const STICK_THRESHOLD = 120;
/** Time for freshly added rows to be laid out and measured before the second scroll. */
const SETTLE_MS = 250;

/**
 * Chat scrolling: keep the newest message in view while it grows (streaming) or arrives, unless the
 * user has scrolled up to read older ones. Wire `onScroll` and `onContentSizeChange` to the list.
 */
export function useStickToBottom<T>() {
  const listRef = useRef<FlatList<T>>(null);
  const isStuckRef = useRef(true);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distance = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    isStuckRef.current = distance < STICK_THRESHOLD;
  }, []);

  const onContentSizeChange = useCallback(() => {
    if (isStuckRef.current) listRef.current?.scrollToEnd({ animated: false });
  }, []);

  /**
   * Jump to the bottom and follow again (the user just sent a message). `animated: false` for
   * content that is about to grow (an error note): an animated scroll reports intermediate
   * positions far from the bottom, which would unstick the list before the new rows lay out.
   */
  const stickAndScroll = useCallback(({ animated = true }: { animated?: boolean } = {}) => {
    isStuckRef.current = true;
    listRef.current?.scrollToEnd({ animated });
  }, []);

  /**
   * Bring rows that were just added into view: scroll now, then once more after they have been
   * measured (`scrollToEnd` uses the list's measured length, which lags one layout pass behind on
   * the web). Returns a cleanup for effects.
   */
  const scrollToNewRows = useCallback(() => {
    stickAndScroll({ animated: false });
    const timer = setTimeout(() => {
      if (isStuckRef.current) listRef.current?.scrollToEnd({ animated: true });
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [stickAndScroll]);

  return { listRef, onScroll, onContentSizeChange, stickAndScroll, scrollToNewRows };
}
