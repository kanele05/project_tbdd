import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { renderWithClient } from '@/features/search/testUtils';
import { confirmAction } from '@/utils/confirmAction';

import { adminApi } from './api';
import { AdminCourseDetailScreen } from './screens/AdminCourseDetailScreen';
import { AdminCoursesScreen } from './screens/AdminCoursesScreen';
import { AdminDashboardScreen } from './screens/AdminDashboardScreen';
import { AdminUsersScreen } from './screens/AdminUsersScreen';
import { makeDetail, makeQueueItem, makeStats, makeUser } from './testFixtures';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 390, height: 844, scale: 1, fontScale: 1 })),
}));
jest.mock('@shopify/flash-list', () => jest.requireActual('@/features/search/flashListMock'));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
}));
jest.mock('./api', () => ({
  adminApi: {
    stats: jest.fn(),
    courses: jest.fn(),
    course: jest.fn(),
    users: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
    aiReview: jest.fn(),
    disableUser: jest.fn(),
    enableUser: jest.fn(),
  },
}));
jest.mock('@/utils/confirmAction', () => ({ confirmAction: jest.fn() }));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const setWidth = (width: number) =>
  mockUseWindowDimensions.mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });

const api = jest.mocked(adminApi);
const mockConfirm = jest.mocked(confirmAction);

function queuePage(items = [makeQueueItem()]) {
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

function usersPage(users = [makeUser()]) {
  return { data: users, meta: { page: 1, limit: 20, total: users.length, totalPages: 1 } };
}

describe('Admin screens on a desktop window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
    api.stats.mockResolvedValue(makeStats());
    api.courses.mockResolvedValue(queuePage());
    api.users.mockResolvedValue(usersPage());
    api.course.mockResolvedValue(makeDetail());
    mockConfirm.mockResolvedValue(true);
  });

  describe('dashboard (SC-31)', () => {
    it('shows the pending card, four KPI tiles, both charts and the top courses', async () => {
      await renderWithClient(<AdminDashboardScreen />);

      expect(await screen.findByTestId('admin-dashboard-desktop')).toBeOnTheScreen();
      expect(screen.getByTestId('pending-card')).toBeOnTheScreen();
      expect(screen.getByText('$1,234.56')).toBeOnTheScreen();
      expect(screen.getByTestId('users-by-role')).toBeOnTheScreen();
      expect(screen.getByTestId('courses-by-status')).toBeOnTheScreen();
      expect(screen.getByText('React Native Basics')).toBeOnTheScreen();
      expect(screen.getByText('Shortcuts')).toBeOnTheScreen();
    });

    it('links to the queue and the users', async () => {
      await renderWithClient(<AdminDashboardScreen />);

      await fireEvent.press(await screen.findByTestId('link-users'));
      expect(router.push).toHaveBeenLastCalledWith('/admin/users');
      await fireEvent.press(screen.getByTestId('link-courses'));
      expect(router.push).toHaveBeenLastCalledWith('/admin/courses');
    });

    it('keeps the phone layout on a phone window and shows a skeleton while loading', async () => {
      setWidth(390);
      const { unmount } = await renderWithClient(<AdminDashboardScreen />);
      expect(await screen.findByTestId('pending-card')).toBeOnTheScreen();
      expect(screen.queryByTestId('admin-dashboard-desktop')).not.toBeOnTheScreen();
      unmount();

      setWidth(1280);
      api.stats.mockReturnValue(new Promise(() => undefined));
      await renderWithClient(<AdminDashboardScreen />);
      expect(screen.getByTestId('admin-dashboard-skeleton')).toBeOnTheScreen();
    });
  });

  describe('review queue (SC-32)', () => {
    it('lists the queue as a table with column headers and the toolbar', async () => {
      await renderWithClient(<AdminCoursesScreen />);

      expect(await screen.findByText('Learn TypeScript')).toBeOnTheScreen();
      const header = within(screen.getByTestId('table-header'));
      for (const column of [
        'Course',
        'Teacher',
        'Type',
        'Status',
        'Price',
        'Lessons',
        'Submitted',
      ]) {
        expect(header.getByText(column)).toBeOnTheScreen();
      }
      expect(screen.getByText('New courses (3)')).toBeOnTheScreen();
      expect(screen.getByTestId('queue-status-PENDING_REVIEW')).toBeOnTheScreen();
    });

    it('opens the review detail of a row', async () => {
      await renderWithClient(<AdminCoursesScreen />);

      await fireEvent.press(await screen.findByTestId('queue-item-c1'));
      expect(router.push).toHaveBeenCalledWith('/admin/courses/c1');
    });

    it('keeps the teacher in the course cell on a tablet', async () => {
      setWidth(820);
      await renderWithClient(<AdminCoursesScreen />);

      expect(await screen.findByText('Sara Weise · Code')).toBeOnTheScreen();
      expect(
        within(screen.getByTestId('table-header')).queryByText('Teacher'),
      ).not.toBeOnTheScreen();
    });

    it('shows the empty state', async () => {
      api.courses.mockResolvedValue(queuePage([]));
      await renderWithClient(<AdminCoursesScreen />);

      expect(await screen.findByText('Nothing here')).toBeOnTheScreen();
    });
  });

  describe('users (SC-34)', () => {
    it('lists accounts in a table next to a filter toolbar', async () => {
      await renderWithClient(<AdminUsersScreen />);

      expect(await screen.findByTestId('users-table')).toBeOnTheScreen();
      const header = within(screen.getByTestId('table-header'));
      for (const column of ['User', 'Role', 'Activity', 'Joined', 'Status', 'Action']) {
        expect(header.getByText(column)).toBeOnTheScreen();
      }
      expect(screen.getByTestId('role-TEACHER')).toBeOnTheScreen();
      expect(screen.getByTestId('status-disabled')).toBeOnTheScreen();
    });

    it('filters by role and asks for a reason before disabling', async () => {
      await renderWithClient(<AdminUsersScreen />);
      const user = makeUser();

      await fireEvent.press(await screen.findByTestId(`disable-${user.id}`));
      expect(screen.getByTestId('reason-input')).toBeOnTheScreen();

      await fireEvent.press(screen.getByTestId('role-TEACHER'));
      await waitFor(() =>
        expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'TEACHER' })),
      );
    });

    it('shows a skeleton and the empty state', async () => {
      api.users.mockReturnValue(new Promise(() => undefined));
      const { unmount } = await renderWithClient(<AdminUsersScreen />);
      expect(screen.getByTestId('users-skeleton')).toBeOnTheScreen();
      unmount();

      api.users.mockResolvedValue(usersPage([]));
      await renderWithClient(<AdminUsersScreen />);
      expect(await screen.findByText('No users found')).toBeOnTheScreen();
    });
  });

  describe('course review (SC-33)', () => {
    it('puts the decision buttons and the AI panel in the side column', async () => {
      api.course.mockResolvedValue(
        makeDetail({ status: 'PENDING_REVIEW', reviewTarget: 'COURSE', missing: [] }),
      );
      await renderWithClient(<AdminCourseDetailScreen courseId="c1" />);

      expect(await screen.findByTestId('admin-detail-columns-side')).toBeOnTheScreen();
      const side = within(screen.getByTestId('admin-detail-columns-side'));
      expect(side.getByText('Decision')).toBeOnTheScreen();
      expect(side.getByTestId('action-approve')).toBeOnTheScreen();
      expect(side.getByTestId('action-reject')).toBeOnTheScreen();
      expect(side.getByTestId('ai-review-run')).toBeOnTheScreen();
      expect(screen.getByTestId('course-info')).toBeOnTheScreen();
    });

    it('approves from the side panel', async () => {
      api.course.mockResolvedValue(
        makeDetail({ status: 'PENDING_REVIEW', reviewTarget: 'COURSE', missing: [] }),
      );
      api.approve.mockResolvedValue(makeDetail({ status: 'PUBLISHED' }));
      await renderWithClient(<AdminCourseDetailScreen courseId="c1" />);

      await fireEvent.press(await screen.findByTestId('action-approve'));
      await waitFor(() => expect(api.approve).toHaveBeenCalledWith('c1'));
    });

    it('explains that nothing needs a decision for a draft and has a back link', async () => {
      api.course.mockResolvedValue(makeDetail({ status: 'DRAFT', reviewTarget: null }));
      await renderWithClient(<AdminCourseDetailScreen courseId="c1" />);

      expect(await screen.findByText(/No decision is needed/)).toBeOnTheScreen();
      expect(screen.queryByTestId('action-bar')).not.toBeOnTheScreen();
      await fireEvent.press(screen.getByTestId('work-header-back'));
      expect(router.back).toHaveBeenCalledTimes(1);
    });

    it('keeps the bottom action bar on a phone window', async () => {
      setWidth(390);
      api.course.mockResolvedValue(
        makeDetail({ status: 'PENDING_REVIEW', reviewTarget: 'COURSE', missing: [] }),
      );
      await renderWithClient(<AdminCourseDetailScreen courseId="c1" />);

      expect(await screen.findByTestId('action-bar')).toBeOnTheScreen();
      expect(screen.queryByTestId('admin-detail-columns-side')).not.toBeOnTheScreen();
    });
  });
});
