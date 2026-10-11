import { fireEvent, render, screen } from '@testing-library/react-native';
import { Share, useWindowDimensions } from 'react-native';

import { makeCourse } from '@/components/course/courseFixtures';
import { AppError } from '@/lib/appError';
import { useAuthStore } from '@/stores/authStore';
import type { ReviewDto, TeacherCoursesGroupDto, TeacherDetail } from '@/types/api';

import { TeacherProfileScreen } from './TeacherProfileScreen';

jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { FlashList: () => React.createElement(View, { testID: 'phone-list' }) };
});

const mockPush = jest.fn();
const mockToggleFollow = jest.fn();
const mockToggleBookmark = jest.fn();
const mockRefetchTeacher = jest.fn();
const mockFetchNextReviews = jest.fn();

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPush(href),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  },
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 800, scale: 1, fontScale: 1 })),
}));
jest.mock('@/features/search/useQuickCardActions', () => ({
  useQuickCardActions: () => ({
    onPress: (course: { id: string }) => mockPush(`/course/${course.id}`),
    onToggleBookmark: jest.fn(),
    onAddToCart: jest.fn(),
  }),
}));
jest.mock('@/features/review/components/ReviewCard', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ReviewCard: ({ review }: { review: ReviewDto }) => <Text>{`review: ${review.content}`}</Text>,
  };
});

type QueryState = {
  data?: unknown;
  isPending: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => void;
  hasNextPage?: boolean;
};

const mockState: { teacher: QueryState; courses: QueryState; reviews: QueryState } = {
  teacher: { isPending: true, isError: false, refetch: () => mockRefetchTeacher() },
  courses: { isPending: true, isError: false, refetch: jest.fn() },
  reviews: { isPending: true, isError: false, refetch: jest.fn() },
};

jest.mock('../hooks', () => ({
  useTeacher: () => mockState.teacher,
  useTeacherCourses: () => mockState.courses,
  useTeacherReviews: () => ({
    hasNextPage: false,
    isFetchingNextPage: false,
    ...mockState.reviews,
    fetchNextPage: mockFetchNextReviews,
  }),
  useToggleFollow: () => ({ toggleFollow: mockToggleFollow, isPending: false }),
  useTeacherCourseBookmark: () => mockToggleBookmark,
}));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;

const TEACHER: TeacherDetail = {
  id: 't1',
  fullName: 'Sara Weise',
  avatarUrl: null,
  organization: null,
  ratingAvg: 4.5,
  ratingCount: 1233,
  jobTitle: 'UI/UX Designer',
  bio: 'I design products people love.',
  coverUrl: null,
  location: 'New York',
  timezone: 'America/New_York',
  isFollowed: false,
  stats: { courseCount: 12, studentCount: 3400, followerCount: 87 },
};

const REVIEW: ReviewDto = {
  id: 'r1',
  rating: 5,
  content: 'Great teacher',
  createdAt: '2026-10-01T00:00:00.000Z',
  user: { id: 'u1', fullName: 'Rosie', avatarUrl: null },
  teacherReply: null,
  teacherRepliedAt: null,
  course: { id: 'c1', title: 'UX Foundation' },
};

const GROUPS: TeacherCoursesGroupDto[] = [
  {
    category: { id: 'cat1', name: 'Design' },
    isTopRated: true,
    courses: [makeCourse({ id: 'c1', title: 'UX Foundation', isBookmarked: false })],
  },
];

function setWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 800, scale: 1, fontScale: 1 });
}

function loadTeacher(overrides: Partial<TeacherDetail> = {}) {
  mockState.teacher = {
    data: { ...TEACHER, ...overrides },
    isPending: false,
    isError: false,
    refetch: () => mockRefetchTeacher(),
  };
}

describe('TeacherProfileScreen on a wide window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
    useAuthStore.setState({ user: null });
    mockState.teacher = { isPending: true, isError: false, refetch: () => mockRefetchTeacher() };
    mockState.courses = { isPending: true, isError: false, refetch: jest.fn() };
    mockState.reviews = { isPending: true, isError: false, refetch: jest.fn() };
  });

  it('shows a skeleton while the teacher loads', async () => {
    await render(<TeacherProfileScreen teacherId="t1" />);

    expect(screen.getByTestId('teacher-profile-skeleton')).toBeOnTheScreen();
  });

  it('shows an error with Retry when the teacher fails to load', async () => {
    mockState.teacher = {
      isPending: false,
      isError: true,
      error: new AppError({ status: 404, code: 'TEACHER_NOT_FOUND', message: 'x' }),
      refetch: () => mockRefetchTeacher(),
    };
    await render(<TeacherProfileScreen teacherId="t1" />);

    expect(screen.getByText('This teacher could not be found.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetchTeacher).toHaveBeenCalled();
  });

  it('shows the hero, the four numbers and the bio on the Overview tab', async () => {
    loadTeacher();
    await render(<TeacherProfileScreen teacherId="t1" />);

    expect(screen.getByTestId('teacher-hero')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Sara Weise' })).toBeOnTheScreen();
    expect(screen.getByText('UI/UX Designer')).toBeOnTheScreen();
    expect(screen.getByText(/^New York - \d{2}:\d{2} (AM|PM)$/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Students: 3,400')).toBeOnTheScreen();
    expect(screen.getByLabelText('Followers: 87')).toBeOnTheScreen();
    expect(screen.getByText('I design products people love.')).toBeOnTheScreen();
  });

  it('follows the teacher', async () => {
    loadTeacher();
    await render(<TeacherProfileScreen teacherId="t1" />);

    await fireEvent.press(screen.getByRole('button', { name: 'Follow Sara Weise' }));
    expect(mockToggleFollow).toHaveBeenCalledWith('t1', false);
  });

  it('hides Follow on the signed-in teacher own profile', async () => {
    loadTeacher();
    useAuthStore.setState({
      user: {
        id: 't1',
        email: 't@example.com',
        fullName: 'Sara Weise',
        headline: null,
        avatarUrl: null,
        coverUrl: null,
        role: 'TEACHER',
      },
    });
    await render(<TeacherProfileScreen teacherId="t1" />);

    expect(screen.queryByTestId('teacher-follow-button')).not.toBeOnTheScreen();
  });

  it('shares the profile from the hero', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    loadTeacher();
    await render(<TeacherProfileScreen teacherId="t1" />);

    await fireEvent.press(screen.getByRole('button', { name: 'Share profile' }));

    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(shareSpy.mock.calls[0]?.[0]?.message).toContain('Sara Weise');
    shareSpy.mockRestore();
  });

  it('lists the courses per category as cards and opens one', async () => {
    loadTeacher();
    mockState.courses = {
      data: GROUPS,
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    };
    await render(<TeacherProfileScreen teacherId="t1" />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Courses' }));

    expect(screen.getByTestId('teacher-courses-desktop')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Design' })).toBeOnTheScreen();
    expect(screen.getByText('Top-rated')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: /^UX Foundation, by/ }));
    expect(mockPush).toHaveBeenCalledWith('/course/c1');

    await fireEvent.press(screen.getByRole('link', { name: 'View all, Design' }));
    expect(mockPush).toHaveBeenCalledWith('/course-list?teacherId=t1&categoryId=cat1');
  });

  it('shows the empty state when the teacher has no courses', async () => {
    loadTeacher();
    mockState.courses = { data: [], isPending: false, isError: false, refetch: jest.fn() };
    await render(<TeacherProfileScreen teacherId="t1" />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Courses' }));
    expect(screen.getByText('No courses yet')).toBeOnTheScreen();
  });

  it('shows reviews in a grid and loads more', async () => {
    loadTeacher();
    mockState.reviews = {
      data: { pages: [{ data: [REVIEW], meta: { page: 1, limit: 20, total: 2, totalPages: 2 } }] },
      isPending: false,
      isError: false,
      refetch: jest.fn(),
      hasNextPage: true,
    };
    await render(<TeacherProfileScreen teacherId="t1" />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Reviews' }));

    expect(screen.getByTestId('teacher-reviews-desktop')).toBeOnTheScreen();
    expect(screen.getByText('review: Great teacher')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'See more' }));
    expect(mockFetchNextReviews).toHaveBeenCalledTimes(1);
  });

  it('keeps the phone list below 768 wide', async () => {
    setWidth(390);
    loadTeacher();
    await render(<TeacherProfileScreen teacherId="t1" />);

    expect(screen.getByTestId('phone-list')).toBeOnTheScreen();
    expect(screen.queryByTestId('teacher-desktop-scroll')).not.toBeOnTheScreen();
  });
});
