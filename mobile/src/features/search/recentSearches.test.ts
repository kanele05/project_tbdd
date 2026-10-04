import AsyncStorage from '@react-native-async-storage/async-storage';
import { waitFor } from '@testing-library/react-native';

import { MAX_RECENT_SEARCHES, STORAGE_KEYS } from '@/constants/config';

import { addRecentKeyword, resetRecentSearchesForTest, useRecentSearches } from './recentSearches';

describe('addRecentKeyword', () => {
  it('puts the newest keyword first and trims it', () => {
    expect(addRecentKeyword(['react'], '  python ')).toEqual(['python', 'react']);
  });

  it('moves a repeated keyword to the top without regard to case', () => {
    expect(addRecentKeyword(['react', 'python'], 'PYTHON')).toEqual(['PYTHON', 'react']);
  });

  it('ignores a blank keyword', () => {
    expect(addRecentKeyword(['react'], '   ')).toEqual(['react']);
  });

  it('keeps at most the configured number of keywords', () => {
    const full = Array.from({ length: MAX_RECENT_SEARCHES }, (_, index) => `k${index}`);
    const next = addRecentKeyword(full, 'new');
    expect(next).toHaveLength(MAX_RECENT_SEARCHES);
    expect(next[0]).toBe('new');
    expect(next).not.toContain(`k${MAX_RECENT_SEARCHES - 1}`);
  });
});

describe('useRecentSearches', () => {
  beforeEach(async () => {
    await resetRecentSearchesForTest();
  });

  it('saves every change to AsyncStorage', async () => {
    await useRecentSearches.getState().hydrate();
    useRecentSearches.getState().add('react');
    useRecentSearches.getState().add('python');
    useRecentSearches.getState().remove('react');

    expect(useRecentSearches.getState().keywords).toEqual(['python']);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.recentSearches)).toBe('["python"]');
  });

  it('waits for the saved history before adding, so nothing is overwritten', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.recentSearches, JSON.stringify(['java', 'sql']));
    useRecentSearches.getState().add('go');

    await useRecentSearches.getState().hydrate();
    await waitFor(() =>
      expect(useRecentSearches.getState().keywords).toEqual(['go', 'java', 'sql']),
    );
    expect(useRecentSearches.getState().isHydrated).toBe(true);
  });

  it('starts empty when the saved value is not a list of strings', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.recentSearches, '{"oops":1}');

    await useRecentSearches.getState().hydrate();

    expect(useRecentSearches.getState().keywords).toEqual([]);
  });

  it('clears the history', async () => {
    await useRecentSearches.getState().hydrate();
    useRecentSearches.getState().add('react');
    useRecentSearches.getState().clear();
    expect(useRecentSearches.getState().keywords).toEqual([]);
  });
});
