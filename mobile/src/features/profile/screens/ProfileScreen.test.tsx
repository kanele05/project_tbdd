import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert, type AlertButton } from 'react-native';

import { makeCourse } from '@/components/course/courseFixtures';
import { showToast } from '@/components/ui/Toast';
import { makePage, renderWithClient } from '@/features/search/testUtils';
import { AppError } from '@/lib/appError';
import { useAuthStore } from '@/stores/authStore';
import { darkPalette } from '@/theme';

import { profileApi } from '../api';
import { ProfileScreen } from './ProfileScreen';

const mockToggleBookmark = jest.fn();
const mockLogout = jest.fn();

jest.mock('@shopify/flash-list', () => jest.requireActual('@/features/search/flashListMock'));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
}));
jest.mock('../api', () => ({ profileApi: { stats: jest.fn(), bookmarks: jest.fn() } }));
jest.mock('@/features/bookmark/hooks', () => ({
  useToggleBookmark: () => ({ toggleBookmark: mockToggleBookmark, isPending: false }),
}));
jest.mock('@/components/ui/Toast', () => ({
  ...jest.requireActual('@/components/ui/Toast'),
  showToast: jest.fn(),
}));

const mockStats = profileApi.stats as jest.Mock;
const mockBookmarks = profileApi.bookmarks as jest.Mock;
const mockPush = router.push as jest.Mock;
const mockNavigate = router.navigate as jest.Mock;
const mockShowToast = showToast as jest.Mock;

const SAVED = [
  makeCourse({ id: 's1', title: 'Product Design', isBookmarked: true }),
  makeCourse({ id: 's2', title: 'Website Design', isBookmarked: true }),
];

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      logout: mockLogout,
      user: {
        id: 'u1',
        email: 'rosie@example.com',
        fullName: 'Martha Rosie',
        headline: 'UX/UI Designer',
        avatarUrl: null,
        coverUrl: null,
        role: 'STUDENT',
      },
    });
    mockStats.mockResolvedValue({
      savedCount: 25,
      ongoingCount: 24,
      completedCount: 98,
      learningSec: 22800,
    });
    mockBookmarks.mockResolvedValue(makePage(SAVED));
  });

  it('shows the name, headline, stats and saved courses', async () => {
    await renderWithClient(<ProfileScreen />);

    expect(screen.getByText('Martha Rosie')).toBeOnTheScreen();
    expect(screen.getByText('UX/UI Designer')).toBeOnTheScreen();
    expect(await screen.findByText('25')).toBeOnTheScreen();
    expect(screen.getByText('24')).toBeOnTheScreen();
    expect(screen.getByText('98')).toBeOnTheScreen();
    expect(await screen.findByText('Product Design')).toBeOnTheScreen();
    expect(screen.getByText('Saved courses')).toBeOnTheScreen();
  });

  it('opens My Courses on the matching tab from On Going / Completed', async () => {
    await renderWithClient(<ProfileScreen />);
    await screen.findByText('24');

    await fireEvent.press(screen.getByRole('button', { name: 'On Going, 24' }));
    expect(mockNavigate).toHaveBeenLastCalledWith({
      pathname: '/my-courses',
      params: { tab: 'ongoing' },
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Completed, 98' }));
    expect(mockNavigate).toHaveBeenLastCalledWith({
      pathname: '/my-courses',
      params: { tab: 'completed' },
    });
  });

  it('un-saves a course with a toast whose Undo saves it again', async () => {
    await renderWithClient(<ProfileScreen />);
    await screen.findByText('Product Design');

    await fireEvent.press(screen.getAllByRole('button', { name: 'Remove from saved courses' })[0]!);

    expect(mockToggleBookmark).toHaveBeenLastCalledWith('s1', true, SAVED[0]);
    expect(mockShowToast).toHaveBeenCalledWith(
      'Removed from saved courses',
      expect.objectContaining({ actionLabel: 'Undo' }),
    );

    const options = mockShowToast.mock.calls[0]?.[1] as { onAction: () => void };
    options.onAction();
    expect(mockToggleBookmark).toHaveBeenLastCalledWith('s1', false, SAVED[0]);
  });

  it('shows an empty state when nothing is saved', async () => {
    mockBookmarks.mockResolvedValue(makePage([]));
    await renderWithClient(<ProfileScreen />);

    expect(await screen.findByText('No saved courses yet')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Explore courses' }));
    expect(mockNavigate).toHaveBeenCalledWith('/search');
  });

  it('shows an error with Retry when the saved list fails to load', async () => {
    mockBookmarks.mockRejectedValueOnce(
      new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom' }),
    );
    await renderWithClient(<ProfileScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Product Design')).toBeOnTheScreen();
  });

  it('opens Edit profile and Notifications from the menu', async () => {
    await renderWithClient(<ProfileScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'More options' }));
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Edit profile' }));
    expect(mockPush).toHaveBeenLastCalledWith('/profile/edit');
    expect(screen.queryByRole('menu')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'More options' }));
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Notifications' }));
    expect(mockPush).toHaveBeenLastCalledWith('/notifications');
  });

  it('offers the teacher shortcuts only to teachers', async () => {
    await renderWithClient(<ProfileScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'More options' }));
    expect(screen.queryByRole('menuitem', { name: 'Teacher profile' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('menuitem', { name: 'Teaching' })).not.toBeOnTheScreen();
  });

  it('opens the teacher profile editor and the Teaching tab from the menu of a teacher', async () => {
    const student = useAuthStore.getState().user;
    if (student) useAuthStore.setState({ user: { ...student, role: 'TEACHER' } });
    await renderWithClient(<ProfileScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'More options' }));
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Teacher profile' }));
    expect(mockPush).toHaveBeenLastCalledWith('/profile/teacher-edit');

    await fireEvent.press(screen.getByRole('button', { name: 'More options' }));
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Teaching' }));
    expect(mockNavigate).toHaveBeenLastCalledWith('/studio');
  });

  it('logs out only after the confirmation', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderWithClient(<ProfileScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'More options' }));
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Log out' }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(mockLogout).not.toHaveBeenCalled();
    const buttons = alertSpy.mock.calls[0]?.[2] as AlertButton[];
    buttons.find((button) => button.text === 'Log out')?.onPress?.();
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    alertSpy.mockRestore();
  });

  it('does not log out when the confirmation is cancelled', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderWithClient(<ProfileScreen />);

    await screen.findByText('Product Design');

    await fireEvent.press(screen.getByRole('button', { name: 'More options' }));
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Log out' }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    const buttons = alertSpy.mock.calls[0]?.[2] as AlertButton[];
    buttons.find((button) => button.text === 'Cancel')?.onPress?.();

    expect(mockLogout).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('shows the whole screen in Vietnamese', async () => {
    await renderWithClient(<ProfileScreen />, { language: 'vi' });

    expect(screen.getByText('Hồ sơ của tôi')).toBeOnTheScreen();
    expect(screen.getByText('Khóa học đã lưu')).toBeOnTheScreen();
    expect(await screen.findByRole('button', { name: 'Đang học, 24' })).toBeOnTheScreen();
    await screen.findByText('Product Design');
    expect(screen.getByRole('button', { name: 'Thêm tùy chọn' })).toBeOnTheScreen();
  });

  it('shows the Vietnamese empty state', async () => {
    mockBookmarks.mockResolvedValue(makePage([]));
    await renderWithClient(<ProfileScreen />, { language: 'vi' });

    expect(await screen.findByText('Chưa có khóa học nào được lưu')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Khám phá khóa học' })).toBeOnTheScreen();
  });

  it('draws on the dark palette in dark mode', async () => {
    await renderWithClient(<ProfileScreen />, { theme: 'dark' });
    await screen.findByText('Product Design');

    expect(screen.getByTestId('profile-screen')).toHaveStyle({
      backgroundColor: darkPalette.background,
    });
  });
});
