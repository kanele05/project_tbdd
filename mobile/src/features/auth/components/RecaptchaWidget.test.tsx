import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useCaptcha } from '../useCaptcha';
import { RecaptchaWidget } from './RecaptchaWidget';

jest.mock('@/constants/config', () => ({
  RECAPTCHA_BASE_URL: 'https://captcha.example.test',
  RECAPTCHA_SITE_KEY: 'fixture-site-key',
}));

type WebViewProps = {
  source: { html: string; baseUrl: string };
  onMessage: (event: { nativeEvent: { data: string; url: string } }) => void;
  onError: () => void;
  onHttpError: () => void;
  onShouldStartLoadWithRequest: (request: { url: string }) => boolean;
  scrollEnabled: boolean;
  style: StyleProp<ViewStyle>;
};

let lastProps: WebViewProps | null = null;
let mountCount = 0;

jest.mock('react-native-webview', () => {
  const { createElement, useEffect } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    WebView: (props: WebViewProps) => {
      lastProps = props;
      useEffect(() => {
        mountCount += 1;
      }, []);
      return createElement(View, { testID: 'recaptcha-webview' });
    },
  };
});

const send = (message: object) =>
  act(async () => {
    lastProps?.onMessage({
      nativeEvent: { data: JSON.stringify(message), url: 'https://captcha.example.test/' },
    });
  });

describe('RecaptchaWidget (native)', () => {
  beforeEach(() => {
    lastProps = null;
    mountCount = 0;
  });

  it('renders the real Google checkbox immediately in an HTTPS WebView', async () => {
    await render(<RecaptchaWidget onToken={jest.fn()} />);

    expect(await screen.findByTestId('recaptcha-webview')).toBeOnTheScreen();
    expect(lastProps?.source.baseUrl).toMatch(/^https:\/\//);
    expect(lastProps?.source.html).toContain('grecaptcha.render');
    expect(lastProps?.source.html).toContain('fixture-site-key');
    expect(lastProps?.scrollEnabled).toBe(false);
    expect(screen.getByText('Checking that you are human...')).toBeOnTheScreen();
  });

  it('forwards response tokens and clears them on expiration and errors', async () => {
    const onToken = jest.fn();
    const onExpire = jest.fn();
    const onError = jest.fn();
    await render(<RecaptchaWidget onToken={onToken} onExpire={onExpire} onError={onError} />);

    await send({ type: 'token', token: 'token-1' });
    expect(onToken).toHaveBeenCalledWith('token-1');
    await act(async () =>
      lastProps?.onMessage({
        nativeEvent: {
          data: '{"type":"token","token":"untrusted"}',
          url: 'https://evil.example.test/',
        },
      }),
    );
    expect(onToken).toHaveBeenCalledTimes(1);

    await send({ type: 'expired' });
    expect(onExpire).toHaveBeenCalledTimes(1);

    await send({ type: 'error' });
    expect(onExpire).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('The human check could not load. Check your connection and try again.'),
    ).toBeOnTheScreen();
  });

  it('clears the stored token when the widget errors after success', async () => {
    const { result } = await renderHook(() => useCaptcha());
    await render(
      <RecaptchaWidget
        onToken={result.current.onToken}
        onExpire={result.current.onExpire}
        onError={result.current.onError}
      />,
    );

    await send({ type: 'token', token: 'token-1' });
    expect(result.current.token).toBe('token-1');

    await send({ type: 'error' });
    expect(result.current.token).toBeNull();
  });

  it('remounts the widget on reset and ignores callbacks from the old WebView', async () => {
    const onToken = jest.fn();
    const { rerender } = await render(<RecaptchaWidget onToken={onToken} resetKey={0} />);
    const oldProps = lastProps;
    const mountsBefore = mountCount;

    await rerender(<RecaptchaWidget onToken={onToken} resetKey={1} />);
    expect(mountCount).toBeGreaterThan(mountsBefore);
    oldProps?.onMessage({
      nativeEvent: {
        data: '{"type":"token","token":"stale"}',
        url: 'https://captcha.example.test/',
      },
    });
    expect(onToken).not.toHaveBeenCalled();
  });

  it('retries by loading a fresh WebView after a provider error', async () => {
    const onToken = jest.fn();
    await render(<RecaptchaWidget onToken={onToken} />);
    const mountsBefore = mountCount;
    const staleCallback = lastProps?.onMessage;
    await act(async () => lastProps?.onError());

    await fireEvent.press(await screen.findByTestId('captcha-retry'));

    expect(mountCount).toBeGreaterThan(mountsBefore);
    expect(screen.queryByTestId('captcha-retry')).not.toBeOnTheScreen();
    await act(async () =>
      staleCallback?.({
        nativeEvent: {
          data: '{"type":"token","token":"stale"}',
          url: 'https://captcha.example.test/',
        },
      }),
    );
    expect(onToken).not.toHaveBeenCalled();
  });

  it('expands to the measured challenge height instead of reserving a large blank frame', async () => {
    await render(<RecaptchaWidget onToken={jest.fn()} />);
    const initialHeight = StyleSheet.flatten(lastProps?.style)?.height;
    expect([78, 144]).toContain(initialHeight);

    await send({ type: 'resize', height: 420 });

    expect(StyleSheet.flatten(lastProps?.style)?.height).toBe(420);
  });

  it('allows Google challenge hosts and blocks unrelated navigation', async () => {
    await render(<RecaptchaWidget onToken={jest.fn()} />);
    const allow = lastProps?.onShouldStartLoadWithRequest;

    expect(allow?.({ url: 'https://www.google.com/recaptcha/api2/anchor' })).toBe(true);
    expect(allow?.({ url: 'https://www.gstatic.com/recaptcha/challenge' })).toBe(true);
    expect(allow?.({ url: 'https://evil.example.com/' })).toBe(false);
  });
});
