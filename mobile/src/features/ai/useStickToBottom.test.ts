import { act, renderHook } from '@testing-library/react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { useStickToBottom } from './useStickToBottom';

function scrollEvent(offsetY: number, contentHeight = 2000, viewportHeight = 600) {
  return {
    nativeEvent: {
      contentOffset: { x: 0, y: offsetY },
      contentSize: { width: 390, height: contentHeight },
      layoutMeasurement: { width: 390, height: viewportHeight },
    },
  } as NativeSyntheticEvent<NativeScrollEvent>;
}

async function setup() {
  const { result } = await renderHook(() => useStickToBottom<string>());
  const scrollToEnd = jest.fn();
  Object.assign(result.current.listRef, { current: { scrollToEnd } });
  return { result, scrollToEnd };
}

describe('useStickToBottom', () => {
  it('follows new content while the reader is at the bottom', async () => {
    const { result, scrollToEnd } = await setup();
    await act(async () => result.current.onScroll(scrollEvent(1400)));
    await act(async () => result.current.onContentSizeChange());
    expect(scrollToEnd).toHaveBeenCalledWith({ animated: false });
  });

  it('stops following once the reader scrolls up', async () => {
    const { result, scrollToEnd } = await setup();
    await act(async () => result.current.onScroll(scrollEvent(200)));
    await act(async () => result.current.onContentSizeChange());
    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it('jumps to the bottom and follows again, animated or not', async () => {
    const { result, scrollToEnd } = await setup();
    await act(async () => result.current.onScroll(scrollEvent(200)));
    await act(async () => result.current.stickAndScroll({ animated: false }));
    expect(scrollToEnd).toHaveBeenLastCalledWith({ animated: false });
    await act(async () => result.current.onContentSizeChange());
    expect(scrollToEnd).toHaveBeenCalledTimes(2);
    await act(async () => result.current.stickAndScroll());
    expect(scrollToEnd).toHaveBeenLastCalledWith({ animated: true });
  });

  it('scrolls to new rows again once they are measured, unless the reader scrolled away', async () => {
    jest.useFakeTimers();
    try {
      const { result, scrollToEnd } = await setup();
      let cleanup: () => void = () => {};
      await act(async () => {
        cleanup = result.current.scrollToNewRows();
      });
      expect(scrollToEnd).toHaveBeenLastCalledWith({ animated: false });
      await act(async () => {
        jest.advanceTimersByTime(250);
      });
      expect(scrollToEnd).toHaveBeenLastCalledWith({ animated: true });

      scrollToEnd.mockClear();
      await act(async () => {
        cleanup = result.current.scrollToNewRows();
      });
      await act(async () => result.current.onScroll(scrollEvent(200)));
      await act(async () => {
        jest.advanceTimersByTime(250);
      });
      expect(scrollToEnd).toHaveBeenCalledTimes(1);
      cleanup();
    } finally {
      jest.useRealTimers();
    }
  });
});
