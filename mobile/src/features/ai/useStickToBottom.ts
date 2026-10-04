import { useCallback, useRef } from 'react';
import type { FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/** How close to the bottom (dp) still counts as "reading the latest message". */
const STICK_THRESHOLD = 120;

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

  /** Jump to the bottom and follow again (the user just sent a message). */
  const stickAndScroll = useCallback(() => {
    isStuckRef.current = true;
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  return { listRef, onScroll, onContentSizeChange, stickAndScroll };
}
