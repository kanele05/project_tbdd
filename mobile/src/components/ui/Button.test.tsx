import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import { lightPalette, radius, shadows } from '@/theme';

import { Button } from './Button';

describe('Button', () => {
  it('renders the title and fires onPress', async () => {
    const onPress = jest.fn();
    await render(<Button title="Log in" onPress={onPress} />);

    expect(screen.getByText('Log in')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress while loading and shows a spinner', async () => {
    const onPress = jest.fn();
    await render(<Button title="Log in" onPress={onPress} loading />);

    expect(screen.getByTestId('button-spinner')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not fire onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button title="Save" onPress={onPress} disabled />);

    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Button (concept B)', () => {
  it('is a pill: neon fill with a dark label for primary, 52 dp tall (40 dp small)', async () => {
    await renderWithProviders(
      <>
        <Button title="Primary" />
        <Button title="Small" size="sm" />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Primary' })).toHaveStyle({
      backgroundColor: lightPalette.primary,
      borderRadius: radius.pill,
      minHeight: 52,
    });
    expect(screen.getByText('Primary')).toHaveStyle({ color: lightPalette.onPrimary });
    expect(screen.getByRole('button', { name: 'Small' })).toHaveStyle({ minHeight: 40 });
  });

  it('labels in Be Vietnam Pro bold (never the serif)', async () => {
    await renderWithProviders(<Button title="Go" />);
    expect(screen.getByText('Go')).toHaveStyle({ fontFamily: 'BeVietnamPro_700Bold' });
  });

  it('draws the neon glow behind primary buttons in dark mode only', async () => {
    const { unmount } = await renderWithProviders(<Button title="Glow" />, { theme: 'dark' });
    expect(
      StyleSheet.flatten(screen.getByRole('button', { name: 'Glow' }).props.style).boxShadow,
    ).toBe(shadows.glow.boxShadow);
    unmount();

    await renderWithProviders(<Button title="Flat" />, { theme: 'light' });
    expect(
      StyleSheet.flatten(screen.getByRole('button', { name: 'Flat' }).props.style).boxShadow,
    ).toBeUndefined();
  });

  it('paints secondary as a raised neutral pill and outline / ghost with the accent text', async () => {
    await renderWithProviders(
      <>
        <Button title="Secondary" variant="secondary" />
        <Button title="Outline" variant="outline" />
        <Button title="Ghost" variant="ghost" />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Secondary' })).toHaveStyle({
      backgroundColor: lightPalette.surface,
      borderColor: lightPalette.border,
    });
    expect(screen.getByRole('button', { name: 'Outline' })).toHaveStyle({
      borderColor: lightPalette.primaryText,
    });
    expect(screen.getByText('Ghost')).toHaveStyle({ color: lightPalette.primaryText });
  });
});
