import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { i18n } from '@/i18n';
import { AppError } from '@/lib/appError';
import type { NotificationDto } from '@/types/api';

import { NotificationsScreen } from './NotificationsScreen';

jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { FlashList: () => React.createElement(View, { testID: 'phone-list' }) };
});

const mockPush = jest.fn();
const mockMarkRead = jest.fn();
const mockMarkAllRead = jest.fn();
const mockRefetch = jest.fn();
const mockFetchNextPage = jest.fn();
const mockQuery: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPush(href),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  },
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 800, scale: 1, fontScale: 1 })),
}));
jest.mock('../hooks', () => ({
  useNotificationsInfinite: () => mockQuery,
  useMarkRead: () => ({ mutate: mockMarkRead }),
  useMarkAllRead: () => ({ mutate: mockMarkAllRead }),
}));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;

const NOW = new Date();
const YESTERDAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 1, 12, 0, 0);
const LAST_MONTH = new Date(NOW.getFullYear(), NOW.getMonth() - 1, 3, 12, 0, 0);

function notification(overrides: Partial<NotificationDto>): NotificationDto {
  return {
    id: 'n1',
    type: 'SYSTEM',
    title: 'Welcome',
    body: 'Thanks for joining',
    data: null,
    isRead: false,
    createdAt: NOW.toISOString(),
    ...overrides,
  };
}

function setQuery(items: NotificationDto[], unreadCount: number, extra = {}) {
  Object.keys(mockQuery).forEach((key) => delete mockQuery[key]);
  Object.assign(mockQuery, {
    data: {
      pages: [
        {
          data: items,
          meta: { page: 1, limit: 20, total: items.length, totalPages: 1, unreadCount },
        },
      ],
    },
    isPending: false,
    isError: false,
    isRefetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    refetch: mockRefetch,
    fetchNextPage: mockFetchNextPage,
    ...extra,
  });
}

function setWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 800, scale: 1, fontScale: 1 });
}

describe('NotificationsScreen on a wide window', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    setWidth(1280);
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('shows a skeleton while loading', async () => {
    setQuery([], 0, { data: undefined, isPending: true });
    await render(<NotificationsScreen />);

    expect(screen.getByTestId('notifications-skeleton')).toBeOnTheScreen();
  });

  it('shows an error with Retry', async () => {
    setQuery([], 0, {
      data: undefined,
      isError: true,
      error: new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'x' }),
    });
    await render(<NotificationsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows an empty state and disables Mark all as read', async () => {
    setQuery([], 0);
    await render(<NotificationsScreen />);

    expect(screen.getByText('No notifications yet')).toBeOnTheScreen();
    expect(screen.getByTestId('notifications-mark-all')).toBeDisabled();
  });

  it('groups the list by day, with the unread count in the title row', async () => {
    setQuery(
      [
        notification({ id: 'n1', title: 'Order paid' }),
        notification({ id: 'n2', title: 'New answer', createdAt: YESTERDAY.toISOString() }),
        notification({
          id: 'n3',
          title: 'Old news',
          isRead: true,
          createdAt: LAST_MONTH.toISOString(),
        }),
      ],
      2,
    );
    await render(<NotificationsScreen />);

    expect(screen.getByRole('header', { name: 'Notifications' })).toBeOnTheScreen();
    expect(screen.getByText('2 unread')).toBeOnTheScreen();
    expect(screen.getByTestId('notifications-group-today')).toBeOnTheScreen();
    expect(screen.getByTestId('notifications-group-yesterday')).toBeOnTheScreen();
    expect(screen.getByTestId('notifications-group-earlier')).toBeOnTheScreen();
    expect(screen.getByText('Today')).toBeOnTheScreen();
    expect(screen.getByText('Yesterday')).toBeOnTheScreen();
    expect(screen.getByText('Earlier')).toBeOnTheScreen();
    // The two unread rows have a dot, the read one does not.
    expect(screen.getAllByTestId('unread-dot')).toHaveLength(2);
  });

  it('marks a notification read and opens its target', async () => {
    setQuery(
      [
        notification({
          id: 'n1',
          type: 'NEW_ANSWER',
          title: 'New answer',
          data: { questionId: 'q1', courseId: 'c1' },
        }),
      ],
      1,
    );
    await render(<NotificationsScreen />);

    await fireEvent.press(screen.getByTestId('notification-row-n1'));

    expect(mockMarkRead).toHaveBeenCalledWith('n1');
    expect(mockPush).toHaveBeenCalledWith('/question/q1?courseId=c1');
  });

  it('does not mark an already read notification again', async () => {
    setQuery([notification({ id: 'n1', isRead: true, data: { courseId: 'c1' } })], 0);
    await render(<NotificationsScreen />);

    await fireEvent.press(screen.getByTestId('notification-row-n1'));

    expect(mockMarkRead).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/course/c1');
  });

  it('marks all as read from the title row', async () => {
    setQuery([notification({ id: 'n1' })], 1);
    await render(<NotificationsScreen />);

    await fireEvent.press(screen.getByTestId('notifications-mark-all'));
    expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('loads the next page with See more', async () => {
    setQuery([notification({ id: 'n1' })], 1, { hasNextPage: true });
    await render(<NotificationsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'See more' }));
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('speaks Vietnamese when the language is switched', async () => {
    await act(async () => {
      await i18n.changeLanguage('vi');
    });
    setQuery([notification({ id: 'n1' })], 1);
    await render(<NotificationsScreen />);

    expect(screen.getByText('Hôm nay')).toBeOnTheScreen();
    expect(screen.getByText('1 chưa đọc')).toBeOnTheScreen();
  });

  it('keeps the phone list below 768 wide', async () => {
    setWidth(390);
    setQuery([notification({ id: 'n1' })], 1);
    await render(<NotificationsScreen />);

    expect(screen.getByTestId('phone-list')).toBeOnTheScreen();
    expect(screen.queryByTestId('notifications-desktop')).not.toBeOnTheScreen();
  });
});
