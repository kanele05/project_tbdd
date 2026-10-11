import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { makeCourse } from '@/components/course/courseFixtures';
import { homeApi } from '@/features/home/api';
import { useSearchFilterStore } from '@/stores/searchFilterStore';

import { searchApi } from '../api';
import { resetRecentSearchesForTest } from '../recentSearches';
import { SAMPLE_CATEGORIES, SAMPLE_TAGS, makeHome, makePage, renderWithClient } from '../testUtils';
import { SearchScreen } from './SearchScreen';

jest.mock('@shopify/flash-list', () => jest.requireActual('@/features/search/flashListMock'));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 800, scale: 1, fontScale: 1 })),
}));
jest.mock('../api', () => ({
  searchApi: { courses: jest.fn(), categories: jest.fn(), hotTags: jest.fn() },
}));
jest.mock('@/features/home/api', () => ({ homeApi: { get: jest.fn() } }));
jest.mock('@/features/bookmark/hooks', () => ({
  useToggleBookmark: () => ({ toggleBookmark: jest.fn(), isPending: false }),
}));
jest.mock('@/features/cart/hooks', () => ({
  useAddToCart: () => ({ mutateAsync: jest.fn() }),
}));

const mockCourses = searchApi.courses as jest.Mock;
const mockParams = useLocalSearchParams as jest.Mock;
const mockPush = router.push as jest.Mock;
const mockUseWindowDimensions = useWindowDimensions as jest.Mock;

const RESULTS = [
  makeCourse({ id: 'd1', title: 'UX Foundation' }),
  makeCourse({ id: 'd2', title: 'Design Basics' }),
];

function setWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 800, scale: 1, fontScale: 1 });
}

describe('SearchScreen on a wide window', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    setWidth(1280);
    mockParams.mockReturnValue({});
    useSearchFilterStore.getState().reset();
    await resetRecentSearchesForTest();
    (searchApi.categories as jest.Mock).mockResolvedValue(SAMPLE_CATEGORIES);
    (searchApi.hotTags as jest.Mock).mockResolvedValue(SAMPLE_TAGS);
    (homeApi.get as jest.Mock).mockResolvedValue(makeHome());
    mockCourses.mockResolvedValue(makePage(RESULTS, { total: 120, totalPages: 6 }));
  });

  it('shows the filter toolbar, hot topics, categories and a recommended row without searching', async () => {
    await renderWithClient(<SearchScreen />);

    expect(await screen.findByText('Hot topics')).toBeOnTheScreen();
    expect(screen.getByTestId('desktop-filter-bar')).toBeOnTheScreen();
    expect(await screen.findByText('Website Design')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Filter' })).not.toBeOnTheScreen();
    expect(mockCourses).not.toHaveBeenCalled();
  });

  it('searches the keyword of the URL (?q=) and lists the results as a grid', async () => {
    mockParams.mockReturnValue({ q: 'react' });
    await renderWithClient(<SearchScreen />);

    expect(await screen.findByText('120 Results')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('react')).toBeOnTheScreen();
    expect(screen.getByTestId('results-grid')).toBeOnTheScreen();
    expect(screen.getByText('UX Foundation')).toBeOnTheScreen();
    expect(mockCourses).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'react', page: 1, limit: 20 }),
    );
  });

  it('follows the URL when the top navigation searches again', async () => {
    mockParams.mockReturnValue({ q: 'react' });
    const { rerender } = await renderWithClient(<SearchScreen />);
    await screen.findByText('120 Results');

    mockParams.mockReturnValue({ q: 'python' });
    await rerender(<SearchScreen />);

    await waitFor(() =>
      expect(mockCourses).toHaveBeenCalledWith(expect.objectContaining({ q: 'python' })),
    );
    expect(screen.getByDisplayValue('python')).toBeOnTheScreen();
  });

  it('applies the sort and price chips of the toolbar to the request', async () => {
    mockParams.mockReturnValue({ q: 'react' });
    await renderWithClient(<SearchScreen />);
    await screen.findByText('120 Results');

    await fireEvent.press(screen.getByRole('button', { name: 'Lowest price' }));
    await waitFor(() =>
      expect(mockCourses).toHaveBeenCalledWith(expect.objectContaining({ sort: 'price_asc' })),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Free' }));
    await waitFor(() =>
      expect(mockCourses).toHaveBeenCalledWith(expect.objectContaining({ isFree: true })),
    );
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeOnTheScreen();
  });

  it('opens the course of a result card', async () => {
    mockParams.mockReturnValue({ q: 'react' });
    await renderWithClient(<SearchScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: /^UX Foundation, by/ }));
    expect(mockPush).toHaveBeenLastCalledWith('/course/d1');
  });

  it('shows the empty state with hot topics when nothing matches', async () => {
    mockParams.mockReturnValue({ q: 'zzz' });
    mockCourses.mockResolvedValue(makePage([], { total: 0, totalPages: 0 }));
    await renderWithClient(<SearchScreen />);

    expect(await screen.findByText('No courses found')).toBeOnTheScreen();
    expect(await screen.findByRole('button', { name: 'Java' })).toBeOnTheScreen();
  });

  it('shows an error with a retry button when the search fails', async () => {
    mockParams.mockReturnValue({ q: 'react' });
    mockCourses.mockRejectedValue(new Error('boom'));
    await renderWithClient(<SearchScreen />);

    expect(await screen.findByRole('button', { name: 'Retry' })).toBeOnTheScreen();
  });

  it('keeps the phone search (top bar with a Filter button, no toolbar) below 768 wide', async () => {
    setWidth(390);
    await renderWithClient(<SearchScreen />);

    expect(await screen.findByRole('button', { name: 'Filter' })).toBeOnTheScreen();
    expect(screen.queryByTestId('desktop-filter-bar')).not.toBeOnTheScreen();
  });
});
