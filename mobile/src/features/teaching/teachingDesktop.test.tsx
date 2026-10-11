import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking, useWindowDimensions } from 'react-native';

import { renderWithClient } from '@/features/search/testUtils';
import { useAuthStore } from '@/stores/authStore';
import type {
  TeacherCourseStatsDto,
  TeacherProfileDto,
  TeacherSubmissionDto,
  TeacherSubmissionsPage,
} from '@/types/api';

import { teachingApi } from './api';
import { TeacherProfileEditScreen } from './screens/TeacherProfileEditScreen';
import { TeacherStatsScreen } from './screens/TeacherStatsScreen';
import { TeacherSubmissionsScreen } from './screens/TeacherSubmissionsScreen';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 390, height: 844, scale: 1, fontScale: 1 })),
}));
jest.mock('@shopify/flash-list', () => jest.requireActual('@/features/search/flashListMock'));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock('./api', () => ({
  teachingApi: {
    stats: jest.fn(),
    submissions: jest.fn(),
    grade: jest.fn(),
    profile: jest.fn(),
    updateProfile: jest.fn(),
  },
}));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const setWidth = (width: number) =>
  mockUseWindowDimensions.mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });

const api = jest.mocked(teachingApi);

const STATS: TeacherCourseStatsDto = {
  courseId: 'c1',
  enrollmentCount: 1234,
  revenueCents: 7375,
  avgProgressPercent: 42,
  completedCount: 12,
  ratingAvg: 4.5,
  ratingCount: 30,
  ratingDistribution: { 5: 20, 4: 6, 3: 3, 2: 1, 1: 0 },
  newEnrollments30d: Array.from({ length: 30 }, (_, index) => ({
    date: `2026-09-${String(index + 1).padStart(2, '0')}`,
    count: index === 3 ? 2 : 0,
  })),
  submissionCount: 8,
  gradedCount: 5,
};

function makeSubmission(
  id: string,
  overrides: Partial<TeacherSubmissionDto> = {},
): TeacherSubmissionDto {
  return {
    id,
    courseId: 'c1',
    title: `Project ${id}`,
    description: null,
    imageUrl: null,
    fileUrl: `https://files/${id}.zip`,
    createdAt: new Date().toISOString(),
    user: { id: `u-${id}`, fullName: `Student ${id}`, avatarUrl: null },
    grade: null,
    feedback: null,
    gradedAt: null,
    ...overrides,
  };
}

function page(items: TeacherSubmissionDto[]): TeacherSubmissionsPage {
  return {
    data: items,
    meta: {
      page: 1,
      limit: 20,
      total: items.length,
      totalPages: 1,
      summary: { gradedCount: 1, ungradedCount: items.length },
    },
  };
}

const PROFILE: TeacherProfileDto = {
  id: 't1',
  jobTitle: 'Designer',
  bio: 'I teach design.',
  organization: 'Acme',
  location: null,
  timezone: 'Asia/Ho_Chi_Minh',
};

describe('Teaching screens on a desktop window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
    api.stats.mockResolvedValue(STATS);
    api.submissions.mockResolvedValue(
      page([
        makeSubmission('s1', { description: 'My first app' }),
        makeSubmission('s2', { grade: 90, feedback: 'Well done' }),
      ]),
    );
    api.profile.mockResolvedValue(PROFILE);
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'a@b.c',
        fullName: 'A',
        headline: null,
        avatarUrl: null,
        coverUrl: null,
        role: 'TEACHER',
      },
    });
  });

  describe('statistics (SC-28)', () => {
    it('shows the four KPI tiles, the chart and the distribution in the desktop layout', async () => {
      await renderWithClient(<TeacherStatsScreen courseId="c1" />);

      expect(await screen.findByTestId('stats-desktop')).toBeOnTheScreen();
      for (const id of ['kpi-students', 'kpi-revenue', 'kpi-progress', 'kpi-rating']) {
        expect(screen.getByTestId(id)).toBeOnTheScreen();
      }
      expect(screen.getByTestId('enrollments-chart')).toBeOnTheScreen();
      expect(screen.getByTestId('rating-distribution')).toBeOnTheScreen();
      expect(screen.getByText('5 of 8 graded')).toBeOnTheScreen();
    });

    it('opens the submissions and goes back from the page header', async () => {
      await renderWithClient(<TeacherStatsScreen courseId="c1" />);

      await fireEvent.press(await screen.findByTestId('open-submissions'));
      expect(router.push).toHaveBeenCalledWith('/studio/c1/submissions');
      await fireEvent.press(screen.getByTestId('work-header-back'));
      expect(router.back).toHaveBeenCalledTimes(1);
    });

    it('keeps the phone layout on a phone window', async () => {
      setWidth(390);
      await renderWithClient(<TeacherStatsScreen courseId="c1" />);

      expect(await screen.findByTestId('kpi-students')).toBeOnTheScreen();
      expect(screen.queryByTestId('stats-desktop')).not.toBeOnTheScreen();
    });
  });

  describe('submissions (SC-29)', () => {
    it('lists the submissions in a table with a grade column', async () => {
      await renderWithClient(<TeacherSubmissionsScreen courseId="c1" />);

      expect(await screen.findByText('Project s1')).toBeOnTheScreen();
      const header = within(screen.getByTestId('table-header'));
      for (const column of ['Student', 'Project', 'Submitted', 'Grade', 'Actions']) {
        expect(header.getByText(column)).toBeOnTheScreen();
      }
      expect(screen.getByText('My first app')).toBeOnTheScreen();
      expect(screen.getByText('Not graded')).toBeOnTheScreen();
      expect(screen.getByText('90/100')).toBeOnTheScreen();
      expect(screen.getByText('Well done')).toBeOnTheScreen();
      expect(screen.getByText('1 graded, 2 waiting')).toBeOnTheScreen();
    });

    it('filters, opens the grade sheet and opens the file from a row', async () => {
      const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      await renderWithClient(<TeacherSubmissionsScreen courseId="c1" />);
      await screen.findByText('Project s1');

      await fireEvent.press(screen.getByTestId('submission-filter-ungraded'));
      await waitFor(() =>
        expect(api.submissions).toHaveBeenLastCalledWith('c1', { status: 'ungraded', page: 1 }),
      );
      await fireEvent.press(await screen.findByTestId('grade-s1'));
      expect(screen.getByTestId('grade-sheet')).toBeOnTheScreen();
      await fireEvent.press(screen.getAllByLabelText('Open file')[0]!);
      expect(openUrl).toHaveBeenCalledWith('https://files/s1.zip');
      openUrl.mockRestore();
    });

    it('drops the Submitted column on a tablet and shows the time under the name', async () => {
      setWidth(820);
      await renderWithClient(<TeacherSubmissionsScreen courseId="c1" />);

      expect(await screen.findByText('Project s1')).toBeOnTheScreen();
      const header = within(screen.getByTestId('table-header'));
      expect(header.queryByText('Submitted')).not.toBeOnTheScreen();
      expect(header.getByText('Grade')).toBeOnTheScreen();
      expect(screen.getAllByText(/^Submitted /).length).toBeGreaterThan(0);
    });

    it('shows the empty state and a loading placeholder', async () => {
      api.submissions.mockResolvedValue(page([]));
      const { unmount } = await renderWithClient(<TeacherSubmissionsScreen courseId="c1" />);
      expect(await screen.findByText('No submissions yet')).toBeOnTheScreen();
      unmount();

      api.submissions.mockReturnValue(new Promise(() => undefined));
      await renderWithClient(<TeacherSubmissionsScreen courseId="c1" />);
      expect(screen.getAllByTestId('submission-skeleton').length).toBeGreaterThan(0);
    });
  });

  describe('teacher profile (SC-30)', () => {
    it('renders the form as a centered card under a page header', async () => {
      await renderWithClient(<TeacherProfileEditScreen />);

      expect(await screen.findByTestId('teacher-profile-card')).toBeOnTheScreen();
      expect(screen.getByTestId('teacher-profile-desktop')).toBeOnTheScreen();
      expect(screen.getByDisplayValue('Designer')).toBeOnTheScreen();
      expect(screen.getByTestId('teacher-profile-save')).toBeDisabled();
    });

    it('saves from the card', async () => {
      api.updateProfile.mockResolvedValue({ ...PROFILE, jobTitle: 'Lead' });
      await renderWithClient(<TeacherProfileEditScreen />);
      await screen.findByDisplayValue('Designer');

      await fireEvent.changeText(screen.getByTestId('teacher-job-title'), 'Lead');
      await fireEvent.press(screen.getByTestId('teacher-profile-save'));

      await waitFor(() => expect(api.updateProfile).toHaveBeenCalledTimes(1));
    });
  });
});
