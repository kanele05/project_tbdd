import { render, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import { lightPalette } from '@/theme';

import { Avatar, getInitials } from './Avatar';

describe('getInitials', () => {
  it('uses the first letters of the first and last word', () => {
    expect(getInitials('Sara Weise')).toBe('SW');
    expect(getInitials('  ramono   wultschner ')).toBe('RW');
    expect(getInitials('Madonna')).toBe('M');
    expect(getInitials('')).toBe('');
  });
});

describe('Avatar', () => {
  it('shows initials when there is no image', async () => {
    await render(<Avatar name="Sara Weise" />);
    expect(screen.getByText('SW')).toBeOnTheScreen();
    expect(screen.getByLabelText("Sara Weise's avatar")).toBeOnTheScreen();
  });

  it('renders an image without initials when a uri is given', async () => {
    await render(<Avatar name="Sara Weise" uri="https://example.com/a.png" />);
    expect(screen.queryByText('SW')).not.toBeOnTheScreen();
  });
});

describe('Avatar (concept B)', () => {
  it('draws a neon ring (accent text color) when hasRing is set', async () => {
    await renderWithProviders(<Avatar name="Thu Ha" size={48} hasRing />);
    expect(screen.getByLabelText("Thu Ha's avatar")).toHaveStyle({
      borderWidth: 2,
      borderColor: lightPalette.primaryText,
    });
  });

  it('has no ring by default', async () => {
    await renderWithProviders(<Avatar name="Thu Ha" size={48} />);
    expect(screen.getByLabelText("Thu Ha's avatar")).not.toHaveStyle({ borderWidth: 2 });
  });
});
