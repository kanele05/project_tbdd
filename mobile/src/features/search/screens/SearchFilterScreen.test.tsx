import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { INITIAL_SEARCH_FILTERS, useSearchFilterStore } from '@/stores/searchFilterStore';

import { searchApi } from '../api';
import { SAMPLE_CATEGORIES, makePage, renderWithClient } from '../testUtils';
import { SearchFilterScreen } from './SearchFilterScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('../api', () => ({
  searchApi: { courses: jest.fn(), categories: jest.fn(), hotTags: jest.fn() },
}));

const mockCourses = searchApi.courses as jest.Mock;
const mockBack = router.back as jest.Mock;

describe('SearchFilterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSearchFilterStore.getState().reset();
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    (searchApi.categories as jest.Mock).mockResolvedValue(SAMPLE_CATEGORIES);
    mockCourses.mockResolvedValue(makePage([], { total: 120 }));
  });

  it('shows the matching result count on the Apply button', async () => {
    await renderWithClient(<SearchFilterScreen />);

    expect(await screen.findByRole('button', { name: 'Apply (120 results)' })).toBeOnTheScreen();
    expect(mockCourses).toHaveBeenCalledWith(expect.objectContaining({ limit: 1, page: 1 }));
  });

  it('counts with the keyword passed by the Search screen', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ q: 'design' });
    await renderWithClient(<SearchFilterScreen />);

    await screen.findByRole('button', { name: 'Apply (120 results)' });
    expect(mockCourses).toHaveBeenCalledWith(expect.objectContaining({ q: 'design' }));
  });

  it('applies the draft to the store and closes the modal', async () => {
    await renderWithClient(<SearchFilterScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Design' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Code' }));
    await fireEvent.press(screen.getByRole('button', { name: '4.5+' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Newest' }));
    await fireEvent.press(screen.getByRole('button', { name: /^Apply/ }));

    const state = useSearchFilterStore.getState();
    expect(state.categoryIds).toEqual(['cat_design', 'cat_code']);
    expect(state.minRating).toBe(4.5);
    expect(state.sort).toBe('newest');
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows Min/Max only for Paid and stores the range in cents', async () => {
    await renderWithClient(<SearchFilterScreen />);
    expect(screen.queryByLabelText('Min ($)')).not.toBeOnTheScreen();

    await fireEvent.press(await screen.findByRole('button', { name: 'Paid' }));
    await fireEvent.changeText(screen.getByLabelText('Min ($)'), '10');
    await fireEvent.changeText(screen.getByLabelText('Max ($)'), '50.5');
    await fireEvent.press(screen.getByRole('button', { name: /^Apply/ }));

    const state = useSearchFilterStore.getState();
    expect(state.price).toBe('paid');
    expect(state.minPriceCents).toBe(1000);
    expect(state.maxPriceCents).toBe(5050);
  });

  it('shows an error and disables Apply when Max is below Min', async () => {
    await renderWithClient(<SearchFilterScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Paid' }));
    await fireEvent.changeText(screen.getByLabelText('Min ($)'), '100');
    await fireEvent.changeText(screen.getByLabelText('Max ($)'), '20');

    expect(screen.getByText('Max must be greater than min')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('resets the draft to the defaults without touching the store until Apply', async () => {
    useSearchFilterStore.getState().apply({ price: 'free', minRating: 4 });
    await renderWithClient(<SearchFilterScreen />);

    expect(screen.getByRole('button', { name: 'Free' })).toBeSelected();
    await fireEvent.press(screen.getByRole('button', { name: 'Reset filters' }));

    expect(screen.getByRole('button', { name: 'All' })).toBeSelected();
    expect(useSearchFilterStore.getState().price).toBe('free');
    await fireEvent.press(screen.getByRole('button', { name: /^Apply/ }));
    expect(useSearchFilterStore.getState()).toMatchObject({
      price: INITIAL_SEARCH_FILTERS.price,
      minRating: null,
    });
  });

  it('closes straight away without changes, and asks to discard with changes', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderWithClient(<SearchFilterScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();

    await fireEvent.press(await screen.findByRole('button', { name: 'Free' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Discard changes?',
        expect.any(String),
        expect.any(Array),
        expect.any(Object),
      ),
    );
    expect(mockBack).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });
  it('shows the filter labels in Vietnamese', async () => {
    await renderWithClient(<SearchFilterScreen />, { language: 'vi' });

    expect(await screen.findByRole('button', { name: 'Áp dụng (120 kết quả)' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Miễn phí' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Mới nhất' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Đặt lại bộ lọc' })).toBeOnTheScreen();
  });
});
