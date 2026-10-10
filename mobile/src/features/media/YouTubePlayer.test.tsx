import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { API_URL } from '@/constants/config';

import { YouTubePlayer, type YouTubePlayerProps } from './YouTubePlayer';

let mockWebViewProps: Record<string, unknown> | undefined;

jest.mock('react-native-webview', () => ({
  WebView: (props: Record<string, unknown>) => {
    mockWebViewProps = props;
    const { createElement: makeElement } = jest.requireActual('react') as typeof import('react');
    const { View: NativeView } = jest.requireActual(
      'react-native',
    ) as typeof import('react-native');
    return makeElement(NativeView, { testID: 'youtube-webview' });
  },
}));

const PLAYER_PROPS: YouTubePlayerProps = {
  source: 'https://www.youtube.com/watch?v=AbCdEf12345&start=10&end=30',
  title: 'Lesson video',
  loadingLabel: 'Loading video',
  errorLabel: 'Video unavailable',
  retryLabel: 'Retry',
  sourceLabel: 'Reference video · YouTube',
  openSourceLabel: 'Open original',
};

describe('YouTubePlayer', () => {
  beforeEach(() => {
    mockWebViewProps = undefined;
  });

  it('loads only the official embedded player without autoplay and displays its attribution', async () => {
    await render(<YouTubePlayer {...PLAYER_PROPS} />);

    expect(screen.getByTestId('youtube-webview')).toBeOnTheScreen();
    const webViewSource = mockWebViewProps?.source as { html: string; baseUrl: string };
    expect(webViewSource.html).toContain('videoId:"AbCdEf12345"');
    expect(webViewSource.html).toContain('autoplay:0');
    expect(webViewSource.html).toContain('start:10,end:30');
    expect(webViewSource.html).toContain('strict-origin-when-cross-origin');
    expect(webViewSource.html).toContain('event.target!==player');
    expect(webViewSource.baseUrl).toBe(new URL(API_URL).origin);
    expect(screen.getByText('Reference video · YouTube')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open original' })).toBeOnTheScreen();
  });

  it('cancels top-level navigation away from the player and opens YouTube links externally', async () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await render(<YouTubePlayer {...PLAYER_PROPS} />);
    const navigation = mockWebViewProps?.onShouldStartLoadWithRequest as (request: {
      url: string;
      isTopFrame?: boolean;
    }) => boolean;
    const origin = new URL(API_URL).origin;

    expect(navigation({ url: `${origin}/`, isTopFrame: true })).toBe(true);
    expect(navigation({ url: 'about:blank', isTopFrame: true })).toBe(true);
    expect(
      navigation({ url: 'https://www.youtube.com/embed/AbCdEf12345', isTopFrame: false }),
    ).toBe(true);
    expect(
      navigation({ url: 'https://www.youtube.com/watch?v=AbCdEf12345', isTopFrame: true }),
    ).toBe(false);
    expect(openUrl).toHaveBeenCalledWith('https://www.youtube.com/watch?v=AbCdEf12345');
    expect(navigation({ url: 'https://attacker.example/', isTopFrame: true })).toBe(false);
    expect(openUrl).toHaveBeenCalledTimes(1);
    openUrl.mockRestore();
  });

  it('does not mount a player for invalid YouTube sources', async () => {
    await render(
      <YouTubePlayer {...PLAYER_PROPS} source="https://www.youtube.com/watch?v=bad-id" />,
    );

    expect(screen.queryByTestId('youtube-webview')).not.toBeOnTheScreen();
    expect(screen.getByText('Video unavailable')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Open original' })).not.toBeOnTheScreen();
  });

  it('accepts progress only from the configured API origin and clamps it to clip time', async () => {
    const onProgress = jest.fn();
    const onPaused = jest.fn();
    const onEnded = jest.fn();
    await render(
      <YouTubePlayer
        {...PLAYER_PROPS}
        onProgress={onProgress}
        onPaused={onPaused}
        onEnded={onEnded}
      />,
    );

    const onMessage = mockWebViewProps?.onMessage as (event: unknown) => void;
    await act(async () => {
      onMessage({
        nativeEvent: {
          url: 'https://untrusted.example/',
          data: JSON.stringify({ type: 'progress', currentTime: 25 }),
        },
      });
    });
    expect(onProgress).not.toHaveBeenCalled();

    const origin = new URL(API_URL).origin;
    const navigation = mockWebViewProps?.onShouldStartLoadWithRequest as (request: {
      url: string;
    }) => boolean;
    expect(navigation({ url: `${origin}/` })).toBe(true);
    expect(navigation({ url: 'about:blank' })).toBe(true);
    expect(navigation({ url: 'https://attacker.example/' })).toBe(false);
    await act(async () => {
      onMessage({
        nativeEvent: {
          url: `${origin}/`,
          data: JSON.stringify({ type: 'progress', currentTime: 25 }),
        },
      });
      onMessage({
        nativeEvent: {
          url: `${origin}/`,
          data: JSON.stringify({ type: 'paused', currentTime: 40 }),
        },
      });
      onMessage({
        nativeEvent: {
          url: `${origin}/`,
          data: JSON.stringify({ type: 'ended', currentTime: 40 }),
        },
      });
      onMessage({
        nativeEvent: {
          url: `${origin}/`,
          data: JSON.stringify({ type: 'ended', currentTime: 40 }),
        },
      });
    });
    expect(onProgress).toHaveBeenNthCalledWith(1, 15);
    expect(onProgress).toHaveBeenNthCalledWith(2, 20);
    expect(onPaused).toHaveBeenCalledWith(20);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('shows a retry action when YouTube reports an embed error', async () => {
    const onRetry = jest.fn();
    await render(<YouTubePlayer {...PLAYER_PROPS} onRetry={onRetry} />);

    const onMessage = mockWebViewProps?.onMessage as (event: unknown) => void;
    await act(async () => {
      onMessage({
        nativeEvent: {
          url: `${new URL(API_URL).origin}/`,
          data: JSON.stringify({ type: 'error', code: 153 }),
        },
      });
    });
    expect(screen.getByText('Video unavailable')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('draws the loading and error states inside the 16:9 frame, never below it', async () => {
    await render(<YouTubePlayer {...PLAYER_PROPS} maxHeight={273} onRetry={jest.fn()} />);

    expect(screen.getByTestId('youtube-stage')).toHaveStyle({
      aspectRatio: 16 / 9,
      maxHeight: 273,
    });
    expect(screen.getByText('Loading video')).toBeOnTheScreen();

    const onMessage = mockWebViewProps?.onMessage as (event: unknown) => void;
    await act(async () => {
      onMessage({
        nativeEvent: {
          url: `${new URL(API_URL).origin}/`,
          data: JSON.stringify({ type: 'error', code: 153 }),
        },
      });
    });

    const stage = screen.getByTestId('youtube-stage');
    expect(within(stage).getByText('Video unavailable')).toBeOnTheScreen();
    expect(within(stage).getByRole('button', { name: 'Retry' })).toBeOnTheScreen();
    // The attribution row and the "open original" link stay outside the frame, under it.
    expect(within(stage).queryByText('Reference video · YouTube')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open original' })).toBeOnTheScreen();
  });
});
