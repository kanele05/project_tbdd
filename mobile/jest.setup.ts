import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { act } from '@testing-library/react-native';
import '@testing-library/react-native/matchers';

import { i18n } from '@/i18n';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

// Tests run on an English device so text assertions are stable ("Log in", "Retry"...).
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [
    {
      languageCode: 'en',
      languageTag: 'en-US',
      regionCode: 'US',
      textDirection: 'ltr',
      digitGroupingSeparator: ',',
      decimalSeparator: '.',
    },
  ]),
  getCalendars: jest.fn(() => [{ calendar: 'gregory', timeZone: 'UTC', uses24hourClock: true }]),
  useLocales: jest.fn(),
  useCalendars: jest.fn(),
}));

jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: jest.fn(() => Promise.resolve()),
  getBackgroundColorAsync: jest.fn(() => Promise.resolve(null)),
}));

// A test that switches the language must not leak it into the next one.
afterEach(async () => {
  if (i18n.language !== 'en') {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  }
});
