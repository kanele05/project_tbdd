import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { makeHome, renderWithClient } from '@/features/search/testUtils';
import { AppError } from '@/lib/appError';
import { useAuthStore } from '@/stores/authStore';

import { homeApi } from '../api';
import { HomeScreen } from './HomeScreen';

const mockToggleBookmark = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useIsFocused: () => true,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('../api', () => ({ homeApi: { get: jest.fn() } }));
jest.mock('@/features/bookmark/hooks', () => ({
  useToggleBookmark: () => ({ toggleBookmark: mockToggleBookmark, isPending: false }),
}));
jest.mock('@/features/cart/hooks', () => ({ useCartCount: () => 3 }));
jest.mock('@/features/notification/hooks', () => ({ useUnreadNotificationCount: () => 2 }));
jest.mock('@/features/teacher/components/TeacherCard', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    TeacherCard: ({ teacher, onPress }: { teacher: { fullName: string }; onPress: () => void }) => (
      <Pressable onPress={onPress} accessibilityRole="button">
        <Text>{teacher.fullName}</Text>
      </Pressable>
    ),
  };
});

const mockGet = homeApi.get as jest.Mock;
const mockPush = router.push as jest.Mock;
const mockNavigate = router.navigate as jest.Mock;

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'rosie@example.com',
        fullName: 'Martha Rosie',
        headline: null,
        avatarUrl: null,
        coverUrl: null,
        role: 'STUDENT',
      },
    });
  });

  it('greets the user with the last word of the full name and shows the badges', async () => {
    mockGet.mockResolvedValue(makeHome());
    await renderWithClient(<HomeScreen />);

    expect(screen.getByText('Hello, Rosie!')).toBeOnTheScreen();
    expect(screen.getByText('What do you want to learn today?')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open cart, 3 items' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open notifications, 2 unread' })).toBeOnTheScreen();
  });

  it('renders every section from a single GET /home request', async () => {
    mockGet.mockResolvedValue(makeHome());
    await renderWithClient(<HomeScreen />);

    expect(await screen.findByText('Popular courses')).toBeOnTheScreen();
    expect(screen.getByText('Categories')).toBeOnTheScreen();
    expect(screen.getByText('Recommended for you')).toBeOnTheScreen();
    expect(screen.getByText('Course that inspires')).toBeOnTheScreen();
    expect(screen.getByText('Top teachers')).toBeOnTheScreen();
    expect(screen.getByText('PHP in One Click')).toBeOnTheScreen();
    expect(screen.getByText('Christian Hayes')).toBeOnTheScreen();
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('hides a section when the server sends an empty list for it', async () => {
    mockGet.mockResolvedValue(makeHome({ inspires: [], topTeachers: [] }));
    await renderWithClient(<HomeScreen />);

    expect(await screen.findByText('Popular courses')).toBeOnTheScreen();
    expect(screen.queryByText('Course that inspires')).not.toBeOnTheScreen();
    expect(screen.queryByText('Top teachers')).not.toBeOnTheScreen();
  });

  it('navigates from View more, categories, banner, teacher and header icons', async () => {
    mockGet.mockResolvedValue(makeHome());
    await renderWithClient(<HomeScreen />);
    await screen.findByText('Popular courses');

    await fireEvent.press(screen.getByRole('link', { name: 'View more, Popular courses' }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/course-list',
      params: { section: 'popular' },
    });

    await fireEvent.press(screen.getByRole('link', { name: 'View more, Recommended for you' }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/course-list',
      params: { section: 'recommended' },
    });

    await fireEvent.press(screen.getByRole('link', { name: 'View more, Course that inspires' }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/course-list',
      params: { section: 'inspires' },
    });

    await fireEvent.press(screen.getByRole('link', { name: 'View more, Top teachers' }));
    expect(mockPush).toHaveBeenLastCalledWith('/teachers');

    await fireEvent.press(screen.getByRole('link', { name: 'View more, Categories' }));
    expect(mockNavigate).toHaveBeenCalledWith('/search');

    await fireEvent.press(screen.getByRole('button', { name: /^Design,/ }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/course-list',
      params: { categoryId: 'cat_design', title: 'Design' },
    });

    await fireEvent.press(screen.getByRole('button', { name: /JOIN NOW/ }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/course-list',
      params: { categoryId: 'cat_business' },
    });

    await fireEvent.press(screen.getByText('Christian Hayes'));
    expect(mockPush).toHaveBeenLastCalledWith('/teacher/tch_1');

    await fireEvent.press(screen.getByRole('button', { name: 'Open cart, 3 items' }));
    expect(mockPush).toHaveBeenLastCalledWith('/cart');
    await fireEvent.press(screen.getByRole('button', { name: 'Open notifications, 2 unread' }));
    expect(mockPush).toHaveBeenLastCalledWith('/notifications');
  });

  it('opens a course and toggles its bookmark with the current state', async () => {
    mockGet.mockResolvedValue(makeHome());
    await renderWithClient(<HomeScreen />);
    await screen.findByText('Popular courses');

    await fireEvent.press(screen.getAllByRole('button', { name: 'Save course' })[0]!);
    expect(mockToggleBookmark).toHaveBeenCalledTimes(1);
    expect(mockToggleBookmark.mock.calls[0]?.slice(0, 2)).toEqual(['pop-1', false]);

    await fireEvent.press(screen.getByText('PHP in One Click'));
    expect(mockPush).toHaveBeenLastCalledWith('/course/pop-1');
  });

  it('shows an error with Retry and loads again', async () => {
    mockGet.mockRejectedValueOnce(
      new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom' }),
    );
    mockGet.mockResolvedValue(makeHome());
    await renderWithClient(<HomeScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Popular courses')).toBeOnTheScreen();
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  });

  it('shows an empty state when the server has nothing to show', async () => {
    mockGet.mockResolvedValue(
      makeHome({
        banners: [],
        categories: [],
        popular: [],
        recommended: [],
        inspires: [],
        topTeachers: [],
      }),
    );
    await renderWithClient(<HomeScreen />);

    expect(await screen.findByText('No courses to show yet')).toBeOnTheScreen();
  });
});
