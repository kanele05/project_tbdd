import { act } from '@testing-library/react-native';

import { useAuthStore } from '@/stores/authStore';
import { renderHookWithProviders } from '@/test/renderWithProviders';
import { confirmAction } from '@/utils/confirmAction';

import { useConfirmLogout } from './useConfirmLogout';

jest.mock('@/utils/confirmAction', () => ({ confirmAction: jest.fn() }));

const mockConfirm = confirmAction as jest.Mock;
const mockLogout = jest.fn();

describe('useConfirmLogout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ logout: mockLogout });
  });

  it('asks in the current language and logs out only after the user confirmed', async () => {
    mockConfirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const { result } = await renderHookWithProviders(() => useConfirmLogout(), { language: 'vi' });

    await act(async () => result.current());
    expect(mockConfirm).toHaveBeenLastCalledWith({
      title: 'Đăng xuất',
      message: 'Bạn có chắc muốn đăng xuất không?',
      confirmLabel: 'Đăng xuất',
      cancelLabel: 'Hủy',
      isDestructive: true,
    });
    expect(mockLogout).not.toHaveBeenCalled();

    await act(async () => result.current());
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
