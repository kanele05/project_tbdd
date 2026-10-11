import { fireEvent, render, screen } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { useDesktopNavStore } from '@/components/layout/desktopLayout';
import { ToastProvider } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/authStore';
import type { CourseDetail } from '@/types/api';

import { CourseDetailScreen } from './CourseDetailScreen';

const mockPush = jest.fn();
const mockAddToCart = jest.fn();
let mockDetailState: Record<string, unknown> = {};
let mockSimilar: unknown[] = [];

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 800, scale: 1, fontScale: 1 })),
}));

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPush(href),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  },
  useFocusEffect: (callback: () => void) => {
    jest.requireActual('react').useEffect(() => callback(), [callback]);
  },
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@/features/media/YouTubePlayer', () => ({ YouTubePlayer: () => null }));
jest.mock('expo-video', () => ({
  useVideoPlayer: () => ({
    status: 'readyToPlay',
    playing: false,
    play: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  }),
  VideoView: () => null,
}));

jest.mock('../hooks', () => ({
  useCourseDetail: () => mockDetailState,
  useSimilarCourses: () => ({ data: mockSimilar, isPending: false, isError: false }),
  usePreviewLesson: () => ({ data: undefined, isPending: true, error: null, refetch: jest.fn() }),
  useEnrollFree: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock('@/features/cart/hooks', () => ({
  useAddToCart: () => ({ mutateAsync: mockAddToCart, isPending: false }),
}));
jest.mock('@/features/bookmark/hooks', () => ({
  useToggleBookmark: () => ({ toggleBookmark: jest.fn(), isPending: false }),
}));
jest.mock('@/features/teacher/hooks', () => ({
  useToggleFollow: () => ({ toggleFollow: jest.fn(), isPending: false }),
}));
jest.mock('@/features/teaching/hooks', () => ({ useIsCourseOwner: () => false }));
jest.mock('@/features/learning/hooks', () => ({
  useToggleCourseLike: () => ({ mutate: jest.fn() }),
}));
jest.mock('../useShareCourse', () => ({ useShareCourse: () => jest.fn() }));
jest.mock('@/features/ai/hooks', () => ({
  useAiCourseSummary: () => ({ data: undefined, isError: false, isFetching: false }),
}));
jest.mock('@/features/learning/components/CourseLessonsTab', () => {
  const { Text } = jest.requireActual('react-native');
  return { CourseLessonsTab: () => <Text>LESSONS TAB</Text> };
});
jest.mock('@/features/review/components/CourseReviewsTab', () => {
  const { Text } = jest.requireActual('react-native');
  return { CourseReviewsTab: () => <Text>REVIEWS TAB</Text> };
});

const mockWindow = useWindowDimensions as jest.Mock;

function makeDetail(overrides: Partial<CourseDetail> = {}): CourseDetail {
  return {
    status: 'PUBLISHED',
    id: 'course-1',
    title: 'UX Foundation: Introduction to User Experience Design',
    thumbnailUrl: 'https://example.com/thumb.png',
    teacher: {
      id: 'teacher-1',
      fullName: 'Sara Weise',
      avatarUrl: null,
      jobTitle: 'UI/UX Designer',
      isFollowed: false,
    },
    priceCents: 5900,
    originalPriceCents: 7375,
    badge: 'DISCOUNT',
    discountPercent: 20,
    ratingAvg: 4.5,
    ratingCount: 1233,
    lessonCount: 12,
    totalDurationSec: 14 * 3600,
    isBookmarked: false,
    subtitle: 'Learn the basics of UX in a weekend.',
    description: 'Convallis in semper laoreet nibh.',
    bannerUrl: 'https://example.com/banner.png',
    benefits: ['Native teacher', '100% free document'],
    likeCount: 10,
    shareCount: 2,
    isLiked: false,
    category: { id: 'cat-1', name: 'Design' },
    enrollment: null,
    isInCart: false,
    previewLessonId: 'lesson-preview-1',
    ...overrides,
  };
}

function loaded(course: CourseDetail) {
  mockDetailState = {
    data: course,
    isPending: false,
    isError: false,
    error: null,
    fetchStatus: 'idle',
    refetch: jest.fn(),
  };
}

async function renderScreen() {
  return render(
    <ToastProvider>
      <CourseDetailScreen courseId="course-1" />
    </ToastProvider>,
  );
}

describe('CourseDetailScreen on a PC window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindow.mockReturnValue({ width: 1280, height: 800, scale: 1, fontScale: 1 });
    mockSimilar = [];
    useDesktopNavStore.getState().setTransparent(false);
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'rosie@example.com',
        fullName: 'Rosie',
        headline: null,
        avatarUrl: null,
        coverUrl: null,
        role: 'STUDENT',
      },
      status: 'authenticated',
    });
  });

  it('shows the full-bleed hero, the two columns and the purchase card instead of the bottom bar', async () => {
    loaded(makeDetail());
    await renderScreen();

    expect(screen.getByTestId('course-hero')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: /UX Foundation/ })).toBeOnTheScreen();
    expect(screen.getByText('Learn the basics of UX in a weekend.')).toBeOnTheScreen();
    expect(screen.getByTestId('course-columns')).toBeOnTheScreen();
    expect(screen.getByTestId('course-purchase-card')).toBeOnTheScreen();
    expect(screen.queryByTestId('course-bottom-bar')).not.toBeOnTheScreen();
  });

  it('puts the BR-17 action in the hero and the card, and runs it', async () => {
    loaded(makeDetail());
    await renderScreen();

    expect(screen.getByTestId('course-hero-action')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('course-action-button'));

    expect(mockAddToCart).toHaveBeenCalledWith('course-1');
  });

  it('continues learning when the user is enrolled', async () => {
    loaded(makeDetail({ enrollment: { progressPercent: 40, lastLessonId: null } }));
    await renderScreen();

    expect(screen.getByText('40% complete')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('course-hero-action'));

    expect(mockPush).toHaveBeenCalledWith('/learn/course-1');
  });

  it('opens the preview from the hero and from the card', async () => {
    loaded(makeDetail());
    await renderScreen();

    await fireEvent.press(screen.getByTestId('course-hero-preview'));
    expect(screen.getByTestId('preview-close')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('preview-close'));

    await fireEvent.press(screen.getByTestId('course-card-preview'));
    expect(screen.getByTestId('preview-close')).toBeOnTheScreen();
  });

  it('hides both preview buttons when the course has no preview lesson', async () => {
    loaded(makeDetail({ previewLessonId: null }));
    await renderScreen();

    expect(screen.queryByTestId('course-hero-preview')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('course-card-preview')).not.toBeOnTheScreen();
  });

  it('switches the tab column to Lessons', async () => {
    loaded(makeDetail());
    await renderScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Lessons' }));

    expect(screen.getByText('LESSONS TAB')).toBeOnTheScreen();
  });

  it('makes the nav transparent on the hero and solid once the page scrolls', async () => {
    loaded(makeDetail());
    const { unmount } = await renderScreen();
    expect(useDesktopNavStore.getState().isTransparent).toBe(true);

    await fireEvent.scroll(screen.getByTestId('course-desktop-scroll'), {
      nativeEvent: { contentOffset: { y: 300 } },
    });
    expect(useDesktopNavStore.getState().isTransparent).toBe(false);

    await fireEvent.scroll(screen.getByTestId('course-desktop-scroll'), {
      nativeEvent: { contentOffset: { y: 0 } },
    });
    expect(useDesktopNavStore.getState().isTransparent).toBe(true);

    await unmount();
    expect(useDesktopNavStore.getState().isTransparent).toBe(false);
  });

  it('shows the PC skeleton while the course loads', async () => {
    mockDetailState = { data: undefined, isPending: true, isError: false, fetchStatus: 'fetching' };
    await renderScreen();

    expect(screen.getByTestId('course-detail-skeleton')).toBeOnTheScreen();
    expect(screen.queryByTestId('course-purchase-card')).not.toBeOnTheScreen();
  });

  it('hides the similar-courses row when there are none', async () => {
    loaded(makeDetail());
    await renderScreen();

    expect(screen.queryByTestId('similar-courses-row')).not.toBeOnTheScreen();
  });
});

describe('CourseDetailScreen on a phone window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindow.mockReturnValue({ width: 390, height: 844, scale: 1, fontScale: 1 });
    mockSimilar = [];
    useDesktopNavStore.getState().setTransparent(false);
    useAuthStore.setState({ user: null, status: 'unauthenticated' });
  });

  it('keeps the bottom bar and does not render the PC purchase card', async () => {
    loaded(makeDetail());
    await renderScreen();

    expect(screen.getByTestId('course-bottom-bar')).toBeOnTheScreen();
    expect(screen.queryByTestId('course-purchase-card')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('course-columns')).not.toBeOnTheScreen();
    expect(useDesktopNavStore.getState().isTransparent).toBe(false);
  });
});
