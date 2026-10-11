import { QueryClient } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { useWindowDimensions } from 'react-native';

import { showToast } from '@/components/ui/Toast';
import { queryClient as appQueryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { UserDto } from '@/types/api';

import { editProfileApi } from '../editProfileApi';
import { EditProfileScreen } from './EditProfileScreen';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), replace: jest.fn(), push: jest.fn(), canGoBack: () => true },
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 800, scale: 1, fontScale: 1 })),
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('@/components/ui/Toast', () => ({ showToast: jest.fn() }));
jest.mock('../editProfileApi', () => ({
  editProfileApi: { updateProfile: jest.fn(), uploadAvatar: jest.fn() },
}));

const api = jest.mocked(editProfileApi);
const picker = jest.mocked(ImagePicker.launchImageLibraryAsync);
const mockUseWindowDimensions = useWindowDimensions as jest.Mock;

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

function setWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 800, scale: 1, fontScale: 1 });
}

async function renderScreen() {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return renderWithProviders(<EditProfileScreen />, { client: queryClient });
}

describe('EditProfileScreen on a wide window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
    useAuthStore.setState({ user: USER, status: 'authenticated' });
  });

  afterEach(() => {
    queryClient.clear();
    appQueryClient.clear();
  });

  it('shows a centred card with the cover, the avatar picker and the form', async () => {
    await renderScreen();

    expect(screen.getByTestId('edit-profile-desktop')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Edit profile' })).toBeOnTheScreen();
    expect(screen.getByTestId('edit-profile-cover')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Change profile photo' })).toBeOnTheScreen();
    expect(
      screen.getByText('Click the photo to choose a PNG or JPG, up to 5 MB.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Full name').props.value).toBe('Rosie Smith');
    expect(screen.getByLabelText('Email').props.editable).toBe(false);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('goes back from the Back link', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('link', { name: 'Back' }));
    expect(mockBack).toHaveBeenCalled();
  });

  it('saves the changed fields and goes back', async () => {
    api.updateProfile.mockResolvedValue({ ...USER, fullName: 'Rosie Stone' });
    await renderScreen();

    await fireEvent.changeText(screen.getByLabelText('Full name'), 'Rosie Stone');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(api.updateProfile).toHaveBeenCalledWith({ fullName: 'Rosie Stone' });
    expect(showToast).toHaveBeenCalledWith('Profile updated', { type: 'success' });
  });

  it('previews a picked avatar and uploads it on Save', async () => {
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
    expect(useAuthStore.getState().user?.avatarUrl).toBe('https://cdn.example.com/u1.jpg');
  });

  it('keeps the phone layout below 768 wide', async () => {
    setWidth(390);
    await renderScreen();

    expect(screen.queryByTestId('edit-profile-desktop')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Full name')).toBeOnTheScreen();
  });
});
