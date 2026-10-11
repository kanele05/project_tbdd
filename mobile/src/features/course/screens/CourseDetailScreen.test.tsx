import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui/Toast';
import { AppError } from '@/lib/appError';
import { useAuthStore } from '@/stores/authStore';
import type { CourseDetail } from '@/types/api';

import { CourseDetailScreen } from './CourseDetailScreen';

const mockPush = jest.fn();
const mockToggleBookmark = jest.fn();
const mockToggleFollow = jest.fn();
const mockToggleLike = jest.fn();
const mockShare = jest.fn();
const mockAiSummary = jest.fn();
const mockAddToCart = jest.fn();
const mockEnroll = jest.fn();
const mockRefetch = jest.fn();
let mockDetailState: Record<string, unknown> = {};
let mockPreviewState: Record<string, unknown> = {};
let mockIsOwner = false;

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPush(href),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
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
  useSimilarCourses: () => ({ data: [], isPending: false, isError: false, refetch: jest.fn() }),
  usePreviewLesson: () => mockPreviewState,
  useEnrollFree: () => ({ mutateAsync: mockEnroll, isPending: false }),
}));

jest.mock('@/features/cart/hooks', () => ({
  useAddToCart: () => ({ mutateAsync: mockAddToCart, isPending: false }),
}));

jest.mock('@/features/bookmark/hooks', () => ({
  useToggleBookmark: () => ({ toggleBookmark: mockToggleBookmark, isPending: false }),
}));

jest.mock('@/features/teacher/hooks', () => ({
  useToggleFollow: () => ({ toggleFollow: mockToggleFollow, isPending: false }),
}));

jest.mock('@/features/teaching/hooks', () => ({
  useIsCourseOwner: () => mockIsOwner,
}));

jest.mock('@/features/learning/hooks', () => ({
  useToggleCourseLike: () => ({ mutate: mockToggleLike }),
}));

jest.mock('../useShareCourse', () => ({
  useShareCourse: () => mockShare,
}));

jest.mock('@/features/ai/hooks', () => ({
  useAiCourseSummary: (courseId: string, isEnabled: boolean) => mockAiSummary(courseId, isEnabled),
}));

jest.mock('@/features/learning/components/CourseLessonsTab', () => {
  const { Text, Pressable } = jest.requireActual('react-native');
  return {
    CourseLessonsTab: ({
      courseId,
      onPlayPreview,
    }: {
      courseId: string;
      onPlayPreview?: (id: string) => void;
    }) => (
      <Pressable onPress={() => onPlayPreview?.('lesson-preview-2')}>
        <Text>{`LESSONS TAB ${courseId}`}</Text>
      </Pressable>
    ),
  };
});

jest.mock('@/features/review/components/CourseReviewsTab', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    CourseReviewsTab: ({
      courseId,
      canWriteReview,
    }: {
      courseId: string;
      canWriteReview: boolean;
    }) => <Text>{`REVIEWS TAB ${courseId} write=${String(canWriteReview)}`}</Text>,
  };
});

const SIGNED_IN_USER = {
  id: 'u1',
  email: 'rosie@example.com',
  fullName: 'Rosie',
  headline: null,
  avatarUrl: null,
  coverUrl: null,
  role: 'STUDENT',
} as const;

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
    discountPercent: 80, // wrong on purpose: the screen must compute BR-10 itself (BR-18)
    ratingAvg: 4.5,
    ratingCount: 1233,
    lessonCount: 12,
    totalDurationSec: 14 * 3600,
    isBookmarked: false,
    subtitle: null,
    description: 'Convallis in semper laoreet nibh.',
    bannerUrl: 'https://example.com/banner.png',
    benefits: ['Native teacher', '100% free document', 'Certificate of complete'],
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
    refetch: mockRefetch,
  };
}

async function renderScreen() {
  return render(
    <ToastProvider>
      <CourseDetailScreen courseId="course-1" />
    </ToastProvider>,
  );
}

describe('CourseDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOwner = false;
    mockPreviewState = { data: undefined, isPending: true, error: null, refetch: jest.fn() };
    mockAiSummary.mockReturnValue({ data: undefined, isError: false, isFetching: false });
    useAuthStore.setState({ user: SIGNED_IN_USER, status: 'authenticated' });
  });

  describe('loading and error states', () => {
    it('shows a skeleton while the course loads', async () => {
      mockDetailState = {
        data: undefined,
        isPending: true,
        isError: false,
        fetchStatus: 'fetching',
      };
      await renderScreen();

      expect(screen.getByTestId('course-detail-skeleton')).toBeOnTheScreen();
      expect(screen.queryByTestId('course-action-button')).not.toBeOnTheScreen();
    });

    it('shows an error with Retry that refetches', async () => {
      mockDetailState = {
        data: undefined,
        isPending: false,
        isError: true,
        error: new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'x' }),
        fetchStatus: 'idle',
        refetch: mockRefetch,
      };
      await renderScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('content', () => {
    it('renders the hero title, rating, the facts and the three tabs', async () => {
      loaded(makeDetail());
      await renderScreen();

      expect(
        screen.getByText('UX Foundation: Introduction to User Experience Design'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Design')).toBeOnTheScreen();
      expect(screen.getByText('4.5')).toBeOnTheScreen();
      expect(screen.getByLabelText('12 lessons')).toBeOnTheScreen();
      expect(screen.getByLabelText('14 hours total length')).toBeOnTheScreen();
      expect(screen.getByLabelText('10 likes')).toBeOnTheScreen();
      expect(screen.getByRole('tab', { name: 'Overview' })).toBeSelected();
      expect(screen.getByRole('tab', { name: 'Lessons' })).toBeOnTheScreen();
      expect(screen.getByRole('tab', { name: 'Reviews' })).toBeOnTheScreen();
    });

    it('lists the teacher, computed video hours and no certificate in Overview', async () => {
      loaded(makeDetail());
      await renderScreen();

      expect(screen.getByText('Sara Weise')).toBeOnTheScreen();
      expect(screen.getByText('UI/UX Designer')).toBeOnTheScreen();
      expect(screen.getByText('14 hours on-demand video')).toBeOnTheScreen();
      expect(screen.getByText('Native teacher')).toBeOnTheScreen();
      expect(screen.queryByText(/certificate/i)).not.toBeOnTheScreen();
    });

    it('shows the price and a discount computed with BR-10, not the server value', async () => {
      loaded(makeDetail());
      await renderScreen();

      expect(screen.getByText('$59')).toBeOnTheScreen();
      expect(screen.getByText('20% Disc.')).toBeOnTheScreen();
      expect(screen.getByText('$73.75')).toBeOnTheScreen();
      expect(screen.queryByText('80% Disc.')).not.toBeOnTheScreen();
    });

    it('opens the teacher profile when the teacher row is pressed', async () => {
      loaded(makeDetail());
      await renderScreen();

      await fireEvent.press(screen.getByRole('button', { name: /Sara Weise.*Open profile/ }));
      expect(mockPush).toHaveBeenCalledWith('/teacher/teacher-1');
    });
  });

  describe('tabs', () => {
    it('renders the Lessons and Review tab components with the contract props', async () => {
      loaded(makeDetail({ enrollment: { progressPercent: 10, lastLessonId: null } }));
      await renderScreen();

      await fireEvent.press(screen.getByRole('tab', { name: 'Lessons' }));
      expect(screen.getByText('LESSONS TAB course-1')).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('tab', { name: 'Reviews' }));
      expect(screen.getByText('REVIEWS TAB course-1 write=true')).toBeOnTheScreen();
    });

    it('does not offer "Write a review" to users who are not enrolled', async () => {
      loaded(makeDetail());
      await renderScreen();

      await fireEvent.press(screen.getByRole('tab', { name: 'Reviews' }));
      expect(screen.getByText('REVIEWS TAB course-1 write=false')).toBeOnTheScreen();
    });
  });

  describe('bottom bar button (BR-17)', () => {
    it('adds a paid course to the cart and shows a toast', async () => {
      loaded(makeDetail());
      mockAddToCart.mockResolvedValue(undefined);
      await renderScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Add to cart' }));

      await waitFor(() => expect(mockAddToCart).toHaveBeenCalledWith('course-1'));
      expect(await screen.findByText('Added to cart')).toBeOnTheScreen();
    });

    it('shows the error toast when adding to the cart fails', async () => {
      loaded(makeDetail());
      mockAddToCart.mockRejectedValue(
        new AppError({ status: 409, code: 'ALREADY_IN_CART', message: 'dup' }),
      );
      await renderScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Add to cart' }));

      expect(await screen.findByText('This course is already in your cart.')).toBeOnTheScreen();
    });

    it('goes to the cart when the course is already in it', async () => {
      loaded(makeDetail({ isInCart: true }));
      await renderScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Go to cart' }));
      expect(mockPush).toHaveBeenCalledWith('/cart');
      expect(mockAddToCart).not.toHaveBeenCalled();
    });

    it('enrolls in a free course and then opens the learning screen', async () => {
      loaded(makeDetail({ priceCents: 0, originalPriceCents: null, badge: null }));
      mockEnroll.mockResolvedValue(undefined);
      await renderScreen();

      expect(screen.getByText('Free')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Enroll for free' }));

      await waitFor(() => expect(mockEnroll).toHaveBeenCalledWith('course-1'));
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/learn/course-1'));
    });

    it('does not open the learning screen when enrolling fails', async () => {
      loaded(makeDetail({ priceCents: 0 }));
      mockEnroll.mockRejectedValue(
        new AppError({ status: 500, code: 'INTERNAL_ERROR', message: 'x' }),
      );
      await renderScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Enroll for free' }));

      expect(await screen.findByText('Something went wrong. Please try again.')).toBeOnTheScreen();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('continues learning when enrolled and shows the progress instead of a price', async () => {
      loaded(makeDetail({ enrollment: { progressPercent: 30, lastLessonId: 'l1' } }));
      await renderScreen();

      expect(screen.getByText('30% complete')).toBeOnTheScreen();
      expect(screen.queryByText('$59')).not.toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Continue learning' }));
      expect(mockPush).toHaveBeenCalledWith('/learn/course-1');
    });

    it('lets the course teacher open or manage the course instead of buying it (BR-23)', async () => {
      mockIsOwner = true;
      loaded(makeDetail());
      await renderScreen();

      expect(screen.getByText('Your course')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Add to cart' })).not.toBeOnTheScreen();
      expect(screen.queryByText('$59')).not.toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Open course' }));
      expect(mockPush).toHaveBeenCalledWith('/learn/course-1');

      await fireEvent.press(screen.getByRole('button', { name: 'Manage this course' }));
      expect(mockPush).toHaveBeenLastCalledWith('/studio/course-1');
      expect(mockAddToCart).not.toHaveBeenCalled();
    });

    it('does not show the Manage button to students', async () => {
      loaded(makeDetail());
      await renderScreen();

      expect(screen.queryByTestId('course-manage-button')).not.toBeOnTheScreen();
    });
  });

  describe('header actions', () => {
    it('toggles the bookmark with the current state', async () => {
      loaded(makeDetail({ isBookmarked: true }));
      await renderScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Remove from saved courses' }));
      expect(mockToggleBookmark).toHaveBeenCalledWith('course-1', true);
    });

    it('toggles follow from the teacher row', async () => {
      loaded(
        makeDetail({
          teacher: {
            id: 'teacher-1',
            fullName: 'Sara Weise',
            avatarUrl: null,
            jobTitle: 'UI/UX Designer',
            isFollowed: true,
          },
        }),
      );
      await renderScreen();

      expect(screen.getByText('Following')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Unfollow Sara Weise' }));
      expect(mockToggleFollow).toHaveBeenCalledWith('teacher-1', true);
    });

    it('toggles the like with the current state', async () => {
      loaded(makeDetail({ isLiked: true }));
      await renderScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Remove your like' }));
      expect(mockToggleLike).toHaveBeenCalledWith(true);
    });

    it('opens the share sheet from the hero', async () => {
      loaded(makeDetail());
      await renderScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Share course' }));
      expect(mockShare).toHaveBeenCalledTimes(1);
    });
  });

  describe('AI summary (AI-03)', () => {
    it('asks for the summary only when the user taps the button', async () => {
      loaded(makeDetail());
      await renderScreen();

      expect(mockAiSummary).toHaveBeenLastCalledWith('course-1', false);
      await fireEvent.press(screen.getByRole('button', { name: 'Summarize with AI' }));

      expect(mockAiSummary).toHaveBeenLastCalledWith('course-1', true);
    });

    it('shows a loading state while the summary is generated', async () => {
      loaded(makeDetail());
      mockAiSummary.mockReturnValue({ data: undefined, isError: false, isFetching: true });
      await renderScreen();

      expect(screen.getByTestId('ai-summary-loading')).toBeOnTheScreen();
    });

    it('shows the friendly rate-limit message with Retry', async () => {
      loaded(makeDetail());
      const refetch = jest.fn();
      mockAiSummary.mockReturnValue({
        data: undefined,
        isError: true,
        isFetching: false,
        error: new AppError({
          status: 429,
          code: 'AI_RATE_LIMITED',
          message: 'x',
          details: { retryAfterSec: 12 },
        }),
        refetch,
      });
      await renderScreen();

      expect(
        screen.getByText('The AI assistant is busy right now. Please wait a moment and try again.'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Try again in 12 s.')).toBeOnTheScreen();
      await fireEvent.press(within(screen.getByTestId('ai-summary-error')).getByText('Retry'));
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('renders the summary sections with the "Generated by AI" label', async () => {
      loaded(makeDetail());
      mockAiSummary.mockReturnValue({
        data: {
          courseId: 'course-1',
          lang: 'en',
          overview: 'A short overview.',
          objectives: ['Learn the basics'],
          sections: [{ title: 'Introduction', summary: 'Meet the course.' }],
          targetAudience: ['Beginners'],
          outcomes: ['Ship a project'],
          model: 'mock-ai-1',
          generatedAt: '2026-10-04T00:00:00Z',
        },
        isError: false,
        isFetching: false,
      });
      await renderScreen();

      expect(screen.getByText('Generated by AI')).toBeOnTheScreen();
      expect(screen.getByText('A short overview.')).toBeOnTheScreen();
      expect(screen.getByText('Learn the basics')).toBeOnTheScreen();
      expect(screen.getByText('1. Introduction')).toBeOnTheScreen();
      expect(screen.getByText('Beginners')).toBeOnTheScreen();
      expect(screen.getByText('Ship a project')).toBeOnTheScreen();
    });

    it('requests the summary from the AI button of the bottom bar', async () => {
      loaded(makeDetail());
      await renderScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Summarize this course with AI' }));

      expect(mockAiSummary).toHaveBeenLastCalledWith('course-1', true);
    });

    it('hides every AI entry point when the user is signed out', async () => {
      useAuthStore.setState({ user: null, status: 'unauthenticated' });
      loaded(makeDetail());
      await renderScreen();

      expect(screen.queryByTestId('ai-summary-button')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('course-ai-button')).not.toBeOnTheScreen();
    });
  });

  describe('preview player', () => {
    it('opens the preview of the course when the hero play button is pressed', async () => {
      loaded(makeDetail());
      await renderScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Play course preview' }));

      expect(screen.getByTestId('preview-close')).toBeOnTheScreen();
    });

    it('plays the lesson chosen in the Lessons tab', async () => {
      loaded(makeDetail());
      await renderScreen();

      await fireEvent.press(screen.getByRole('tab', { name: 'Lessons' }));
      await fireEvent.press(screen.getByText('LESSONS TAB course-1'));

      expect(screen.getByTestId('preview-close')).toBeOnTheScreen();
    });

    it('hides the play button when the course has no preview lesson', async () => {
      loaded(makeDetail({ previewLessonId: null }));
      await renderScreen();

      expect(screen.queryByRole('button', { name: 'Play course preview' })).not.toBeOnTheScreen();
    });

    it('closes the preview with the close button', async () => {
      loaded(makeDetail());
      await renderScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Play course preview' }));

      await fireEvent.press(screen.getByTestId('preview-close'));

      expect(screen.queryByTestId('preview-close')).not.toBeOnTheScreen();
    });
  });
});
