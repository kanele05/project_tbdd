import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { Pressable, Text } from 'react-native';

import { ErrorState } from '@/components/ui/ErrorState';
import { STORAGE_KEYS } from '@/constants/config';
import {
  renderHookWithProviders,
  renderWithProviders,
  resetTestPreferences,
} from '@/test/renderWithProviders';
import { formatPrice } from '@/utils/formatPrice';

import { useTranslation } from './index';
import { useLanguage } from './useLanguage';

const mockGetLocales = getLocales as jest.Mock;

function Probe() {
  const { t } = useTranslation('auth');
  const { language, preference, setPreference } = useLanguage();
  return (
    <>
      <Text testID="language">{`${language}/${preference}`}</Text>
      <Text testID="title">{t('welcomeBack')}</Text>
      <Text testID="price">{formatPrice(7375)}</Text>
      <Pressable onPress={() => setPreference('vi')} testID="to-vi">
        <Text>vi</Text>
      </Pressable>
      <Pressable onPress={() => setPreference('en')} testID="to-en">
        <Text>en</Text>
      </Pressable>
      <Pressable onPress={() => setPreference('system')} testID="to-system">
        <Text>system</Text>
      </Pressable>
    </>
  );
}

describe('switching the language', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetTestPreferences();
    mockGetLocales.mockReturnValue([{ languageCode: 'en', languageTag: 'en-US' }]);
  });

  it('re-renders the screen in the new language, back and forth', async () => {
    await renderWithProviders(<Probe />);
    expect(screen.getByTestId('title')).toHaveTextContent('Welcome back!');
    expect(screen.getByTestId('price')).toHaveTextContent('$73.75');

    await fireEvent.press(screen.getByTestId('to-vi'));
    expect(await screen.findByText('Chào mừng trở lại!')).toBeOnTheScreen();
    expect(screen.getByTestId('language')).toHaveTextContent('vi/vi');
    expect(screen.getByTestId('price')).toHaveTextContent('$73,75');

    await fireEvent.press(screen.getByTestId('to-en'));
    expect(await screen.findByText('Welcome back!')).toBeOnTheScreen();
    expect(screen.getByTestId('language')).toHaveTextContent('en/en');
    expect(screen.getByTestId('price')).toHaveTextContent('$73.75');
  });

  it('updates shared components that were already on screen', async () => {
    await renderWithProviders(
      <>
        <Probe />
        <ErrorState onRetry={jest.fn()} />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Retry' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('to-vi'));

    expect(await screen.findByRole('button', { name: 'Thử lại' })).toBeOnTheScreen();
    expect(screen.getByText('Không tải được nội dung này')).toBeOnTheScreen();
  });

  it('remembers the choice for the next launch', async () => {
    await renderWithProviders(<Probe />);
    await fireEvent.press(screen.getByTestId('to-vi'));
    await expect(AsyncStorage.getItem(STORAGE_KEYS.language)).resolves.toBe('vi');
  });

  it('follows the device language again when set back to "system"', async () => {
    mockGetLocales.mockReturnValue([{ languageCode: 'vi', languageTag: 'vi-VN' }]);
    await renderWithProviders(<Probe />);
    await fireEvent.press(screen.getByTestId('to-en'));
    expect(await screen.findByText('Welcome back!')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('to-system'));

    expect(await screen.findByText('Chào mừng trở lại!')).toBeOnTheScreen();
    expect(screen.getByTestId('language')).toHaveTextContent('vi/system');
  });
});

describe('useLanguage', () => {
  beforeEach(() => resetTestPreferences());

  it('exposes the resolved language and the stored preference', async () => {
    const { result } = await renderHookWithProviders(() => useLanguage(), { language: 'vi' });
    expect(result.current.language).toBe('vi');
    expect(result.current.preference).toBe('vi');

    await act(async () => result.current.setPreference('en'));
    expect(result.current.language).toBe('en');
    expect(result.current.preference).toBe('en');
  });
});
