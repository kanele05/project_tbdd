import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';

import { useCaptcha } from '../useCaptcha';
import { TurnstileWidget } from './TurnstileWidget';

type WebViewProps = {
  source: { html: string; baseUrl: string };
  onMessage: (event: { nativeEvent: { data: string } }) => void;
  onError: () => void;
  onShouldStartLoadWithRequest: (request: { url: string }) => boolean;
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
      return createElement(View, { testID: 'turnstile-webview' });
    },
  };
});

const send = (message: object) =>
  act(async () => {
    lastProps?.onMessage({ nativeEvent: { data: JSON.stringify(message) } });
  });

describe('TurnstileWidget (native)', () => {
  beforeEach(() => {
    lastProps = null;
    mountCount = 0;
  });

  it('waits for an explicit verification press before mounting the WebView', async () => {
    await render(<TurnstileWidget onToken={jest.fn()} />);

    expect(screen.getByText("Confirm to load Cloudflare's security check.")).toBeOnTheScreen();
    expect(screen.queryByTestId('turnstile-webview')).not.toBeOnTheScreen();
    expect(lastProps).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Verify security' }));

    expect(await screen.findByTestId('turnstile-webview')).toBeOnTheScreen();
    expect(lastProps?.source.baseUrl).toMatch(/^https?:\/\//);
    expect(screen.getByText('Checking that you are human...')).toBeOnTheScreen();
  });

  it('loads the widget page from the configured base URL', async () => {
    await render(<TurnstileWidget onToken={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Verify security' }));

    expect(lastProps?.source.baseUrl).toMatch(/^https?:\/\//);
    expect(lastProps?.source.html).toContain('1x00000000000000000000AA');
    expect(screen.getByText('Checking that you are human...')).toBeOnTheScreen();
  });

  it('hands the token to the form and clears the loading caption', async () => {
    const onToken = jest.fn();
    await render(<TurnstileWidget onToken={onToken} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Verify security' }));

    await send({ type: 'token', token: 'tok-1' });

    expect(onToken).toHaveBeenCalledWith('tok-1');
  });

  it('tells the form when the token expired', async () => {
    const onExpire = jest.fn();
    await render(<TurnstileWidget onToken={jest.fn()} onExpire={onExpire} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Verify security' }));

    await send({ type: 'expired' });

    expect(onExpire).toHaveBeenCalled();
    expect(screen.queryByTestId('turnstile-webview')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Verify security' })).toBeOnTheScreen();
  });

  it('requires a new deliberate verification after resetKey changes', async () => {
    const { rerender } = await render(<TurnstileWidget onToken={jest.fn()} resetKey={0} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Verify security' }));
    expect(await screen.findByTestId('turnstile-webview')).toBeOnTheScreen();

    await rerender(<TurnstileWidget onToken={jest.fn()} resetKey={1} />);

    expect(screen.queryByTestId('turnstile-webview')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Verify security' })).toBeOnTheScreen();
  });

  it('shows an error with a retry that loads a fresh page', async () => {
    const onError = jest.fn();
    await render(<TurnstileWidget onToken={jest.fn()} onError={onError} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Verify security' }));
    const mountsBefore = mountCount;

    await send({ type: 'error', code: 'script' });
    expect(onError).toHaveBeenCalled();
    expect(
      await screen.findByText(
        'The human check could not load. Check your connection and try again.',
      ),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('captcha-retry'));

    expect(mountCount).toBeGreaterThan(mountsBefore);
    expect(screen.queryByTestId('captcha-retry')).not.toBeOnTheScreen();
  });

  it('clears an issued token when the widget errors afterward', async () => {
    const { result } = await renderHook(() => useCaptcha());
    await render(
      <TurnstileWidget
        onToken={result.current.onToken}
        onExpire={result.current.onExpire}
        onError={result.current.onError}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Verify security' }));

    await send({ type: 'token', token: 'tok-1' });
    expect(result.current.token).toBe('tok-1');

    await send({ type: 'error', code: 'network' });

    expect(result.current.token).toBeNull();
  });

  it('only lets the WebView navigate within Cloudflare and its own origin', async () => {
    await render(<TurnstileWidget onToken={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Verify security' }));
    const allow = lastProps?.onShouldStartLoadWithRequest;

    expect(allow?.({ url: 'https://challenges.cloudflare.com/cdn-cgi/challenge' })).toBe(true);
    expect(allow?.({ url: 'about:blank' })).toBe(true);
    expect(allow?.({ url: 'https://evil.example.com/' })).toBe(false);
    expect(allow?.({ url: 'https://challenges.cloudflare.com.evil.com/' })).toBe(false);
  });
});
