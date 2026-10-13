import { renderHook, waitFor } from '@testing-library/react-native';

import { confirmAction } from '@/utils/confirmAction';

import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

type Handler = (event: { preventDefault: () => void; data: { action: object } }) => void;
let mockHandlers: Handler[] = [];
const mockDispatch = jest.fn();

jest.mock('expo-router', () => ({
  useNavigation: () => ({
    addListener: (_name: string, handler: Handler) => {
      mockHandlers.push(handler);
      return () => {
        mockHandlers = mockHandlers.filter((item) => item !== handler);
      };
    },
    // Like React Navigation, dispatching the action fires `beforeRemove` again.
    dispatch: (action: object) => {
      const preventDefault = jest.fn();
      mockHandlers.forEach((handler) => handler({ preventDefault, data: { action } }));
      if (!preventDefault.mock.calls.length) mockDispatch(action);
    },
  }),
}));

jest.mock('@/utils/confirmAction', () => ({ confirmAction: jest.fn() }));

const confirm = jest.mocked(confirmAction);
const ACTION = { type: 'GO_BACK' };

function leave() {
  const preventDefault = jest.fn();
  mockHandlers.forEach((handler) => handler({ preventDefault, data: { action: ACTION } }));
  return preventDefault;
}

describe('useUnsavedChangesGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandlers = [];
  });

  it('lets the screen go when nothing is dirty', async () => {
    await renderHook(() => useUnsavedChangesGuard(false));
    expect(leave()).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('blocks leaving, asks, and goes on only when the teacher discards', async () => {
    confirm.mockResolvedValue(false);
    await renderHook(() => useUnsavedChangesGuard(true));
    expect(leave()).toHaveBeenCalled();
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(mockDispatch).not.toHaveBeenCalled();

    confirm.mockResolvedValue(true);
    leave();
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(ACTION));
  });

  it('stops asking after allowLeave()', async () => {
    const { result } = await renderHook(() => useUnsavedChangesGuard(true));
    result.current.allowLeave();
    expect(leave()).not.toHaveBeenCalled();
  });

  it('asks only once when two guards of the same screen are dirty', async () => {
    confirm.mockResolvedValue(true);
    await renderHook(() => {
      useUnsavedChangesGuard(true);
      useUnsavedChangesGuard(true);
    });
    expect(leave()).toHaveBeenCalled();
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(ACTION));
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('keeps both guards when the teacher keeps editing', async () => {
    confirm.mockResolvedValue(false);
    await renderHook(() => {
      useUnsavedChangesGuard(true);
      useUnsavedChangesGuard(true);
    });
    leave();
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(leave()).toHaveBeenCalled());
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
