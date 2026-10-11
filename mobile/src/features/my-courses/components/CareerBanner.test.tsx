import { fireEvent, screen } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';

import { renderWithProviders } from '@/test/renderWithProviders';
import { darkPalette } from '@/theme';

import { CareerBanner } from './CareerBanner';

let mockIsReducedMotion = false;
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    useReducedMotion: () => mockIsReducedMotion,
    withRepeat: jest.fn(actual.withRepeat),
  };
});

const mockWithRepeat = Reanimated.withRepeat as jest.Mock;

describe('CareerBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsReducedMotion = false;
  });

  it('shows the headline and a call to action that opens the search', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<CareerBanner onPress={onPress} />, { theme: 'dark' });

    expect(
      screen.getByRole('header', { name: 'Courses that boost your career!' }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Check Now' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses the Vietnamese copy', async () => {
    await renderWithProviders(<CareerBanner onPress={jest.fn()} />, {
      theme: 'dark',
      language: 'vi',
    });

    expect(screen.getByRole('button', { name: 'Khám phá ngay' })).toBeOnTheScreen();
  });

  it('stays dark in light mode (dark text colors on the dark surface)', async () => {
    await renderWithProviders(<CareerBanner onPress={jest.fn()} />, { theme: 'light' });

    expect(screen.getByText('Courses that boost your career!')).toHaveStyle({
      color: darkPalette.text,
    });
  });

  it('draws the trend line and the glow, and loops them', async () => {
    await renderWithProviders(<CareerBanner onPress={jest.fn()} />, { theme: 'dark' });

    expect(screen.getByTestId('banner-trend', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId('banner-glow', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(mockWithRepeat).toHaveBeenCalledTimes(2);
  });

  it('shows a static frame under Reduce Motion (no animation is started)', async () => {
    mockIsReducedMotion = true;
    await renderWithProviders(<CareerBanner onPress={jest.fn()} />, { theme: 'dark' });

    expect(screen.getByTestId('banner-trend', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(mockWithRepeat).not.toHaveBeenCalled();
  });
});
