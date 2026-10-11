import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { AuthLink } from './AuthLink';

describe('AuthLink', () => {
  it('is a link with the given label that calls onPress', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<AuthLink label="Sign up" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('link', { name: 'Sign up' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('underlines its label while the mouse hovers it (web)', async () => {
    await renderWithProviders(<AuthLink label="Sign up" onPress={jest.fn()} />);
    const link = screen.getByRole('link', { name: 'Sign up' });
    expect(screen.getByText('Sign up')).not.toHaveStyle({ textDecorationLine: 'underline' });
    await fireEvent(link, 'hoverIn');
    expect(screen.getByText('Sign up')).toHaveStyle({ textDecorationLine: 'underline' });
    await fireEvent(link, 'hoverOut');
    expect(screen.getByText('Sign up')).not.toHaveStyle({ textDecorationLine: 'underline' });
  });
});
