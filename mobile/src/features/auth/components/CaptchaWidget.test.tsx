import { render, screen } from '@testing-library/react-native';

import { CaptchaWidget } from './CaptchaWidget';

jest.mock('@/constants/config', () => ({ CAPTCHA_PROVIDER: 'turnstile' }));
jest.mock('./RecaptchaWidget', () => ({
  RecaptchaWidget: () => {
    const { createElement } = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return createElement(Text, null, 'reCAPTCHA provider');
  },
}));
jest.mock('./TurnstileWidget', () => ({
  TurnstileWidget: () => {
    const { createElement } = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return createElement(Text, null, 'Turnstile provider');
  },
}));

describe('CaptchaWidget', () => {
  it('keeps Turnstile mounted when tests explicitly select the legacy provider', async () => {
    await render(<CaptchaWidget onToken={jest.fn()} />);

    expect(screen.getByText('Turnstile provider')).toBeOnTheScreen();
    expect(screen.queryByText('reCAPTCHA provider')).not.toBeOnTheScreen();
  });
});
