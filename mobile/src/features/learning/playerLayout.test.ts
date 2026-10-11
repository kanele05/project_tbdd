import { act, renderHook } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

import { getPlayerMaxHeight, useIsKeyboardVisible } from './playerLayout';

describe('getPlayerMaxHeight', () => {
  it('caps the video frame at 35% of the window height', () => {
    expect(getPlayerMaxHeight(780)).toBe(273);
    expect(getPlayerMaxHeight(1000)).toBe(350);
  });

  it('lets the video use 70% of the window height on a wide window', () => {
    expect(getPlayerMaxHeight(1000, true)).toBe(700);
    expect(getPlayerMaxHeight(900, false)).toBe(315);
  });

  it('leaves a 16:9 frame on a 360 dp wide phone untouched', () => {
    expect(getPlayerMaxHeight(780)).toBeGreaterThan((360 * 9) / 16);
  });
});

describe('useIsKeyboardVisible', () => {
  const handlers: Record<string, () => void> = {};
  beforeEach(() => {
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      event: string,
      handler: () => void,
    ) => {
      handlers[event] = handler;
      return { remove: jest.fn() };
    }) as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it('follows the keyboard show and hide events', async () => {
    const { result } = await renderHook(() => useIsKeyboardVisible());
    expect(result.current).toBe(false);

    await act(async () => void handlers.keyboardDidShow?.());
    expect(result.current).toBe(true);

    await act(async () => void handlers.keyboardDidHide?.());
    expect(result.current).toBe(false);
  });
});
