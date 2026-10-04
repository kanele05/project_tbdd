import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

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
}));
jest.mock('../api', () => ({
  searchApi: { courses: jest.fn(), categories: jest.fn(), hotTags: jest.fn() },
}));
jest.mock('@/features/home/api', () => ({ homeApi: { get: jest.fn() } }));
jest.mock('@/features/bookmark/hooks', () => ({
  useToggleBookmark: () => ({ toggleBookmark: jest.fn(), isPending: false }),
}));

const mockCourses = searchApi.courses as jest.Mock;
const mockPush = router.push as jest.Mock;

const DESIGN_COURSES = [
  makeCourse({ id: 'd1', title: 'UX Foundation' }),
  makeCourse({ id: 'd2', title: 'Design Basics' }),
];

describe('SearchScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    useSearchFilterStore.getState().reset();
    await resetRecentSearchesForTest();
    (searchApi.categories as jest.Mock).mockResolvedValue(SAMPLE_CATEGORIES);
    (searchApi.hotTags as jest.Mock).mockResolvedValue(SAMPLE_TAGS);
    (homeApi.get as jest.Mock).mockResolvedValue(makeHome());
    mockCourses.mockResolvedValue(makePage(DESIGN_COURSES, { total: 120, totalPages: 6 }));
  });

  it('shows hot topics, categories and recommended courses while the field is empty', async () => {
    await renderWithClient(<SearchScreen />);

    expect(await screen.findByText('Hot topics')).toBeOnTheScreen();
    expect(await screen.findByRole('button', { name: 'Java' })).toBeOnTheScreen();
    expect(await screen.findByRole('button', { name: 'Business, 6 courses' })).toBeOnTheScreen();
    expect(await screen.findByText('Website Design')).toBeOnTheScreen();
    expect(mockCourses).not.toHaveBeenCalled();
  });

  it('fills the keyword and shows the result count when a hot topic is pressed', async () => {
    await renderWithClient(<SearchScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Java' }));

    expect(await screen.findByText('120 Results')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Java')).toBeOnTheScreen();
    expect(screen.getByText('UX Foundation')).toBeOnTheScreen();
    expect(mockCourses).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'Java', page: 1, limit: 20 }),
    );
  });

  it('debounces typing: one request with the final keyword', async () => {
    await renderWithClient(<SearchScreen />);
    const input = screen.getByLabelText('Search course');

    await fireEvent.changeText(input, 'd');
    await fireEvent.changeText(input, 'de');
    await fireEvent.changeText(input, 'des');
    expect(mockCourses).not.toHaveBeenCalled();

    await waitFor(() => expect(mockCourses).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(mockCourses).toHaveBeenCalledWith(expect.objectContaining({ q: 'des' }));
  });

  it('searches immediately when the keyboard search key is pressed', async () => {
    await renderWithClient(<SearchScreen />);
    const input = screen.getByLabelText('Search course');

    await fireEvent.changeText(input, 'python');
    await act(async () => {
      fireEvent(input, 'submitEditing');
    });

    await waitFor(() =>
      expect(mockCourses).toHaveBeenCalledWith(expect.objectContaining({ q: 'python' })),
    );
  });

  it('shows "No courses found" with hot topic suggestions when nothing matches', async () => {
    mockCourses.mockResolvedValue(makePage([], { total: 0, totalPages: 0 }));
    await renderWithClient(<SearchScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'SQL' }));

    expect(await screen.findByText('No courses found')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Java' })).toBeOnTheScreen();
  });

  it('switches to results with a filter badge when filters are active', async () => {
    useSearchFilterStore.getState().apply({ categoryIds: ['cat_design'], minRating: 4.5 });
    await renderWithClient(<SearchScreen />);

    expect(await screen.findByText('120 Results')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Filter, 2 active' })).toBeOnTheScreen();
    expect(mockCourses).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'cat_design', minRating: 4.5, sort: 'popular' }),
    );
  });

  it('opens the filter modal with the current keyword', async () => {
    await renderWithClient(<SearchScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Java' }));
    await screen.findByText('120 Results');
    await fireEvent.press(screen.getByRole('button', { name: 'Filter' }));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/search-filter', params: { q: 'Java' } });
  });

  it('returns to discovery when the keyword is cleared and no filter is active', async () => {
    await renderWithClient(<SearchScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Java' }));
    await screen.findByText('120 Results');

    await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));

    expect(await screen.findByText('Hot topics')).toBeOnTheScreen();
  });
  it('remembers searches and lists them as recent searches', async () => {
    await renderWithClient(<SearchScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Java' }));
    await screen.findByText('120 Results');

    await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));

    expect(await screen.findByText('Recent searches')).toBeOnTheScreen();
    // The chip in "Hot topics" and the recent row share the label: the row has the clock icon.
    expect(screen.getAllByRole('button', { name: 'Java' })).toHaveLength(2);
  });

  it('forgets a recent search with its remove button', async () => {
    await renderWithClient(<SearchScreen />);
    const input = screen.getByLabelText('Search course');
    await fireEvent.changeText(input, 'python');
    await act(async () => {
      fireEvent(input, 'submitEditing');
    });
    await screen.findByText('120 Results');
    await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Remove python from recent searches' }),
    );
    expect(screen.queryByText('Recent searches')).not.toBeOnTheScreen();
  });

  it('re-runs a recent search when it is pressed', async () => {
    await renderWithClient(<SearchScreen />);
    const input = screen.getByLabelText('Search course');
    await fireEvent.changeText(input, 'python');
    await act(async () => {
      fireEvent(input, 'submitEditing');
    });
    await screen.findByText('120 Results');
    await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));

    await fireEvent.press(await screen.findByRole('button', { name: 'python' }));

    expect(await screen.findByText('120 Results')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('python')).toBeOnTheScreen();
  });

  it('changes the sort order from the quick sort chips', async () => {
    await renderWithClient(<SearchScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Java' }));
    await screen.findByText('120 Results');

    await fireEvent.press(screen.getByRole('button', { name: 'Newest' }));

    await waitFor(() =>
      expect(mockCourses).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'Java', sort: 'newest' }),
      ),
    );
    expect(useSearchFilterStore.getState().sort).toBe('newest');
  });

  it('renders the discovery screen in Vietnamese', async () => {
    await renderWithClient(<SearchScreen />, { language: 'vi' });

    expect(await screen.findByText('Chủ đề nổi bật')).toBeOnTheScreen();
    expect(await screen.findByRole('button', { name: 'Business, 6 khóa học' })).toBeOnTheScreen();
  });
});
