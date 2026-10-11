import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { makeCourse } from '@/components/course/courseFixtures';
import { showToast } from '@/components/ui/Toast';
import { makePage, renderWithClient } from '@/features/search/testUtils';
import { AppError } from '@/lib/appError';
import { useAuthStore } from '@/stores/authStore';
import type { Role } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { profileApi } from '../api';
import { ProfileScreen } from './ProfileScreen';

const mockToggleBookmark = jest.fn();
const mockLogout = jest.fn();

jest.mock('@shopify/flash-list', () => jest.requireActual('@/features/search/flashListMock'));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 800, scale: 1, fontScale: 1 })),
}));
jest.mock('../api', () => ({ profileApi: { stats: jest.fn(), bookmarks: jest.fn() } }));
jest.mock('@/features/bookmark/hooks', () => ({
  useToggleBookmark: () => ({ toggleBookmark: mockToggleBookmark, isPending: false }),
}));
jest.mock('@/components/ui/Toast', () => ({
  ...jest.requireActual('@/components/ui/Toast'),
  showToast: jest.fn(),
}));
jest.mock('@/utils/confirmAction', () => ({ confirmAction: jest.fn() }));

const mockStats = profileApi.stats as jest.Mock;
const mockBookmarks = profileApi.bookmarks as jest.Mock;
const mockPush = router.push as jest.Mock;
const mockNavigate = router.navigate as jest.Mock;
const mockShowToast = showToast as jest.Mock;
const mockConfirm = confirmAction as jest.Mock;
const mockUseWindowDimensions = useWindowDimensions as jest.Mock;

const SAVED = [
  makeCourse({ id: 's1', title: 'Product Design', isBookmarked: true }),
  makeCourse({ id: 's2', title: 'Website Design', isBookmarked: true }),
];

function setWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 800, scale: 1, fontScale: 1 });
}

function signIn(role: Role) {
  useAuthStore.setState({
    logout: mockLogout,
    user: {
      id: 'u1',
      email: 'rosie@example.com',
      fullName: 'Martha Rosie',
      headline: 'UX/UI Designer',
      avatarUrl: null,
      coverUrl: null,
      role,
    },
  });
}

describe('ProfileScreen on a wide window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
    signIn('STUDENT');
    mockStats.mockResolvedValue({ savedCount: 25, ongoingCount: 24, completedCount: 98 });
    mockBookmarks.mockResolvedValue(makePage(SAVED));
  });

  it('shows the header band with name, headline and the three counters', async () => {
    await renderWithClient(<ProfileScreen />);

    expect(screen.getByTestId('profile-band')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Martha Rosie' })).toBeOnTheScreen();
    expect(screen.getByText('UX/UI Designer')).toBeOnTheScreen();
    expect(await screen.findByText('25')).toBeOnTheScreen();
    expect(screen.getByText('24')).toBeOnTheScreen();
    expect(screen.getByText('98')).toBeOnTheScreen();
    expect(screen.getByTestId('profile-columns')).toBeOnTheScreen();
  });

  it('opens My Courses from the On Going and Completed counters', async () => {
    await renderWithClient(<ProfileScreen />);
    await screen.findByText('24');

    await fireEvent.press(screen.getByTestId('profile-stat-ongoing'));
    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/my-courses',
      params: { tab: 'ongoing' },
    });

    await fireEvent.press(screen.getByTestId('profile-stat-completed'));
    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/my-courses',
      params: { tab: 'completed' },
    });
  });

  it('lists the saved courses in a grid', async () => {
    await renderWithClient(<ProfileScreen />);

    expect(await screen.findByText('Product Design')).toBeOnTheScreen();
    expect(screen.getByText('Website Design')).toBeOnTheScreen();
    expect(screen.getByTestId('profile-saved-grid')).toBeOnTheScreen();
  });

  it('un-saves a course with an Undo toast', async () => {
    await renderWithClient(<ProfileScreen />);
    await fireEvent(await screen.findByText('Product Design'), 'pointerEnter');

    await fireEvent.press(screen.getAllByRole('button', { name: 'Remove from saved courses' })[0]!);

    expect(mockToggleBookmark).toHaveBeenCalledWith('s1', true, SAVED[0]);
    expect(mockShowToast).toHaveBeenCalledWith(
      'Removed from saved courses',
      expect.objectContaining({ actionLabel: 'Undo' }),
    );
  });

  it('shows the empty state with Explore courses', async () => {
    mockBookmarks.mockResolvedValue(makePage([]));
    await renderWithClient(<ProfileScreen />);

    expect(await screen.findByText('No saved courses yet')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Explore courses' }));
    expect(mockNavigate).toHaveBeenCalledWith('/search');
  });

  it('shows an error with Retry when the saved list fails', async () => {
    mockBookmarks.mockRejectedValueOnce(
      new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'x' }),
    );
    await renderWithClient(<ProfileScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(mockBookmarks).toHaveBeenCalledTimes(2));
  });

  it('has the account links for a student', async () => {
    await renderWithClient(<ProfileScreen />);

    await fireEvent.press(screen.getByTestId('profile-link-edit'));
    expect(mockPush).toHaveBeenCalledWith('/profile/edit');
    await fireEvent.press(screen.getByTestId('profile-link-notifications'));
    expect(mockPush).toHaveBeenCalledWith('/notifications');
    await fireEvent.press(screen.getByTestId('profile-link-settings'));
    expect(mockPush).toHaveBeenCalledWith('/settings');

    expect(screen.queryByTestId('profile-link-teacher-profile')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('profile-link-teaching')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('profile-link-admin')).not.toBeOnTheScreen();
  });

  it('adds the teacher shortcuts for a teacher', async () => {
    signIn('TEACHER');
    await renderWithClient(<ProfileScreen />);

    await fireEvent.press(screen.getByTestId('profile-link-teacher-profile'));
    expect(mockPush).toHaveBeenCalledWith('/profile/teacher-edit');
    await fireEvent.press(screen.getByTestId('profile-link-teaching'));
    expect(mockNavigate).toHaveBeenCalledWith('/studio');
  });

  it('adds the admin shortcut for an admin', async () => {
    signIn('ADMIN');
    await renderWithClient(<ProfileScreen />);

    await fireEvent.press(screen.getByTestId('profile-link-admin'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
    expect(screen.queryByTestId('profile-link-teaching')).not.toBeOnTheScreen();
  });

  it('logs out only after the confirmation', async () => {
    mockConfirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await renderWithClient(<ProfileScreen />);

    await fireEvent.press(screen.getByTestId('profile-link-logout'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    expect(mockLogout).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('profile-link-logout'));
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
  });

  it('keeps the phone layout below 768 wide', async () => {
    setWidth(390);
    await renderWithClient(<ProfileScreen />);

    expect(await screen.findByText('Product Design')).toBeOnTheScreen();
    expect(screen.queryByTestId('profile-columns')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'More options' })).toBeOnTheScreen();
  });
});
