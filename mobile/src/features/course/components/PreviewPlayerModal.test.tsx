import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { PreviewPlayerModal } from './PreviewPlayerModal';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

let mockPreviewState: Record<string, unknown> = {};
let mockStatusListener: ((event: { status: string }) => void) | undefined;
let mockPlayingListener: ((event: { isPlaying: boolean }) => void) | undefined;
let mockPlayerStatus = 'loading';
let mockIsPlaying = false;
let mockYouTubeProps: Record<string, unknown> | undefined;
const mockCreatePlayer = jest.fn();
const mockPlay = jest.fn();
const mockPlayer = {
  get status() {
    return mockPlayerStatus;
  },
  get playing() {
    return mockIsPlaying;
  },
  play: mockPlay,
};

jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  useEventListener: (_player: unknown, _event: string, listener: typeof mockStatusListener) => {
    if (_event === 'statusChange') mockStatusListener = listener;
    if (_event === 'playingChange') mockPlayingListener = listener as typeof mockPlayingListener;
  },
}));

jest.mock('expo-video', () => ({
  useVideoPlayer: () => {
    const { useState } = jest.requireActual('react') as typeof import('react');
    const [player] = useState(() => {
      if (mockCreatePlayer.mock.calls.length > 0) mockPlayerStatus = 'loading';
      mockCreatePlayer();
      return mockPlayer;
    });
    return player;
  },
  VideoView: (props: { style?: StyleProp<ViewStyle> }) => {
    const { createElement } = jest.requireActual('react') as typeof import('react');
    const { View } = jest.requireActual('react-native') as typeof import('react-native');
    return createElement(View, { ...props, testID: 'preview-video' });
  },
}));

jest.mock('@/features/media/YouTubePlayer', () => ({
  YouTubePlayer: (props: Record<string, unknown>) => {
    mockYouTubeProps = props;
    const { createElement } = jest.requireActual('react') as typeof import('react');
    const { View } = jest.requireActual('react-native') as typeof import('react-native');
    return createElement(View, { testID: 'youtube-preview-player' });
  },
}));

jest.mock('../hooks', () => ({
  usePreviewLesson: () => mockPreviewState,
}));

describe('PreviewPlayerModal', () => {
  beforeEach(() => {
    mockPreviewState = {
      data: { title: 'Intro', videoUrl: 'https://example.com/intro.mp4' },
      isPending: false,
      error: null,
      refetch: jest.fn(),
    };
    mockStatusListener = undefined;
    mockPlayingListener = undefined;
    mockPlayerStatus = 'loading';
    mockIsPlaying = false;
    mockCreatePlayer.mockClear();
    mockPlay.mockClear();
    mockYouTubeProps = undefined;
  });

  it('shows an accessible play action after the video is ready and starts playback on tap', async () => {
    await render(<PreviewPlayerModal lessonId="lesson-1" onClose={jest.fn()} />);

    expect(screen.getByLabelText('Loading video')).toBeOnTheScreen();
    expect(mockCreatePlayer).toHaveBeenCalledTimes(1);

    await act(async () => mockStatusListener?.({ status: 'readyToPlay' }));

    expect(screen.queryByLabelText('Loading video')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Play preview' }));
    expect(mockPlay).toHaveBeenCalledTimes(1);

    await act(async () => mockPlayingListener?.({ isPlaying: true }));
    expect(screen.queryByRole('button', { name: 'Play preview' })).not.toBeOnTheScreen();

    await act(async () => mockPlayingListener?.({ isPlaying: false }));
    expect(screen.getByRole('button', { name: 'Play preview' })).toBeOnTheScreen();
  });

  it('routes YouTube previews to the external player instead of expo-video', async () => {
    mockPreviewState.data = {
      title: 'Intro',
      videoUrl: 'https://www.youtube.com/watch?v=AbCdEf12345',
    };

    await render(<PreviewPlayerModal lessonId="lesson-1" onClose={jest.fn()} />);

    expect(screen.getByTestId('youtube-preview-player')).toBeOnTheScreen();
    expect(mockYouTubeProps?.source).toBe('https://www.youtube.com/watch?v=AbCdEf12345');
    expect(mockCreatePlayer).not.toHaveBeenCalled();
  });

  it('allows a playback gesture before metadata loads on mobile browsers', async () => {
    await render(<PreviewPlayerModal lessonId="lesson-1" onClose={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Play preview' })).toHaveStyle({
      alignSelf: 'center',
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Play preview' }));

    expect(mockPlay).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Loading video')).toBeOnTheScreen();
  });

  it('fits an external preview inside the stage and keeps a scroll fallback for short windows', async () => {
    mockPreviewState.data = {
      title: 'Intro',
      videoUrl: 'https://www.youtube.com/watch?v=AbCdEf12345',
    };
    await render(<PreviewPlayerModal lessonId="lesson-1" onClose={jest.fn()} />);

    await fireEvent(screen.getByTestId('preview-stage'), 'layout', {
      nativeEvent: { layout: { width: 1280, height: 600 } },
    });
    expect(screen.getByTestId('youtube-preview-width')).toHaveStyle({ width: (544 * 16) / 9 });
    expect(screen.getByTestId('youtube-preview-stage')).toHaveStyle({ height: '100%' });
    expect(screen.getByRole('button', { name: 'Close preview' })).toBeOnTheScreen();

    await fireEvent(screen.getByTestId('preview-stage'), 'layout', {
      nativeEvent: { layout: { width: 844, height: 170 } },
    });
    expect(screen.getByTestId('youtube-preview-width')).toHaveStyle({ width: (200 * 16) / 9 });
  });

  it('bounds the video view to the available stage dimensions', async () => {
    await render(<PreviewPlayerModal lessonId="lesson-1" onClose={jest.fn()} />);

    expect(StyleSheet.flatten(screen.getByTestId('preview-stage').props.style)).toMatchObject({
      flex: 1,
      minHeight: 0,
    });
    expect(StyleSheet.flatten(screen.getByTestId('preview-video-stage').props.style)).toMatchObject(
      {
        width: '100%',
        height: '100%',
      },
    );
    expect(StyleSheet.flatten(screen.getByTestId('preview-video').props.style)).toMatchObject({
      width: '100%',
      height: '100%',
    });
  });

  it('shows retry when expo-video errors and recreates the player on retry', async () => {
    await render(<PreviewPlayerModal lessonId="lesson-1" onClose={jest.fn()} />);

    mockPlayerStatus = 'error';
    await act(async () => mockStatusListener?.({ status: 'error' }));

    expect(screen.getByText('Something went wrong. Please try again.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(mockCreatePlayer).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('Loading video')).toBeOnTheScreen();
  });

  it('shows retry when the player is already in an error state on mount', async () => {
    mockPlayerStatus = 'error';

    await render(<PreviewPlayerModal lessonId="lesson-1" onClose={jest.fn()} />);

    expect(screen.getByText('Something went wrong. Please try again.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeOnTheScreen();
  });
});
