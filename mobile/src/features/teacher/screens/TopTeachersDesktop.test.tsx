import { fireEvent, render, screen } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { AppError } from '@/lib/appError';
import type { TeacherSummary } from '@/types/api';

import { TopTeachersScreen } from './TopTeachersScreen';

jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    FlashList: (props: {
      data: unknown[];
      renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
    }) =>
      React.createElement(
        View,
        { testID: 'phone-list' },
        props.data.map((item, index) =>
          React.createElement(React.Fragment, { key: index }, props.renderItem({ item, index })),
        ),
      ),
  };
});

const mockPush = jest.fn();
const mockRefetch = jest.fn();
const mockFetchNextPage = jest.fn();

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

const mockQuery: Record<string, unknown> = {};
jest.mock('../hooks', () => ({ useTeachersInfinite: () => mockQuery }));

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;

function teacher(id: string, fullName: string): TeacherSummary {
  return { id, fullName, avatarUrl: null, organization: 'MIT', ratingAvg: 4.5, ratingCount: 10 };
}

function setQuery(state: Record<string, unknown>) {
  Object.keys(mockQuery).forEach((key) => delete mockQuery[key]);
  Object.assign(mockQuery, {
    isPending: false,
    isError: false,
    isRefetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    refetch: mockRefetch,
    fetchNextPage: mockFetchNextPage,
    ...state,
  });
}

const page = (data: TeacherSummary[]) => ({
  pages: [{ data, meta: { page: 1, limit: 20, total: data.length, totalPages: 1 } }],
});

function setWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 800, scale: 1, fontScale: 1 });
}

describe('TopTeachersScreen on a wide window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
  });

  it('shows a skeleton grid while loading', async () => {
    setQuery({ isPending: true });
    await render(<TopTeachersScreen />);

    expect(screen.getByTestId('top-teachers-skeleton')).toBeOnTheScreen();
  });

  it('shows an error with Retry', async () => {
    setQuery({
      isError: true,
      error: new AppError({ status: 0, code: 'NETWORK_ERROR', message: 'x' }),
    });
    await render(<TopTeachersScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows an empty state without teachers', async () => {
    setQuery({ data: page([]) });
    await render(<TopTeachersScreen />);

    expect(await screen.findByText('No teachers yet')).toBeOnTheScreen();
  });

  it('renders the teachers in a grid, opens a profile and loads more', async () => {
    setQuery({
      data: page([teacher('t1', 'Sara Weise'), teacher('t2', 'Olivia Wang')]),
      hasNextPage: true,
    });
    await render(<TopTeachersScreen />);

    expect(screen.getByRole('header', { name: 'Top teachers' })).toBeOnTheScreen();
    expect(screen.getByTestId('top-teachers-grid')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /Olivia Wang/ }));
    expect(mockPush).toHaveBeenCalledWith('/teacher/t2');

    await fireEvent.press(screen.getByRole('button', { name: 'Load more' }));
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('keeps the phone list below 768 wide', async () => {
    setWidth(390);
    setQuery({ data: page([teacher('t1', 'Sara Weise')]) });
    await render(<TopTeachersScreen />);

    expect(screen.getByTestId('phone-list')).toBeOnTheScreen();
    expect(screen.queryByTestId('top-teachers-grid')).not.toBeOnTheScreen();
  });
});
