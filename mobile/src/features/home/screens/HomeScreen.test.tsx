import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { makeCourse } from '@/components/course/courseFixtures';
import { aiApi } from '@/features/ai/api';
import { myCoursesApi } from '@/features/my-courses/api';
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
// The wide layout imports the preview player (expo-video); it is never rendered on a phone.
jest.mock('@/features/course/components/PreviewPlayerModal', () => ({
  PreviewPlayerModal: () => null,
}));
jest.mock('../api', () => ({ homeApi: { get: jest.fn() } }));
jest.mock('@/features/ai/api', () => ({ aiApi: { recommendations: jest.fn() } }));
jest.mock('@/features/my-courses/api', () => ({ myCoursesApi: { list: jest.fn() } }));
jest.mock('@/features/bookmark/hooks', () => ({
  useToggleBookmark: () => ({ toggleBookmark: mockToggleBookmark, isPending: false }),
}));
jest.mock('@/features/cart/hooks', () => ({ useCartCount: () => 3 }));
jest.mock('@/features/notification/hooks', () => ({ useUnreadNotificationCount: () => 2 }));

const mockGet = homeApi.get as jest.Mock;
const mockRecommendations = aiApi.recommendations as jest.Mock;
const mockMyCourses = myCoursesApi.list as jest.Mock;
const mockPush = router.push as jest.Mock;
const mockNavigate = router.navigate as jest.Mock;

const SIGNED_IN_USER = {
  id: 'u1',
  email: 'rosie@example.com',
  fullName: 'Martha Rosie',
  headline: null,
  avatarUrl: null,
  coverUrl: null,
  role: 'STUDENT' as const,
};

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: SIGNED_IN_USER });
    mockMyCourses.mockResolvedValue([]);
    mockRecommendations.mockResolvedValue({
      lang: 'en',
      encouragement: '',
      items: [],
      model: 'mock-ai-1',
      generatedAt: '2026-10-04T00:00:00Z',
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

  it('greets in Vietnamese when the app language is Vietnamese', async () => {
    mockGet.mockResolvedValue(makeHome());
    await renderWithClient(<HomeScreen />, { language: 'vi' });

    expect(screen.getByText('Xin chào, Rosie!')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mở giỏ hàng, 3 khóa học' })).toBeOnTheScreen();
    expect(await screen.findByText('Khóa học phổ biến')).toBeOnTheScreen();
  });

  it('renders the hero and every section from a single GET /home request', async () => {
    mockGet.mockResolvedValue(makeHome());
    await renderWithClient(<HomeScreen />);

    expect(await screen.findByText('Popular courses')).toBeOnTheScreen();
    expect(screen.getByText('Project management')).toBeOnTheScreen();
    expect(screen.getByText('20% OFF')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Design, 9 courses' })).toBeOnTheScreen();
    expect(screen.getByText('Recommended for you')).toBeOnTheScreen();
    expect(screen.getByText('Course that inspires')).toBeOnTheScreen();
    expect(screen.getByText('Top teachers')).toBeOnTheScreen();
    expect(screen.getByText('PHP in One Click')).toBeOnTheScreen();
    expect(screen.getByText('Digital Portrait')).toBeOnTheScreen();
    expect(screen.getByText('Christian Hayes')).toBeOnTheScreen();
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('uses the most popular course as the hero when there is no banner', async () => {
    mockGet.mockResolvedValue(makeHome({ banners: [] }));
    await renderWithClient(<HomeScreen />);

    await fireEvent.press(
      await screen.findByRole('button', { name: 'View course, PHP in One Click' }),
    );

    expect(mockPush).toHaveBeenLastCalledWith('/course/pop-1');
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

    await fireEvent.press(screen.getByRole('button', { name: 'All topics' }));
    expect(mockNavigate).toHaveBeenCalledWith('/search');

    await fireEvent.press(screen.getByRole('button', { name: /^Design,/ }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/course-list',
      params: { categoryId: 'cat_design', title: 'Design' },
    });

    await fireEvent.press(screen.getByRole('button', { name: /Join now/ }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/course-list',
      params: { categoryId: 'cat_business' },
    });

    await fireEvent.press(screen.getByRole('button', { name: /^Christian Hayes/ }));
    expect(mockPush).toHaveBeenLastCalledWith('/teacher/tch_1');

    await fireEvent.press(screen.getByRole('button', { name: 'Open cart, 3 items' }));
    expect(mockPush).toHaveBeenLastCalledWith('/cart');
    await fireEvent.press(screen.getByRole('button', { name: 'Open notifications, 2 unread' }));
    expect(mockPush).toHaveBeenLastCalledWith('/notifications');
  });

  it('opens a course and toggles its bookmark with the current state', async () => {
    mockGet.mockResolvedValue(makeHome());
    await renderWithClient(<HomeScreen />);
    await screen.findByText('Website Design');

    await fireEvent.press(screen.getAllByRole('button', { name: 'Save course' })[0]!);
    expect(mockToggleBookmark).toHaveBeenCalledTimes(1);
    expect(mockToggleBookmark.mock.calls[0]?.slice(0, 2)).toEqual(['rec-1', false]);

    await fireEvent.press(screen.getByText('Website Design'));
    expect(mockPush).toHaveBeenLastCalledWith('/course/rec-1');
  });

  it('opens a ranked popular course', async () => {
    mockGet.mockResolvedValue(makeHome());
    await renderWithClient(<HomeScreen />);

    await fireEvent.press(
      await screen.findByRole('button', { name: /^Number 1: PHP in One Click/ }),
    );

    expect(mockPush).toHaveBeenLastCalledWith('/course/pop-1');
  });

  it('shows the courses in progress and resumes the last lesson', async () => {
    mockGet.mockResolvedValue(makeHome());
    mockMyCourses.mockResolvedValue([
      {
        course: { id: 'c-7', title: 'UX Foundation', thumbnailUrl: 'https://example.com/ux.png' },
        totalDurationSec: 600,
        progressPercent: 30,
        lastLessonId: 'les-4',
        lastAccessedAt: '2026-10-04T00:00:00Z',
      },
      {
        course: { id: 'c-8', title: 'Finished Course', thumbnailUrl: 'https://example.com/f.png' },
        totalDurationSec: 600,
        progressPercent: 100,
        lastLessonId: null,
        lastAccessedAt: '2026-10-03T00:00:00Z',
      },
    ]);
    await renderWithClient(<HomeScreen />);

    expect(await screen.findByText('Continue learning')).toBeOnTheScreen();
    expect(screen.getByText('30% done · 7 mins left')).toBeOnTheScreen();
    expect(screen.queryByText('Finished Course')).not.toBeOnTheScreen();
    expect(mockMyCourses).toHaveBeenCalledWith('ongoing');

    await fireEvent.press(screen.getByRole('button', { name: /^Continue UX Foundation/ }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/learn/[courseId]',
      params: { courseId: 'c-7', lessonId: 'les-4' },
    });
  });

  it('hides "Continue learning" when nothing is in progress', async () => {
    mockGet.mockResolvedValue(makeHome());
    await renderWithClient(<HomeScreen />);

    expect(await screen.findByText('Popular courses')).toBeOnTheScreen();
    expect(screen.queryByText('Continue learning')).not.toBeOnTheScreen();
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

  it('renders in dark mode', async () => {
    mockGet.mockResolvedValue(
      makeHome({ popular: [makeCourse({ id: 'pop-1', title: 'PHP in One Click' })] }),
    );
    await renderWithClient(<HomeScreen />, { theme: 'dark' });

    expect(await screen.findByText('PHP in One Click')).toBeOnTheScreen();
  });
});
