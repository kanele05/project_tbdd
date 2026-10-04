import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { i18n } from '@/i18n';
import { AppError } from '@/lib/appError';
import type { NotificationDto } from '@/types/api';

import { NotificationsScreen } from './NotificationsScreen';

jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  // Minimal stand-in: FlashList needs real layout measurements that jest does not provide.
  return {
    FlashList: (props: {
      data: unknown[];
      renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
      keyExtractor?: (item: unknown, index: number) => string;
      ListEmptyComponent?: React.ReactNode;
      ListFooterComponent?: React.ReactNode;
    }) =>
      React.createElement(
        View,
        null,
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
const mockMarkRead = jest.fn();
const mockMarkAllRead = jest.fn();
const mockRefetch = jest.fn();
const mockQuery: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPush(href),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  },
}));

jest.mock('../hooks', () => ({
  useNotificationsInfinite: () => mockQuery,
  useMarkRead: () => ({ mutate: mockMarkRead }),
  useMarkAllRead: () => ({ mutate: mockMarkAllRead }),
}));

const NOW = new Date().toISOString();

function notification(overrides: Partial<NotificationDto>): NotificationDto {
  return {
    id: 'n1',
    type: 'SYSTEM',
    title: 'Welcome',
    body: 'Thanks for joining',
    data: null,
    isRead: false,
    createdAt: NOW,
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
    fetchNextPage: jest.fn(),
    ...extra,
  });
}

describe('NotificationsScreen', () => {
  beforeEach(() => jest.clearAllMocks());

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
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
  });

  it('speaks Vietnamese when the language is switched', async () => {
    await act(async () => {
      await i18n.changeLanguage('vi');
    });
    setQuery([notification({ id: 'n1', title: 'Order paid', isRead: false })], 1);
    await render(<NotificationsScreen />);

    expect(screen.getByText('Thông báo')).toBeOnTheScreen();
    expect(screen.getByText('1 chưa đọc')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' })).toBeOnTheScreen();
  });

  it('renders items with a dot only for unread ones', async () => {
    setQuery(
      [
        notification({ id: 'n1', title: 'Order paid', isRead: false }),
        notification({ id: 'n2', title: 'Old news', isRead: true }),
      ],
      1,
    );
    await render(<NotificationsScreen />);

    expect(screen.getByText('Order paid')).toBeOnTheScreen();
    expect(screen.getByText('Old news')).toBeOnTheScreen();
    expect(screen.getAllByTestId('unread-dot')).toHaveLength(1);
    expect(screen.getByText('1 unread')).toBeOnTheScreen();
  });

  it('marks an unread notification read and opens its question', async () => {
    setQuery(
      [
        notification({
          id: 'n1',
          type: 'NEW_ANSWER',
          title: 'New answer',
          data: { courseId: 'c1', questionId: 'q1' },
        }),
      ],
      1,
    );
    await render(<NotificationsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /New answer/ }));

    expect(mockMarkRead).toHaveBeenCalledWith('n1');
    expect(mockPush).toHaveBeenCalledWith('/question/q1');
  });

  it('opens the course for a course notification without re-marking a read one', async () => {
    setQuery(
      [
        notification({
          id: 'n2',
          type: 'COURSE_COMPLETED',
          title: 'Course completed',
          isRead: true,
          data: { courseId: 'c9' },
        }),
      ],
      0,
    );
    await render(<NotificationsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /Course completed/ }));

    expect(mockMarkRead).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/course/c9');
  });

  it('marks everything read from the toolbar', async () => {
    setQuery([notification({ id: 'n1' })], 1);
    await render(<NotificationsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Mark all as read' }));

    expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
  });
});
