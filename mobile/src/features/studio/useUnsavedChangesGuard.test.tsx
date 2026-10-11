import { renderHook, waitFor } from '@testing-library/react-native';

import { confirmAction } from '@/utils/confirmAction';

import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

type Handler = (event: { preventDefault: () => void; data: { action: object } }) => void;
let mockHandler: Handler | null = null;
const mockDispatch = jest.fn();

jest.mock('expo-router', () => ({
  useNavigation: () => ({
    addListener: (_name: string, handler: Handler) => {
      mockHandler = handler;
      return jest.fn();
    },
    dispatch: (...args: unknown[]) => mockDispatch(...args),
  }),
}));

jest.mock('@/utils/confirmAction', () => ({ confirmAction: jest.fn() }));

const confirm = jest.mocked(confirmAction);
const ACTION = { type: 'GO_BACK' };

function leave() {
  const preventDefault = jest.fn();
  mockHandler?.({ preventDefault, data: { action: ACTION } });
  return preventDefault;
}

describe('useUnsavedChangesGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandler = null;
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
});
