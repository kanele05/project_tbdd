import { fireEvent, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { INITIAL_SEARCH_FILTERS, useSearchFilterStore } from '@/stores/searchFilterStore';
import { confirmAction } from '@/utils/confirmAction';

import { searchApi } from '../api';
import { SAMPLE_CATEGORIES, makePage, renderWithClient } from '../testUtils';
import { SearchFilterScreen } from './SearchFilterScreen';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1280, height: 900, scale: 1, fontScale: 1 })),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('../api', () => ({
  searchApi: { courses: jest.fn(), categories: jest.fn(), hotTags: jest.fn() },
}));
jest.mock('@/utils/confirmAction', () => ({ confirmAction: jest.fn() }));

const mockBack = router.back as jest.Mock;
const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const setWidth = (width: number) =>
  mockUseWindowDimensions.mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });

describe('SearchFilterScreen on a PC window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setWidth(1280);
    useSearchFilterStore.getState().reset();
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    (searchApi.categories as jest.Mock).mockResolvedValue(SAMPLE_CATEGORIES);
    (searchApi.courses as jest.Mock).mockResolvedValue(makePage([], { total: 120 }));
  });

  it('is a dialog card with the price range and an Apply button in its footer', async () => {
    await renderWithClient(<SearchFilterScreen />);

    expect(screen.getByTestId('search-filter-dialog-card')).toBeOnTheScreen();
    await fireEvent.press(await screen.findByRole('button', { name: 'Paid' }));
    await fireEvent.changeText(screen.getByLabelText('Min ($)'), '10');
    await fireEvent.changeText(screen.getByLabelText('Max ($)'), '50');
    await fireEvent.press(screen.getByTestId('filter-apply'));

    expect(useSearchFilterStore.getState()).toMatchObject({
      price: 'paid',
      minPriceCents: 1000,
      maxPriceCents: 5000,
    });
    expect(mockBack).toHaveBeenCalled();
  });

  it('closes with the close button and the backdrop when nothing changed', async () => {
    await renderWithClient(<SearchFilterScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    await fireEvent.press(screen.getByTestId('search-filter-dialog-backdrop', { hidden: true }));

    expect(mockBack).toHaveBeenCalledTimes(2);
    expect(confirmAction).not.toHaveBeenCalled();
  });

  it('asks before discarding changes and stays open when the user keeps editing', async () => {
    (confirmAction as jest.Mock).mockResolvedValue(false);
    await renderWithClient(<SearchFilterScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Free' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(confirmAction).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Discard changes?', isDestructive: true }),
    );
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('resets the draft to the defaults', async () => {
    await renderWithClient(<SearchFilterScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Free' }));
    await fireEvent.press(screen.getByTestId('filter-reset'));
    await fireEvent.press(screen.getByTestId('filter-apply'));

    expect(useSearchFilterStore.getState().price).toBe(INITIAL_SEARCH_FILTERS.price);
  });

  it('keeps the phone layout under 768 dp', async () => {
    setWidth(390);
    await renderWithClient(<SearchFilterScreen />);

    expect(screen.queryByTestId('search-filter-dialog')).not.toBeOnTheScreen();
    expect(await screen.findByRole('button', { name: /^Apply/ })).toBeOnTheScreen();
  });
});
