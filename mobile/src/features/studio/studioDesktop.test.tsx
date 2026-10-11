import { fireEvent, screen, within } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { StudioCourseDetailDto, StudioListSummaryDto } from '@/types/api';

import { CourseStatusScreen } from './screens/CourseStatusScreen';
import { CourseWizardScreen } from './screens/CourseWizardScreen';
import { CurriculumScreen } from './screens/CurriculumScreen';
import { StudioHomeScreen } from './screens/StudioHomeScreen';
import { makeDetail, makeSummary } from './studioFixtures';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRefetch = jest.fn();
const mockFetchNextPage = jest.fn();
let mockList: Record<string, unknown> = {};
let mockDetail: Record<string, unknown> = {};

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 390, height: 844, scale: 1, fontScale: 1 })),
}));
jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.requireActual('react-native').FlatList,
}));
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    router: {
      push: (...args: unknown[]) => mockPush(...args),
      replace: jest.fn(),
      back: () => mockBack(),
      canGoBack: () => true,
      setParams: jest.fn(),
    },
    useFocusEffect: (callback: () => void) => {
      useEffect(() => callback(), [callback]);
    },
    useNavigation: () => ({ addListener: () => jest.fn(), dispatch: jest.fn() }),
  };
});
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('@/features/search/hooks', () => ({
  useCategories: () => ({
    isPending: false,
    isError: false,
    data: [{ id: 'cat-1', name: 'Code' }],
  }),
  useHotTags: () => ({ isPending: false, data: [] }),
}));
jest.mock('./components/CurriculumContent', () => ({
  CurriculumContent: () => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>curriculum-content</Text>;
  },
}));
jest.mock('./hooks', () => ({
  useStudioCourses: () => mockList,
  useStudioCourse: () => mockDetail,
  useCreateCourse: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateCourse: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSaveRevision: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCourseWorkflow: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDiscardRevision: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteCourse: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUploadCover: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const setWidth = (width: number) =>
  mockUseWindowDimensions.mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });

const SUMMARY: StudioListSummaryDto = {
  courseCount: 2,
  totalEnrollments: 40,
  totalRevenueCents: 120000,
  byStatus: { DRAFT: 1, PENDING_REVIEW: 0, PUBLISHED: 1, REJECTED: 0, ARCHIVED: 0 },
};

function setList(overrides: Record<string, unknown> = {}) {
  mockList = {
    courses: [
      makeSummary({ id: 'c1', title: 'React Native Bootcamp', status: 'PUBLISHED' }),
      makeSummary({
        id: 'c2',
        title: 'Rejected course',
        status: 'REJECTED',
        rejectionReason: 'Cover is missing',
      }),
    ],
    summary: SUMMARY,
    isPending: false,
    isError: false,
    error: null,
    fetchStatus: 'idle',
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: mockFetchNextPage,
    refetch: mockRefetch,
    ...overrides,
  };
}

function setDetail(detail: StudioCourseDetailDto) {
  mockDetail = {
    data: detail,
    isPending: false,
    isError: false,
    isRefetching: false,
    error: null,
    fetchStatus: 'idle',
    refetch: mockRefetch,
  };
}

describe('Studio on a desktop window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
    setList();
  });

  describe('home (SC-23)', () => {
    it('shows the totals, the filters and the courses as a table with column headers', async () => {
      await renderWithProviders(<StudioHomeScreen />);

      expect(screen.getByTestId('studio-desktop')).toBeOnTheScreen();
      expect(screen.getByTestId('studio-summary')).toBeOnTheScreen();
      expect(screen.getByTestId('studio-filter-PUBLISHED')).toBeOnTheScreen();
      const header = within(screen.getByTestId('table-header'));
      for (const column of ['Course', 'Status', 'Price', 'Students', 'Updated']) {
        expect(header.getByText(column)).toBeOnTheScreen();
      }
      expect(screen.getByText('React Native Bootcamp')).toBeOnTheScreen();
      expect(screen.getByText('Rejected: Cover is missing')).toBeOnTheScreen();
    });

    it('opens a course from its row and starts a new course from the header button', async () => {
      await renderWithProviders(<StudioHomeScreen />);

      await fireEvent.press(screen.getByTestId('studio-course-c1'));
      expect(mockPush).toHaveBeenLastCalledWith({
        pathname: '/studio/[id]',
        params: { id: 'c1' },
      });
      await fireEvent.press(screen.getByTestId('studio-new-course'));
      expect(mockPush).toHaveBeenLastCalledWith({
        pathname: '/studio/[id]/edit',
        params: { id: 'new' },
      });
    });

    it('drops the Updated column on a tablet and keeps the rest', async () => {
      setWidth(820);
      await renderWithProviders(<StudioHomeScreen />);

      expect(screen.getByTestId('studio-desktop')).toBeOnTheScreen();
      const header = within(screen.getByTestId('table-header'));
      expect(header.queryByText('Updated')).not.toBeOnTheScreen();
      expect(header.getByText('Students')).toBeOnTheScreen();
    });

    it('pages with a See more button and shows loading rows, errors and the empty state', async () => {
      setList({ hasNextPage: true });
      const { unmount } = await renderWithProviders(<StudioHomeScreen />);
      await fireEvent.press(screen.getByTestId('studio-load-more'));
      expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
      unmount();

      setList({ courses: [], isPending: true, fetchStatus: 'fetching' });
      const loading = await renderWithProviders(<StudioHomeScreen />);
      expect(screen.getByTestId('studio-table-skeleton')).toBeOnTheScreen();
      loading.unmount();

      setList({ courses: [], isError: true, error: new Error('boom') });
      const failed = await renderWithProviders(<StudioHomeScreen />);
      await fireEvent.press(screen.getByText('Retry'));
      expect(mockRefetch).toHaveBeenCalled();
      failed.unmount();

      setList({ courses: [], summary: { ...SUMMARY, courseCount: 0 } });
      await renderWithProviders(<StudioHomeScreen />);
      expect(screen.getByText('No courses yet')).toBeOnTheScreen();
    });

    it('keeps the phone list on a phone window', async () => {
      setWidth(390);
      await renderWithProviders(<StudioHomeScreen />);

      expect(screen.queryByTestId('studio-desktop')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('table-header')).not.toBeOnTheScreen();
      expect(screen.getByTestId('studio-course-c1')).toBeOnTheScreen();
    });
  });

  describe('course wizard (SC-24)', () => {
    it('shows the five steps as a list on the left and the step in the content column', async () => {
      setDetail(makeDetail());
      await renderWithProviders(<CourseWizardScreen courseId="course-1" />);

      expect(screen.getByTestId('wizard-desktop')).toBeOnTheScreen();
      expect(screen.getByTestId('wizard-progress')).toBeOnTheScreen();
      for (const step of ['idea', 'intro', 'price', 'lessons', 'review']) {
        expect(screen.getByTestId(`wizard-step-${step}`)).toBeOnTheScreen();
      }
      // The footer sits in the same column as the fields.
      expect(screen.getByTestId('wizard-next')).toBeOnTheScreen();
      expect(screen.getByTestId('wizard-back')).toBeOnTheScreen();
    });

    it('jumps to a step from the list like the progress bar', async () => {
      setDetail(makeDetail());
      await renderWithProviders(<CourseWizardScreen courseId="course-1" />);

      await fireEvent.press(screen.getByTestId('wizard-step-price'));
      expect(await screen.findByText('Price and tags')).toBeOnTheScreen();
    });

    it('lays the preview card and the checklist side by side on the review step', async () => {
      setDetail(makeDetail({ missing: [] }));
      await renderWithProviders(<CourseWizardScreen courseId="course-1" step="review" />);

      expect(screen.getByTestId('review-preview')).toBeOnTheScreen();
      expect(screen.getByTestId('review-ready')).toBeOnTheScreen();
      expect(screen.getByTestId('wizard-submit')).toBeOnTheScreen();
    });

    it('uses the progress bar instead of the list on a tablet', async () => {
      setWidth(820);
      setDetail(makeDetail());
      await renderWithProviders(<CourseWizardScreen courseId="course-1" />);

      expect(screen.getByTestId('wizard-desktop')).toBeOnTheScreen();
      expect(screen.getAllByTestId('wizard-progress')).toHaveLength(1);
      expect(screen.getByTestId('wizard-step-idea')).toBeOnTheScreen();
    });
  });

  describe('course status (SC-26)', () => {
    it('splits into a main column and a side column with the shortcuts and the history', async () => {
      setDetail(makeDetail({ status: 'DRAFT', missing: [] }));
      await renderWithProviders(<CourseStatusScreen courseId="course-1" />);

      expect(screen.getByTestId('course-status-desktop')).toBeOnTheScreen();
      expect(screen.getByTestId('status-columns-side')).toBeOnTheScreen();
      expect(screen.getByTestId('status-submit')).toBeOnTheScreen();
      expect(screen.getByTestId('status-link-edit')).toBeOnTheScreen();
      expect(screen.getByText('Review history')).toBeOnTheScreen();
      await fireEvent.press(screen.getByTestId('status-link-curriculum'));
      expect(mockPush).toHaveBeenLastCalledWith({
        pathname: '/studio/[id]/curriculum',
        params: { id: 'course-1' },
      });
    });

    it('stacks the side column under the main one on a tablet', async () => {
      setWidth(820);
      setDetail(makeDetail());
      await renderWithProviders(<CourseStatusScreen courseId="course-1" />);

      expect(screen.getByTestId('course-status-desktop')).toBeOnTheScreen();
      expect(screen.queryByTestId('status-columns-side')).not.toBeOnTheScreen();
      expect(screen.getByTestId('status-link-edit')).toBeOnTheScreen();
    });

    it('shows the back link and goes back', async () => {
      setDetail(makeDetail());
      await renderWithProviders(<CourseStatusScreen courseId="course-1" />);

      await fireEvent.press(screen.getByTestId('work-header-back'));
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('curriculum (SC-25)', () => {
    it('shows the editor in a centered column under a page header', async () => {
      setDetail(makeDetail());
      await renderWithProviders(<CurriculumScreen courseId="course-1" />);

      expect(screen.getByTestId('curriculum-desktop')).toBeOnTheScreen();
      expect(screen.getByText('Curriculum')).toBeOnTheScreen();
      expect(screen.getByText('curriculum-content')).toBeOnTheScreen();
      expect(screen.getByTestId('work-header-back')).toBeOnTheScreen();
    });
  });
});
