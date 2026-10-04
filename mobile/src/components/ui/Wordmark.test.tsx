import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import { darkPalette } from '@/theme';

import { Wordmark, WORDMARK_TEXT } from './Wordmark';

describe('Wordmark', () => {
  it('is announced as one image named "elearn"', async () => {
    await renderWithProviders(<Wordmark testID="wordmark" />);
    expect(screen.getByLabelText(WORDMARK_TEXT)).toBeOnTheScreen();
    expect(screen.getByTestId('wordmark').props.accessibilityRole).toBe('image');
  });

  it('keeps the neon dot after the text in light mode too (brand color, not theme color)', async () => {
    await renderWithProviders(<Wordmark testID="wordmark" />, { theme: 'light' });
    expect(JSON.stringify(screen.toJSON())).toContain(darkPalette.primary);
  });

  it('scales the text with the size prop', async () => {
    await renderWithProviders(<Wordmark size={40} />, { theme: 'dark' });
    expect(JSON.stringify(screen.toJSON())).toContain('"fontSize":40');
  });
});
