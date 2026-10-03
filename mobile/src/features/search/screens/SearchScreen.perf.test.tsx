import { act, fireEvent, screen } from '@testing-library/react-native';
import { useMemo, useState } from 'react';
import { TextInput } from 'react-native';

import { SEARCH_DEBOUNCE_MS } from '@/constants/config';
import { homeApi } from '@/features/home/api';
import { useSearchFilterStore } from '@/stores/searchFilterStore';

import { searchApi } from '../api';
import { buildSearchParams, useAppliedFilters, useCoursesInfinite } from '../hooks';
import { SAMPLE_CATEGORIES, SAMPLE_TAGS, makeHome, makePage, renderWithClient } from '../testUtils';
import { SearchScreen } from './SearchScreen';

/**
 * M-29 (mobile): how many `GET /courses` requests does typing "javascript" cost?
 * Compares the real SearchScreen (400 ms debounce) with a baseline that searches on every
 * keystroke. Fake timers make the numbers deterministic; the table is printed for the report.
 */

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
const KEYWORD = 'javascript';

/** Baseline: the keyword goes straight into the query, so every keystroke is a request. */
function SearchWithoutDebounce() {
  const [text, setText] = useState('');
  const filters = useAppliedFilters();
  const params = useMemo(() => buildSearchParams(text.trim(), filters), [text, filters]);
  useCoursesInfinite(params, { enabled: text.trim() !== '' });
  return <TextInput accessibilityLabel="Search course" value={text} onChangeText={setText} />;
}

async function typeKeyword(delayBetweenKeysMs: number) {
  const input = screen.getByLabelText('Search course');
  for (let length = 1; length <= KEYWORD.length; length += 1) {
    await fireEvent.changeText(input, KEYWORD.slice(0, length));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(delayBetweenKeysMs);
    });
  }
  // Let the last debounce (and the mocked responses) settle.
  await act(async () => {
    await jest.advanceTimersByTimeAsync(2000);
  });
}

const results: { speed: string; withDebounce: number; withoutDebounce: number }[] = [];

describe('M-29 search requests while typing "javascript" (10 characters)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    useSearchFilterStore.getState().reset();
    (searchApi.categories as jest.Mock).mockResolvedValue(SAMPLE_CATEGORIES);
    (searchApi.hotTags as jest.Mock).mockResolvedValue(SAMPLE_TAGS);
    (homeApi.get as jest.Mock).mockResolvedValue(makeHome());
    mockCourses.mockResolvedValue(makePage([], { total: 0, totalPages: 0 }));
  });

  afterEach(async () => {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    jest.useRealTimers();
  });

  afterAll(() => {
    const rows = results.map(
      ({ speed, withDebounce, withoutDebounce }) =>
        `| ${speed} | ${withoutDebounce} | ${withDebounce} |`,
    );
    console.log(
      ['', '| Typing speed | No debounce | Debounce 400 ms |', '|---|---|---|', ...rows].join('\n'),
    );
  });

  it('uses a 400 ms debounce', () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(400);
  });

  it.each([
    { speed: '100 ms/char (fast typist)', delayMs: 100, expectedDebounced: 1 },
    { speed: '200 ms/char (normal typist)', delayMs: 200, expectedDebounced: 1 },
    { speed: '350 ms/char (slow, below 400 ms)', delayMs: 350, expectedDebounced: 1 },
    { speed: '500 ms/char (pauses longer than 400 ms)', delayMs: 500, expectedDebounced: 10 },
  ])('$speed', async ({ speed, delayMs, expectedDebounced }) => {
    // 1) real screen with debounce
    const withDebounce = await renderWithClient(<SearchScreen />);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    mockCourses.mockClear();
    await typeKeyword(delayMs);
    const debouncedRequests = mockCourses.mock.calls.length;
    await withDebounce.unmount();

    // 2) baseline without debounce
    mockCourses.mockClear();
    await renderWithClient(<SearchWithoutDebounce />);
    await typeKeyword(delayMs);
    const plainRequests = mockCourses.mock.calls.length;

    results.push({ speed, withDebounce: debouncedRequests, withoutDebounce: plainRequests });
    expect(plainRequests).toBe(KEYWORD.length);
    expect(debouncedRequests).toBe(expectedDebounced);
    expect(debouncedRequests).toBeLessThanOrEqual(plainRequests);
    // The debounced search ends on the full keyword either way.
    expect(mockCourses).toHaveBeenCalled();
  });

  it('searches the full keyword last', async () => {
    await renderWithClient(<SearchScreen />);
    mockCourses.mockClear();
    await typeKeyword(150);

    expect(mockCourses).toHaveBeenCalledTimes(1);
    expect(mockCourses).toHaveBeenLastCalledWith(expect.objectContaining({ q: KEYWORD, page: 1 }));
  });
});
