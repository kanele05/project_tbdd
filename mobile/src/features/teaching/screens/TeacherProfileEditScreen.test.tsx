import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { showToast } from '@/components/ui/Toast';
import { renderWithClient } from '@/features/search/testUtils';
import { AppError } from '@/lib/appError';
import { useAuthStore } from '@/stores/authStore';
import type { TeacherProfileDto } from '@/types/api';

import { teachingApi } from '../api';
import { TeacherProfileEditScreen, toProfileInput } from './TeacherProfileEditScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: () => mockBack(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/components/ui/Toast', () => ({
  ...jest.requireActual('@/components/ui/Toast'),
  showToast: jest.fn(),
}));
jest.mock('../api', () => ({ teachingApi: { profile: jest.fn(), updateProfile: jest.fn() } }));

const mockProfile = teachingApi.profile as jest.Mock;
const mockUpdate = teachingApi.updateProfile as jest.Mock;

const PROFILE: TeacherProfileDto = {
  id: 't1',
  jobTitle: 'Designer',
  bio: 'I teach design.',
  organization: 'Acme',
  location: null,
  timezone: 'Asia/Ho_Chi_Minh',
};

describe('toProfileInput', () => {
  it('trims and turns empty optional fields into null', () => {
    expect(
      toProfileInput({
        jobTitle: ' Lead ',
        bio: '',
        organization: ' ',
        location: 'Hanoi',
        timezone: '',
      }),
    ).toEqual({ jobTitle: 'Lead', bio: '', organization: null, location: 'Hanoi', timezone: null });
  });
});

describe('TeacherProfileEditScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'a@b.c',
        fullName: 'A',
        headline: null,
        avatarUrl: null,
        coverUrl: null,
        role: 'TEACHER',
      },
    });
    mockProfile.mockResolvedValue(PROFILE);
  });

  it('loads the profile into the form and keeps Save disabled until something changes', async () => {
    await renderWithClient(<TeacherProfileEditScreen />);

    expect(await screen.findByDisplayValue('Designer')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Acme')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Asia/Ho_Chi_Minh')).toBeOnTheScreen();
    expect(screen.getByTestId('teacher-profile-save')).toBeDisabled();
  });

  it('saves the changes with PATCH and goes back', async () => {
    mockUpdate.mockResolvedValue({ ...PROFILE, jobTitle: 'Lead designer', location: 'Hanoi' });
    await renderWithClient(<TeacherProfileEditScreen />);
    await screen.findByDisplayValue('Designer');

    await fireEvent.changeText(screen.getByTestId('teacher-job-title'), 'Lead designer');
    await fireEvent.press(screen.getByRole('button', { name: 'Europe/London' }));
    await fireEvent.press(screen.getByTestId('teacher-profile-save'));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        jobTitle: 'Lead designer',
        bio: 'I teach design.',
        organization: 'Acme',
        location: null,
        timezone: 'Europe/London',
      }),
    );
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith('Teacher profile updated', { type: 'success' });
  });

  it('rejects an empty job title and an unknown time zone', async () => {
    await renderWithClient(<TeacherProfileEditScreen />);
    await screen.findByDisplayValue('Designer');

    await fireEvent.changeText(screen.getByTestId('teacher-job-title'), '');
    await fireEvent.changeText(screen.getByTestId('teacher-timezone'), 'Mars/Olympus');
    await fireEvent.press(screen.getByTestId('teacher-profile-save'));

    expect(await screen.findByText('Enter your job title')).toBeOnTheScreen();
    expect(screen.getByText('Enter a valid time zone, e.g. Asia/Ho_Chi_Minh')).toBeOnTheScreen();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('shows the server error on the form when saving fails', async () => {
    mockUpdate.mockRejectedValue(new AppError({ status: 403, code: 'FORBIDDEN', message: 'no' }));
    await renderWithClient(<TeacherProfileEditScreen />);
    await screen.findByDisplayValue('Designer');

    await fireEvent.changeText(screen.getByTestId('teacher-job-title'), 'Other');
    await fireEvent.press(screen.getByTestId('teacher-profile-save'));

    expect(await screen.findByText("You don't have permission to do that.")).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('shows a skeleton while loading and an error with Retry when loading fails', async () => {
    mockProfile.mockReturnValueOnce(new Promise(() => undefined));
    const first = await renderWithClient(<TeacherProfileEditScreen />);
    expect(screen.getByTestId('teacher-profile-skeleton')).toBeOnTheScreen();
    first.unmount();

    mockProfile.mockRejectedValueOnce(
      new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom' }),
    );
    await renderWithClient(<TeacherProfileEditScreen />);
    expect(await screen.findByText("Couldn't load your teacher profile")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByDisplayValue('Designer')).toBeOnTheScreen();
  });
});
