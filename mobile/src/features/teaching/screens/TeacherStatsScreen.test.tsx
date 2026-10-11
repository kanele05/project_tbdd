import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderWithClient } from '@/features/search/testUtils';
import { AppError } from '@/lib/appError';
import type { TeacherCourseStatsDto } from '@/types/api';

import { teachingApi } from '../api';
import { TeacherStatsScreen } from './TeacherStatsScreen';
import { getPeakDay } from '../components/EnrollmentsChart';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock('../api', () => ({ teachingApi: { stats: jest.fn() } }));

const mockStats = teachingApi.stats as jest.Mock;
const mockPush = router.push as jest.Mock;

function makeDays(counts: Record<number, number> = {}) {
  return Array.from({ length: 30 }, (_, index) => ({
    date: `2026-09-${String(index + 1).padStart(2, '0')}`,
    count: counts[index] ?? 0,
  }));
}

function makeStats(overrides: Partial<TeacherCourseStatsDto> = {}): TeacherCourseStatsDto {
  return {
    courseId: 'c1',
    enrollmentCount: 1234,
    revenueCents: 7375,
    avgProgressPercent: 42,
    completedCount: 12,
    ratingAvg: 4.5,
    ratingCount: 30,
    ratingDistribution: { 5: 20, 4: 6, 3: 3, 2: 1, 1: 0 },
    newEnrollments30d: makeDays({ 3: 2, 10: 5 }),
    submissionCount: 8,
    gradedCount: 5,
    ...overrides,
  };
}

describe('getPeakDay', () => {
  it('returns the busiest day, or null when nobody enrolled', () => {
    expect(getPeakDay(makeDays({ 3: 2, 10: 5 }))).toEqual({ date: '2026-09-11', count: 5 });
    expect(getPeakDay(makeDays())).toBeNull();
  });
});

describe('TeacherStatsScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the KPI tiles, the rating distribution and the 30-day chart', async () => {
    mockStats.mockResolvedValue(makeStats());
    await renderWithClient(<TeacherStatsScreen courseId="c1" />);

    expect(await screen.findByTestId('kpi-students')).toBeOnTheScreen();
    expect(screen.getByLabelText('Students, 1,234, 12 completed')).toBeOnTheScreen();
    expect(screen.getByLabelText('Revenue, $73.75, Simulated payments')).toBeOnTheScreen();
    expect(screen.getByLabelText('Avg. progress, 42%')).toBeOnTheScreen();
    expect(screen.getByLabelText('Rating, 4.5/5, 30 reviews')).toBeOnTheScreen();
    expect(screen.getByText('7 new students')).toBeOnTheScreen();
    expect(screen.getByTestId('enrollments-chart')).toBeOnTheScreen();
    expect(screen.getByLabelText('5 stars: 20')).toBeOnTheScreen();
    expect(screen.getByLabelText('1 stars: 0')).toBeOnTheScreen();
    expect(screen.getByText('5 of 8 graded')).toBeOnTheScreen();
  });

  it('says so when nobody enrolled in the last 30 days and there is no rating yet', async () => {
    mockStats.mockResolvedValue(
      makeStats({
        ratingAvg: 0,
        ratingCount: 0,
        newEnrollments30d: makeDays(),
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      }),
    );
    await renderWithClient(<TeacherStatsScreen courseId="c1" />);

    expect(await screen.findByTestId('enrollments-chart-empty')).toBeOnTheScreen();
    expect(screen.getByLabelText('Rating, -, No ratings yet')).toBeOnTheScreen();
  });

  it('opens the submissions of the course', async () => {
    mockStats.mockResolvedValue(makeStats());
    await renderWithClient(<TeacherStatsScreen courseId="c1" />);

    await fireEvent.press(await screen.findByTestId('open-submissions'));

    expect(mockPush).toHaveBeenCalledWith('/studio/c1/submissions');
  });

  it('shows a skeleton while loading', async () => {
    mockStats.mockReturnValue(new Promise(() => undefined));
    await renderWithClient(<TeacherStatsScreen courseId="c1" />);

    expect(screen.getByTestId('stats-skeleton')).toBeOnTheScreen();
  });

  it('shows an error with Retry and recovers', async () => {
    mockStats.mockRejectedValueOnce(
      new AppError({ status: 404, code: 'COURSE_NOT_FOUND', message: 'no' }),
    );
    mockStats.mockResolvedValue(makeStats());
    await renderWithClient(<TeacherStatsScreen courseId="c1" />);

    expect(await screen.findByText("Couldn't load the statistics")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByTestId('kpi-students')).toBeOnTheScreen());
  });
});
