import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppError } from '@/lib/appError';
import type { TeacherSummary } from '@/types/api';

import { TopTeachersScreen } from './TopTeachersScreen';

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

const mockQuery: Record<string, unknown> = {};

jest.mock('../hooks', () => ({
  useTeachersInfinite: () => mockQuery,
}));

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

describe('TopTeachersScreen', () => {
  beforeEach(() => jest.clearAllMocks());

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

  it('renders the teachers and opens a profile on tap', async () => {
    setQuery({ data: page([teacher('t1', 'Sara Weise'), teacher('t2', 'Olivia Wang')]) });
    await render(<TopTeachersScreen />);

    expect(await screen.findByText('Sara Weise')).toBeOnTheScreen();
    expect(screen.getByText('Olivia Wang')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: /Olivia Wang/ }));
    expect(mockPush).toHaveBeenCalledWith('/teacher/t2');
  });
});
