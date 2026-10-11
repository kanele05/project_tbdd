import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { makeCourse } from '@/components/course/courseFixtures';
import { useDesktopNavStore } from '@/components/layout/desktopLayout';
import { aiApi } from '@/features/ai/api';
import { courseApi } from '@/features/course/api';
import { myCoursesApi } from '@/features/my-courses/api';
import { makeHome, renderWithClient } from '@/features/search/testUtils';
import { useAuthStore } from '@/stores/authStore';
import type { CourseDetail } from '@/types/api';

import { homeApi } from '../api';
import { HomeScreen } from './HomeScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useIsFocused: () => true,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1440, height: 900, scale: 1, fontScale: 1 })),
}));
jest.mock('../api', () => ({ homeApi: { get: jest.fn() } }));
jest.mock('@/features/course/api', () => ({ courseApi: { detail: jest.fn() } }));
jest.mock('@/features/ai/api', () => ({ aiApi: { recommendations: jest.fn() } }));
jest.mock('@/features/my-courses/api', () => ({ myCoursesApi: { list: jest.fn() } }));
jest.mock('@/features/course/components/PreviewPlayerModal', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    PreviewPlayerModal: ({ lessonId }: { lessonId: string | null }) =>
      lessonId ? <Text>{`Previewing ${lessonId}`}</Text> : null,
  };
});
jest.mock('@/features/bookmark/hooks', () => ({
  useToggleBookmark: () => ({ toggleBookmark: jest.fn(), isPending: false }),
}));
jest.mock('@/features/cart/hooks', () => ({
  useCartCount: () => 0,
  useAddToCart: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('@/features/notification/hooks', () => ({ useUnreadNotificationCount: () => 0 }));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const mockGet = homeApi.get as jest.Mock;
const mockDetail = courseApi.detail as jest.Mock;
const mockMyCourses = myCoursesApi.list as jest.Mock;
const mockRecommendations = aiApi.recommendations as jest.Mock;
const mockPush = router.push as jest.Mock;

function setWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });
}

function makeDetail(overrides: Partial<CourseDetail> = {}): CourseDetail {
  return {
    ...makeCourse({ id: 'pop-1', title: 'PHP in One Click' }),
    status: 'PUBLISHED',
    subtitle: 'Build real sites with PHP',
    description: 'Long description',
    bannerUrl: null,
    benefits: [],
    likeCount: 0,
    shareCount: 0,
    isLiked: false,
    category: { id: 'cat_code', name: 'Code' },
    teacher: {
      id: 'teacher-1',
      fullName: 'Ramono Wultschner',
      avatarUrl: null,
      jobTitle: 'Engineer',
      isFollowed: false,
    },
    enrollment: null,
    isInCart: false,
    previewLessonId: 'les-prev',
    ...overrides,
  };
}

const COURSE_BANNER = {
  id: 'ban_1',
  title: 'PHP in One Click',
  subtitle: '20% OFF',
  ctaText: 'JOIN NOW',
  imageUrl: 'https://example.com/banner.png',
  bgColor: '#8353E2',
  target: { type: 'COURSE' as const, id: 'pop-1' },
};

describe('HomeScreen on a wide window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1440);
    useDesktopNavStore.getState().setTransparent(false);
    useAuthStore.setState({ user: null });
    mockMyCourses.mockResolvedValue([]);
    mockRecommendations.mockResolvedValue({ items: [], encouragement: '' });
    mockDetail.mockResolvedValue(makeDetail());
  });

  it('shows the billboard and the sections as rows, with the navigation transparent', async () => {
    mockGet.mockResolvedValue(makeHome({ banners: [COURSE_BANNER] }));
    await renderWithClient(<HomeScreen />);

    expect(await screen.findByTestId('home-billboard')).toBeOnTheScreen();
    expect(await screen.findByText('Popular courses')).toBeOnTheScreen();
    expect(screen.getByText('Recommended for you')).toBeOnTheScreen();
    expect(screen.getByText('Course that inspires')).toBeOnTheScreen();
    expect(screen.getByText('Top teachers')).toBeOnTheScreen();
    expect(screen.getByText('Website Design')).toBeOnTheScreen();
    expect(await screen.findByText('Build real sites with PHP')).toBeOnTheScreen();
    expect(useDesktopNavStore.getState().isTransparent).toBe(true);
  });

  it('previews the featured course and opens its details from the billboard', async () => {
    mockGet.mockResolvedValue(makeHome({ banners: [{ ...COURSE_BANNER, subtitle: null }] }));
    await renderWithClient(<HomeScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Preview PHP in One Click' }));
    expect(screen.getByText('Previewing les-prev')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Details of PHP in One Click' }));
    expect(mockPush).toHaveBeenLastCalledWith('/course/pop-1');
  });

  it('opens a category list from a category banner and offers no preview', async () => {
    mockGet.mockResolvedValue(makeHome());
    await renderWithClient(<HomeScreen />);

    await screen.findByTestId('home-billboard');
    expect(screen.queryByRole('button', { name: /^Preview/ })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Details of/ }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/course-list',
      params: { categoryId: 'cat_business' },
    });
  });

  it('turns the navigation solid once the page is scrolled and resets it when leaving', async () => {
    mockGet.mockResolvedValue(makeHome());
    const { unmount } = await renderWithClient(<HomeScreen />);
    await screen.findByTestId('home-billboard');
    expect(useDesktopNavStore.getState().isTransparent).toBe(true);

    await fireEvent.scroll(screen.getByTestId('home-scroll'), {
      nativeEvent: { contentOffset: { x: 0, y: 400 } },
    });
    expect(useDesktopNavStore.getState().isTransparent).toBe(false);

    await fireEvent.scroll(screen.getByTestId('home-scroll'), {
      nativeEvent: { contentOffset: { x: 0, y: 0 } },
    });
    expect(useDesktopNavStore.getState().isTransparent).toBe(true);

    await act(async () => unmount());
    expect(useDesktopNavStore.getState().isTransparent).toBe(false);
  });

  it('opens the course of a row card', async () => {
    mockGet.mockResolvedValue(makeHome());
    await renderWithClient(<HomeScreen />);
    const popular = await screen.findByTestId('row-popular');

    await fireEvent.press(within(popular).getByRole('button', { name: /^PHP in One Click, by/ }));
    expect(mockPush).toHaveBeenLastCalledWith('/course/pop-1');
  });

  it('resumes the last lesson from the continue row', async () => {
    mockGet.mockResolvedValue(makeHome());
    mockMyCourses.mockResolvedValue([
      {
        course: { id: 'c-7', title: 'UX Foundation', thumbnailUrl: 'https://example.com/ux.png' },
        totalDurationSec: 600,
        progressPercent: 30,
        lastLessonId: 'les-4',
        lastAccessedAt: '2026-10-04T00:00:00Z',
      },
    ]);
    await renderWithClient(<HomeScreen />);

    expect(await screen.findByText('Continue learning')).toBeOnTheScreen();
    await fireEvent.press(await screen.findByRole('button', { name: /^UX Foundation, 30%/ }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/learn/[courseId]',
      params: { courseId: 'c-7', lessonId: 'les-4' },
    });
  });

  it('shows the error state with a retry button and a solid navigation', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    await renderWithClient(<HomeScreen />);

    expect(await screen.findByRole('button', { name: 'Retry' })).toBeOnTheScreen();
    expect(useDesktopNavStore.getState().isTransparent).toBe(false);
  });

  it('keeps the phone layout (hero, no billboard) below 768 wide', async () => {
    setWidth(390);
    mockGet.mockResolvedValue(makeHome());
    await renderWithClient(<HomeScreen />);

    expect(await screen.findByText('Popular courses')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-billboard')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Join now/ })).toBeOnTheScreen();
    expect(useDesktopNavStore.getState().isTransparent).toBe(false);
  });
});
