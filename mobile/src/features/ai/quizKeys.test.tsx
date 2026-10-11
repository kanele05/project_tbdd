import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { getQuizKeyAction, useQuizKeys } from './quizKeys';

describe('getQuizKeyAction', () => {
  it('maps 1-4 to the options while the question is open', () => {
    const open = { optionCount: 4, isAnswered: false };
    expect(getQuizKeyAction('1', open)).toEqual({ type: 'select', optionIndex: 0 });
    expect(getQuizKeyAction('4', open)).toEqual({ type: 'select', optionIndex: 3 });
    expect(getQuizKeyAction('5', open)).toBeNull();
    expect(getQuizKeyAction('0', open)).toBeNull();
    expect(getQuizKeyAction('a', open)).toBeNull();
    expect(getQuizKeyAction('Enter', open)).toBeNull();
  });

  it('only lets Enter continue once the question is answered', () => {
    const answered = { optionCount: 4, isAnswered: true };
    expect(getQuizKeyAction('Enter', answered)).toEqual({ type: 'next' });
    expect(getQuizKeyAction('2', answered)).toBeNull();
  });
});

describe('useQuizKeys', () => {
  type Listener = (event: Partial<KeyboardEvent>) => void;
  let listeners: Listener[] = [];
  const fakeDocument = {
    activeElement: null as unknown,
    body: {},
    addEventListener: jest.fn((_type: string, listener: Listener) => listeners.push(listener)),
    removeEventListener: jest.fn((_type: string, listener: Listener) => {
      listeners = listeners.filter((item) => item !== listener);
    }),
  };

  beforeEach(() => {
    listeners = [];
    fakeDocument.activeElement = fakeDocument.body;
    jest.replaceProperty(Platform, 'OS', 'web');
    (globalThis as { document?: unknown }).document = fakeDocument;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Removed last: the auto-cleanup unmounts the hooks (and calls removeEventListener) after `afterEach`.
  afterAll(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  const press = (key: string, extra: Partial<KeyboardEvent> = {}) =>
    listeners.forEach((listener) => listener({ key, ...extra }));

  it('selects an option with a digit key and goes on with Enter', async () => {
    const onSelect = jest.fn();
    const onNext = jest.fn();
    const { rerender } = await renderHook(
      (props: { isAnswered: boolean }) =>
        useQuizKeys({ optionCount: 4, isAnswered: props.isAnswered, onSelect, onNext }),
      { initialProps: { isAnswered: false } },
    );

    press('3');
    expect(onSelect).toHaveBeenCalledWith(2);
    press('c', {});
    expect(onSelect).toHaveBeenCalledTimes(1);

    await rerender({ isAnswered: true });
    press('Enter');
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('ignores shortcuts with a modifier key and Enter while a button has focus', async () => {
    const onSelect = jest.fn();
    const onNext = jest.fn();
    await renderHook(() => useQuizKeys({ optionCount: 4, isAnswered: true, onSelect, onNext }));

    press('Enter', { ctrlKey: true });
    fakeDocument.activeElement = {};
    press('Enter');

    expect(onNext).not.toHaveBeenCalled();
  });

  it('removes its listener on unmount', async () => {
    const { unmount } = await renderHook(() =>
      useQuizKeys({ optionCount: 4, isAnswered: false, onSelect: jest.fn(), onNext: jest.fn() }),
    );
    expect(listeners).toHaveLength(1);
    await unmount();
    expect(listeners).toHaveLength(0);
  });
});
