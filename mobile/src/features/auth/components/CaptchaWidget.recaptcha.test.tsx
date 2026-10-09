import { render, screen } from '@testing-library/react-native';

import { CaptchaWidget } from './CaptchaWidget';

jest.mock('@/constants/config', () => ({ CAPTCHA_PROVIDER: 'recaptcha_v2' }));
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

describe('CaptchaWidget reCAPTCHA provider', () => {
  it('renders reCAPTCHA when the provider is switched explicitly', async () => {
    await render(<CaptchaWidget onToken={jest.fn()} />);

    expect(screen.getByText('reCAPTCHA provider')).toBeOnTheScreen();
    expect(screen.queryByText('Turnstile provider')).not.toBeOnTheScreen();
  });
});
