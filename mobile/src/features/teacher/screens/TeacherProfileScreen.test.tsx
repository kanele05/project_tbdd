import { fireEvent, render, screen } from '@testing-library/react-native';
import { Share } from 'react-native';

import { makeCourse } from '@/components/course/courseFixtures';
import { i18n } from '@/i18n';
import { AppError } from '@/lib/appError';
import { useAuthStore } from '@/stores/authStore';
import type { ReviewDto, TeacherDetail } from '@/types/api';

import { TeacherProfileScreen } from './TeacherProfileScreen';

jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  // Minimal stand-in: FlashList needs real layout measurements that jest does not provide.
  return {
    FlashList: (props: {
      data: unknown[];
      renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
      keyExtractor?: (item: unknown, index: number) => string;
      ListHeaderComponent?: React.ReactNode;
      ListEmptyComponent?: React.ReactNode;
      ListFooterComponent?: React.ReactNode;
    }) =>
      React.createElement(
        View,
        null,
        props.ListHeaderComponent,
        props.data.length === 0
          ? props.ListEmptyComponent
          : props.data.map((item, index) =>
              React.createElement(
                React.Fragment,
                { key: props.keyExtractor ? props.keyExtractor(item, index) : index },
                props.renderItem({ item, index }),
              ),
            ),
        props.ListFooterComponent,
      ),
  };
});

const mockPush = jest.fn();
const mockToggleFollow = jest.fn();
const mockRefetchTeacher = jest.fn();

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPush(href),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  },
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
    ...mockState.reviews,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
  useToggleFollow: () => ({ toggleFollow: mockToggleFollow, isPending: false }),
  useTeacherCourseBookmark: () => jest.fn(),
}));

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

function loadTeacher(overrides: Partial<TeacherDetail> = {}) {
  mockState.teacher = {
    data: { ...TEACHER, ...overrides },
    isPending: false,
    isError: false,
    refetch: () => mockRefetchTeacher(),
  };
}

describe('TeacherProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('shows the header with local time and the Overview tab by default', async () => {
    loadTeacher();
    await render(<TeacherProfileScreen teacherId="t1" />);

    expect(screen.getByText('Sara Weise')).toBeOnTheScreen();
    expect(screen.getByText('Teacher')).toBeOnTheScreen();
    expect(screen.getByText('UI/UX Designer')).toBeOnTheScreen();
    expect(screen.getByText(/^New York - \d{2}:\d{2} (AM|PM)$/)).toBeOnTheScreen();
    expect(screen.getByText('I design products people love.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Students: 3,400')).toBeOnTheScreen();
    expect(screen.getByLabelText('Followers: 87')).toBeOnTheScreen();
    expect(screen.getByLabelText('Rating: 4.5')).toBeOnTheScreen();
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

  it('shows the Vietnamese labels after a language change', async () => {
    await i18n.changeLanguage('vi');
    loadTeacher();
    await render(<TeacherProfileScreen teacherId="t1" />);

    expect(screen.getByText('Giảng viên')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Khóa học' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Theo dõi Sara Weise' })).toBeOnTheScreen();
  });

  it('follows the teacher from the Overview tab', async () => {
    loadTeacher();
    await render(<TeacherProfileScreen teacherId="t1" />);

    await fireEvent.press(screen.getByRole('button', { name: 'Follow Sara Weise' }));

    expect(mockToggleFollow).toHaveBeenCalledWith('t1', false);
  });

  it('shows Following and unfollows when the teacher is already followed', async () => {
    loadTeacher({ isFollowed: true });
    await render(<TeacherProfileScreen teacherId="t1" />);

    await fireEvent.press(screen.getByText('Following'));

    expect(mockToggleFollow).toHaveBeenCalledWith('t1', true);
  });

  it("hides the Follow button on the signed-in teacher's own profile (BR-14)", async () => {
    useAuthStore.setState({
      user: {
        id: 't1',
        email: 'sara@example.com',
        fullName: 'Sara Weise',
        headline: null,
        avatarUrl: null,
        coverUrl: null,
        role: 'TEACHER',
      },
    });
    loadTeacher();
    await render(<TeacherProfileScreen teacherId="t1" />);

    expect(screen.queryByTestId('teacher-follow-button')).not.toBeOnTheScreen();
  });

  it('lists courses by category with Top-rated and a View all link', async () => {
    loadTeacher();
    mockState.courses = {
      data: [
        {
          category: { id: 'cat-ux', name: 'UI/UX Design' },
          isTopRated: true,
          courses: [makeCourse({ id: 'c1', title: 'UX Foundation' })],
        },
        {
          category: { id: 'cat-gd', name: 'Graphic Design' },
          isTopRated: false,
          courses: [makeCourse({ id: 'c2', title: 'Digital Poster' })],
        },
      ],
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    };
    await render(<TeacherProfileScreen teacherId="t1" />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Courses' }));

    expect(await screen.findByText('UI/UX Design')).toBeOnTheScreen();
    expect(screen.getByText('Top-rated')).toBeOnTheScreen();
    expect(screen.getByText('UX Foundation')).toBeOnTheScreen();
    expect(screen.getByText('Graphic Design')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('link', { name: 'View all, UI/UX Design' }));
    expect(mockPush).toHaveBeenCalledWith('/course-list?teacherId=t1&categoryId=cat-ux');
  });

  it('shows an empty state when the teacher has no courses', async () => {
    loadTeacher();
    mockState.courses = { data: [], isPending: false, isError: false, refetch: jest.fn() };
    await render(<TeacherProfileScreen teacherId="t1" />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Courses' }));

    expect(await screen.findByText('No courses yet')).toBeOnTheScreen();
  });

  it('lists reviews of the teacher on the Review tab', async () => {
    loadTeacher();
    mockState.reviews = {
      data: { pages: [{ data: [REVIEW], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }] },
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    };
    await render(<TeacherProfileScreen teacherId="t1" />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Reviews' }));

    expect(await screen.findByText('review: Great teacher')).toBeOnTheScreen();
  });
});
