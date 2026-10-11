import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderWithClient } from '@/features/search/testUtils';
import { AppError } from '@/lib/appError';
import { darkPalette } from '@/theme';

import { adminApi } from '../api';
import { makeStats } from '../testFixtures';
import { AdminDashboardScreen } from './AdminDashboardScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
}));
jest.mock('../api', () => ({ adminApi: { stats: jest.fn() } }));

const mockStats = jest.mocked(adminApi.stats);

describe('AdminDashboardScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows a skeleton while loading', async () => {
    mockStats.mockReturnValue(new Promise(() => undefined));
    await renderWithClient(<AdminDashboardScreen />);
    expect(screen.getByTestId('admin-dashboard-skeleton')).toBeOnTheScreen();
  });

  it('shows the KPIs, the distributions and the top courses', async () => {
    mockStats.mockResolvedValue(makeStats());
    await renderWithClient(<AdminDashboardScreen />);

    expect(await screen.findByText('Waiting for review')).toBeOnTheScreen();
    expect(screen.getByText('3 new courses · 2 revisions')).toBeOnTheScreen();
    expect(screen.getByText('$1,234.56')).toBeOnTheScreen();
    expect(screen.getByText('42')).toBeOnTheScreen();
    expect(screen.getByText('3 disabled')).toBeOnTheScreen();
    expect(screen.getByTestId('users-by-role')).toBeOnTheScreen();
    expect(screen.getByText('Published')).toBeOnTheScreen();
    expect(screen.getByText('React Native Basics')).toBeOnTheScreen();
    expect(screen.getByText('77 enrollments · $999')).toBeOnTheScreen();
  });

  it('links the pending card and the shortcuts to the queue and the users', async () => {
    mockStats.mockResolvedValue(makeStats());
    await renderWithClient(<AdminDashboardScreen />);

    await fireEvent.press(await screen.findByTestId('pending-card'));
    expect(router.push).toHaveBeenLastCalledWith('/admin/courses');
    await fireEvent.press(screen.getByTestId('link-users'));
    expect(router.push).toHaveBeenLastCalledWith('/admin/users');
    await fireEvent.press(screen.getByRole('button', { name: /React Native Basics/ }));
    expect(router.push).toHaveBeenLastCalledWith('/admin/courses/c1');
  });

  it('says nothing is waiting when the queue is empty', async () => {
    mockStats.mockResolvedValue(
      makeStats({ pending: { courses: 0, revisions: 0, total: 0 }, topCourses: [] }),
    );
    await renderWithClient(<AdminDashboardScreen />);

    expect(await screen.findByText(/all caught up/)).toBeOnTheScreen();
    expect(screen.getByText(/No published courses with enrollments/)).toBeOnTheScreen();
  });

  it('shows an error with Retry that reloads', async () => {
    mockStats.mockRejectedValueOnce(
      new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'x' }),
    );
    mockStats.mockResolvedValue(makeStats());
    await renderWithClient(<AdminDashboardScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Waiting for review')).toBeOnTheScreen();
  });

  it('explains a 403 without offering Retry', async () => {
    mockStats.mockRejectedValue(new AppError({ status: 403, code: 'FORBIDDEN', message: 'no' }));
    await renderWithClient(<AdminDashboardScreen />);

    expect(await screen.findByText('No access')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('renders in Vietnamese and in dark mode', async () => {
    mockStats.mockResolvedValue(makeStats());
    await renderWithClient(<AdminDashboardScreen />, { language: 'vi', theme: 'dark' });

    expect(await screen.findByText('Đang chờ duyệt')).toBeOnTheScreen();
    expect(screen.getByText('3 khóa học mới · 2 bản sửa đổi')).toBeOnTheScreen();
    await waitFor(() =>
      expect(screen.getByText('Quản trị')).toHaveStyle({ color: darkPalette.text }),
    );
  });
});
