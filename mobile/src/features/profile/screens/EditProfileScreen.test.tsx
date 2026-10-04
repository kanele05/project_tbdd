import { QueryClient } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { showToast } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import { useAuthStore } from '@/stores/authStore';
import { renderWithProviders, type ProviderOptions } from '@/test/renderWithProviders';
import type { UserDto } from '@/types/api';

import { editProfileApi } from '../editProfileApi';
import { EditProfileScreen } from './EditProfileScreen';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), replace: jest.fn(), push: jest.fn(), canGoBack: () => true },
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('@/components/ui/Toast', () => ({ showToast: jest.fn() }));
jest.mock('../editProfileApi', () => ({
  editProfileApi: { updateProfile: jest.fn(), uploadAvatar: jest.fn() },
}));

const api = jest.mocked(editProfileApi);
const picker = jest.mocked(ImagePicker.launchImageLibraryAsync);

const USER: UserDto = {
  id: 'u1',
  email: 'rosie@example.com',
  fullName: 'Rosie Smith',
  headline: 'Designer',
  avatarUrl: null,
  coverUrl: null,
  role: 'STUDENT',
};

let queryClient: QueryClient;

async function renderScreen(options: Pick<ProviderOptions, 'theme' | 'language'> = {}) {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return renderWithProviders(<EditProfileScreen />, { ...options, client: queryClient });
}

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: USER, status: 'authenticated' });
  });

  afterEach(() => queryClient.clear());

  it('shows the current profile with a read-only email and Save disabled until a change', async () => {
    await renderScreen();

    expect(screen.getByLabelText('Full name').props.value).toBe('Rosie Smith');
    expect(screen.getByLabelText('Headline').props.value).toBe('Designer');
    expect(screen.getByLabelText('Email').props.value).toBe('rosie@example.com');
    expect(screen.getByLabelText('Email').props.editable).toBe(false);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('validates the full name before saving', async () => {
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Full name'), 'R');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Full name must be at least 2 characters')).toBeOnTheScreen();
    expect(api.updateProfile).not.toHaveBeenCalled();
  });

  it('saves the changed fields, updates the auth store and goes back', async () => {
    api.updateProfile.mockResolvedValue({ ...USER, fullName: 'Rosie Stone', headline: 'Designer' });
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Full name'), 'Rosie Stone');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(api.updateProfile).toHaveBeenCalledWith({ fullName: 'Rosie Stone' });
    expect(api.uploadAvatar).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user?.fullName).toBe('Rosie Stone');
    expect(showToast).toHaveBeenCalledWith('Profile updated', { type: 'success' });
  });

  it('shows the server error and stays on the screen when saving fails', async () => {
    api.updateProfile.mockRejectedValue(
      new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom' }),
    );
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Headline'), 'Teacher');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByTestId('form-error')).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user?.headline).toBe('Designer');
  });

  it('uploads a picked avatar on Save and stores the returned URL', async () => {
    picker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///cache/crop.jpg',
          width: 400,
          height: 400,
          fileName: 'crop.jpg',
          mimeType: 'image/jpeg',
          fileSize: 120_000,
        },
      ],
    });
    api.uploadAvatar.mockResolvedValue({ avatarUrl: 'https://cdn.example.com/u1.jpg' });
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Change profile photo' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(api.uploadAvatar).toHaveBeenCalledWith(
      { uri: 'file:///cache/crop.jpg', name: 'crop.jpg', type: 'image/jpeg' },
      expect.any(Function),
    );
    expect(api.updateProfile).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user?.avatarUrl).toBe('https://cdn.example.com/u1.jpg');
  });

  it('rejects a picked image over 5 MB with a toast', async () => {
    picker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///big.png',
          width: 1,
          height: 1,
          mimeType: 'image/png',
          fileSize: 6 * 1024 * 1024,
        },
      ],
    });
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Change profile photo' }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Image is too large (max 5 MB).', { type: 'error' }),
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('shows the form and its validation errors in Vietnamese', async () => {
    await renderScreen({ language: 'vi' });

    expect(screen.getByText('Chỉnh sửa hồ sơ')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Đổi ảnh đại diện' })).toBeOnTheScreen();
    expect(screen.getByText('Không thể thay đổi email của bạn.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Họ và tên'), 'R');
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Họ và tên phải có ít nhất 2 ký tự')).toBeOnTheScreen();
  });
});
