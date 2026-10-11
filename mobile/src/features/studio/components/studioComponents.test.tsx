import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from 'react-native';

import { useAuthStore } from '@/stores/authStore';
import { renderWithProviders } from '@/test/renderWithProviders';
import { darkPalette, lightPalette } from '@/theme';
import type { Role } from '@/types/api';

import { CoverPicker } from './CoverPicker';
import { StatusChip } from './StatusChip';
import { TeacherOnly } from './TeacherOnly';

const mockUpload = jest.fn();

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text: RNText } = jest.requireActual<typeof import('react-native')>('react-native');
    return <RNText>{`redirect:${href}`}</RNText>;
  },
}));
jest.mock('../hooks', () => ({
  useUploadCover: () => ({ mutateAsync: mockUpload, isPending: false }),
}));

const picker = jest.mocked(ImagePicker.launchImageLibraryAsync);

function signIn(role: Role | null) {
  useAuthStore.setState({
    user: role
      ? {
          id: 'u',
          email: 'a@b.c',
          fullName: 'A',
          headline: null,
          avatarUrl: null,
          coverUrl: null,
          role,
        }
      : null,
  });
}

describe('TeacherOnly', () => {
  afterEach(async () => {
    await act(async () => useAuthStore.setState({ user: null }));
  });

  it('shows its children to a teacher only', async () => {
    signIn('TEACHER');
    const teacher = await renderWithProviders(
      <TeacherOnly>
        <Text>studio</Text>
      </TeacherOnly>,
    );
    expect(screen.getByText('studio')).toBeOnTheScreen();
    teacher.unmount();

    for (const role of ['STUDENT', 'ADMIN', null] as const) {
      signIn(role);
      const view = await renderWithProviders(
        <TeacherOnly>
          <Text>studio</Text>
        </TeacherOnly>,
      );
      expect(screen.queryByText('studio')).not.toBeOnTheScreen();
      expect(screen.getByText('redirect:/')).toBeOnTheScreen();
      view.unmount();
    }
  });
});

describe('StatusChip', () => {
  it('uses a different fill for each course status, matching the palette in both themes', async () => {
    const view = await renderWithProviders(<StatusChip status="PUBLISHED" />, { theme: 'light' });
    expect(screen.getByTestId('status-chip-PUBLISHED')).toHaveStyle({
      backgroundColor: lightPalette.success,
    });
    view.unmount();

    const dark = await renderWithProviders(<StatusChip status="REJECTED" />, { theme: 'dark' });
    expect(screen.getByTestId('status-chip-REJECTED')).toHaveStyle({
      backgroundColor: darkPalette.danger,
    });
    dark.unmount();

    await renderWithProviders(<StatusChip status="PENDING_REVIEW" />);
    expect(screen.getByTestId('status-chip-PENDING_REVIEW')).toHaveStyle({
      backgroundColor: lightPalette.gold,
    });
  });

  it('names the status in the current language and also for a revision', async () => {
    const view = await renderWithProviders(<StatusChip status="ARCHIVED" />, { language: 'vi' });
    expect(screen.getByLabelText('Đã ẩn')).toBeOnTheScreen();
    view.unmount();

    await renderWithProviders(<StatusChip revision="OPEN" />);
    expect(screen.getByLabelText('Revision draft')).toBeOnTheScreen();
  });
});

describe('CoverPicker', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploads the picked image and reports the returned URL', async () => {
    const onChange = jest.fn();
    picker.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///cover.png', fileName: 'cover.png', mimeType: 'image/png', fileSize: 1000 },
      ],
    } as never);
    mockUpload.mockResolvedValue({ url: 'https://api/uploads/courses/cover.png' });
    await renderWithProviders(<CoverPicker value="" onChange={onChange} />);

    await fireEvent.press(screen.getByTestId('cover-picker'));

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith('https://api/uploads/courses/cover.png'),
    );
    expect(mockUpload).toHaveBeenCalledWith({
      uri: 'file:///cover.png',
      name: 'cover.png',
      type: 'image/png',
    });
  });

  it('rejects a file that is too large or not PNG / JPG before uploading', async () => {
    const onChange = jest.fn();
    picker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///big.png', mimeType: 'image/png', fileSize: 6 * 1024 * 1024 }],
    } as never);
    await renderWithProviders(<CoverPicker value="" onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('cover-picker'));
    await waitFor(() => expect(picker).toHaveBeenCalled());
    expect(mockUpload).not.toHaveBeenCalled();

    picker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.gif', mimeType: 'image/gif', fileSize: 10 }],
    } as never);
    await fireEvent.press(screen.getByTestId('cover-picker'));
    await waitFor(() => expect(picker).toHaveBeenCalledTimes(2));
    expect(mockUpload).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('is inert when disabled and shows the error text', async () => {
    await renderWithProviders(
      <CoverPicker value="" onChange={jest.fn()} disabled error="Needs a cover" />,
    );
    expect(screen.getByText('Needs a cover')).toBeOnTheScreen();
    expect(screen.getByTestId('cover-picker')).toBeDisabled();
    expect(screen.queryByText('Choose image')).not.toBeOnTheScreen();
  });
});
