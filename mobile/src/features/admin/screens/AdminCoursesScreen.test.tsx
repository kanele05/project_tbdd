import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderWithClient } from '@/features/search/testUtils';
import { AppError } from '@/lib/appError';

import { adminApi } from '../api';
import { makeQueueItem } from '../testFixtures';
import { AdminCoursesScreen } from './AdminCoursesScreen';

jest.mock('@shopify/flash-list', () => jest.requireActual('@/features/search/flashListMock'));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
}));
jest.mock('../api', () => ({ adminApi: { courses: jest.fn() } }));

const mockCourses = jest.mocked(adminApi.courses);

function page(items = [makeQueueItem()]) {
  return {
    data: items,
    meta: {
      page: 1,
      limit: 20,
      total: items.length,
      totalPages: 1,
      pending: { courses: 3, revisions: 2 },
    },
  };
}

describe('AdminCoursesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCourses.mockResolvedValue(page());
  });

  it('shows a skeleton while loading', async () => {
    mockCourses.mockReturnValue(new Promise(() => undefined));
    await renderWithClient(<AdminCoursesScreen />);
    expect(screen.getByTestId('queue-skeleton')).toBeOnTheScreen();
  });

  it('lists the pending new courses first, with the pending counters on the tabs', async () => {
    await renderWithClient(<AdminCoursesScreen />);

    expect(await screen.findByText('Learn TypeScript')).toBeOnTheScreen();
    expect(mockCourses).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'course', status: 'PENDING_REVIEW', page: 1 }),
    );
    expect(screen.getByText('New courses (3)')).toBeOnTheScreen();
    expect(screen.getByText('Revisions (2)')).toBeOnTheScreen();
    expect(screen.getByText('Sara Weise · Code')).toBeOnTheScreen();
  });

  it('opens the review detail of a row', async () => {
    await renderWithClient(<AdminCoursesScreen />);

    await fireEvent.press(await screen.findByTestId('queue-item-c1'));
    expect(router.push).toHaveBeenCalledWith('/admin/courses/c1');
  });

  it('reloads when the status chip or the type changes', async () => {
    await renderWithClient(<AdminCoursesScreen />);
    await screen.findByText('Learn TypeScript');

    await fireEvent.press(screen.getByTestId('queue-status-REJECTED'));
    await screen.findByText('Learn TypeScript');
    expect(mockCourses).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'course', status: 'REJECTED' }),
    );

    await fireEvent.press(screen.getByRole('tab', { name: /Revisions/ }));
    await screen.findByText('Learn TypeScript');
    expect(mockCourses).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'revision', status: 'REJECTED' }),
    );
    // A revision cannot be published or archived, so those filters disappear.
    expect(screen.queryByTestId('queue-status-ARCHIVED')).toBeNull();
  });

  it('marks a revision row with its own badge', async () => {
    mockCourses.mockResolvedValue(
      page([
        makeQueueItem({ type: 'REVISION', status: 'PUBLISHED', revisionStatus: 'PENDING_REVIEW' }),
      ]),
    );
    await renderWithClient(<AdminCoursesScreen />);

    expect(await screen.findByTestId('queue-item-c1')).toBeOnTheScreen();
    expect(screen.getByText('Revision pending')).toBeOnTheScreen();
  });

  it('shows an empty state per status', async () => {
    mockCourses.mockResolvedValue(page([]));
    await renderWithClient(<AdminCoursesScreen />);

    expect(await screen.findByText('No submissions are waiting for review.')).toBeOnTheScreen();
  });

  it('shows an error with Retry', async () => {
    mockCourses.mockRejectedValueOnce(
      new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'x' }),
    );
    await renderWithClient(<AdminCoursesScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Learn TypeScript')).toBeOnTheScreen();
  });
});
