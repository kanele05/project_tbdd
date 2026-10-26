import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { AppState, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useAuthStore } from '@/stores/authStore';
import type { LessonDetail, UserDto } from '@/types/api';

import { learningApi } from '../api';
import { clearPendingProgress, getPendingProgress } from '../progressQueue';
import { LessonPlayer } from './LessonPlayer';

type Handler = (payload?: never) => void;

const mockHandlers: Record<string, Handler> = {};
let mockYouTubeProps: Record<string, unknown> | undefined;
const mockPlayer = {
  currentTime: 0,
  timeUpdateEventInterval: 0,
  play: jest.fn(),
  pause: jest.fn(),
  replaceAsync: jest.fn(),
};

jest.mock('expo', () => ({
  useEventListener: (_player: unknown, event: string, handler: Handler) => {
    mockHandlers[event] = handler;
  },
}));

jest.mock('expo-video', () => ({
  useVideoPlayer: (_source: unknown, setup: (player: typeof mockPlayer) => void) => {
    const { useState } = jest.requireActual('react');
    const [player] = useState(() => {
      setup(mockPlayer);
      return mockPlayer;
    });
    return player;
  },
  VideoView: (props: { style: StyleProp<ViewStyle> }) => {
    const { createElement } = jest.requireActual('react') as typeof import('react');
    const { View } = jest.requireActual('react-native') as typeof import('react-native');
    return createElement(View, { testID: 'video-view', style: props.style });
  },
}));

jest.mock('@/features/media/YouTubePlayer', () => ({
  YouTubePlayer: (props: Record<string, unknown>) => {
    mockYouTubeProps = props;
    const { createElement } = jest.requireActual('react') as typeof import('react');
    const { View } = jest.requireActual('react-native') as typeof import('react-native');
    return createElement(View, { testID: 'youtube-lesson-player' });
  },
}));

jest.mock('../api', () => ({ learningApi: { saveProgress: jest.fn() } }));

jest.mock('../progressSync', () => ({
  ...jest.requireActual('../progressSync'),
  startPendingProgressSync: jest.fn(),
}));

const mockSave = learningApi.saveProgress as jest.Mock;

const LESSON: LessonDetail = {
  id: 'lesson-1',
  courseId: 'course-1',
  title: 'Intro',
  durationSec: 100,
  videoUrl: 'https://example.com/v.mp4',
  positionSec: 40,
  isCompleted: false,
  nextLessonId: 'lesson-2',
};

const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

function renderPlayer(ui: ReactElement) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function emit(event: string, payload?: unknown) {
  mockHandlers[event]?.(payload as never);
}

async function tick(seconds: number, from: number) {
  for (let second = 1; second <= seconds; second += 1) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
      emit('timeUpdate', { currentTime: from + second });
    });
  }
}

describe('LessonPlayer', () => {
  let appStateHandler: ((status: string) => void) | undefined;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    for (const key of Object.keys(mockHandlers)) delete mockHandlers[key];
    mockYouTubeProps = undefined;
    mockPlayer.currentTime = 0;
    mockSave.mockResolvedValue({
      lessonProgress: { positionSec: 0, isCompleted: false },
      courseProgressPercent: 10,
    });
    useAuthStore.setState({ user: { id: 'user-1' } as UserDto });
    onlineManager.setOnline(true);
    appStateHandler = undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _type: string,
      listener: (status: string) => void,
    ) => {
      appStateHandler = listener;
      return { remove: jest.fn() };
    }) as never);
    await clearPendingProgress();
  });

  afterEach(async () => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    await act(async () => {
      useAuthStore.setState({ user: null });
    });
  });

  it('resumes at the saved position, asks for 1 s time updates and autoplays', async () => {
    await renderPlayer(<LessonPlayer lesson={LESSON} courseId="course-1" />);

    expect(mockPlayer.currentTime).toBe(40);
    expect(mockPlayer.timeUpdateEventInterval).toBe(1);
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  it('fills the 16:9 frame so a 360p video is not left at its intrinsic size', async () => {
    await renderPlayer(<LessonPlayer lesson={LESSON} courseId="course-1" />);

    const style = StyleSheet.flatten(screen.getByTestId('video-view').props.style);
    expect(style).toMatchObject({ position: 'absolute', width: '100%', height: '100%' });
    expect(style.opacity).toBeUndefined();
  });

  it('hides the broken video behind a centered error overlay and brings it back on Retry', async () => {
    mockPlayer.replaceAsync.mockResolvedValue(undefined);
    await renderPlayer(<LessonPlayer lesson={LESSON} courseId="course-1" />);

    await act(async () => emit('statusChange', { status: 'error' }));

    expect(screen.getByText("Couldn't load this video")).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByTestId('video-view').props.style)).toMatchObject({
      opacity: 0,
      pointerEvents: 'none',
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(mockPlayer.replaceAsync).toHaveBeenCalledWith({ uri: LESSON.videoUrl });
    expect(screen.queryByText("Couldn't load this video")).not.toBeOnTheScreen();
    expect(
      StyleSheet.flatten(screen.getByTestId('video-view').props.style).opacity,
    ).toBeUndefined();
  });

  it('routes YouTube lessons outside expo-video and saves clip-relative pause progress', async () => {
    await renderPlayer(
      <LessonPlayer
        lesson={{
          ...LESSON,
          videoUrl: 'https://www.youtube.com/watch?v=AbCdEf12345&start=10&end=70',
        }}
        courseId="course-1"
      />,
    );

    expect(mockYouTubeProps?.source).toBe(
      'https://www.youtube.com/watch?v=AbCdEf12345&start=10&end=70',
    );
    expect(mockYouTubeProps?.initialPositionSec).toBe(40);
    expect(typeof mockYouTubeProps?.onRetry).toBe('function');
    expect(mockPlayer.play).not.toHaveBeenCalled();
    const onPaused = mockYouTubeProps?.onPaused as (positionSec: number) => void;
    await act(async () => {
      onPaused(13);
    });
    expect(mockSave).toHaveBeenCalledWith('lesson-1', { positionSec: 13 });
  });

  it('starts at 0 when the lesson was completed and left near the end', async () => {
    await renderPlayer(
      <LessonPlayer
        lesson={{ ...LESSON, positionSec: 97, isCompleted: true }}
        courseId="course-1"
      />,
    );

    expect(mockPlayer.currentTime).toBe(0);
  });

  it('ignores time updates until the player is ready', async () => {
    await renderPlayer(<LessonPlayer lesson={LESSON} courseId="course-1" />);

    await tick(12, 0);

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('saves every 10 seconds of playback once ready', async () => {
    await renderPlayer(<LessonPlayer lesson={LESSON} courseId="course-1" />);
    await act(async () => emit('statusChange', { status: 'readyToPlay' }));

    await tick(10, 40);

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith('lesson-1', { positionSec: 50 });
  });

  it('saves the exact position when the video is paused', async () => {
    await renderPlayer(<LessonPlayer lesson={LESSON} courseId="course-1" />);
    await act(async () => emit('statusChange', { status: 'readyToPlay' }));
    await tick(3, 40);

    mockPlayer.currentTime = 43.6;
    await act(async () => emit('playingChange', { isPlaying: false }));

    expect(mockSave).toHaveBeenLastCalledWith('lesson-1', { positionSec: 43 });
  });

  it('saves when the app goes to the background', async () => {
    await renderPlayer(<LessonPlayer lesson={LESSON} courseId="course-1" />);
    await act(async () => emit('statusChange', { status: 'readyToPlay' }));
    await tick(4, 40);

    await act(async () => appStateHandler?.('background'));

    expect(mockSave).toHaveBeenLastCalledWith('lesson-1', { positionSec: 44 });
  });

  it('saves when the screen is left (unmount) or the lesson is switched', async () => {
    const { unmount } = await renderPlayer(<LessonPlayer lesson={LESSON} courseId="course-1" />);
    await act(async () => emit('statusChange', { status: 'readyToPlay' }));
    await tick(5, 40);

    await act(async () => {
      await unmount();
    });

    expect(mockSave).toHaveBeenLastCalledWith('lesson-1', { positionSec: 45 });
  });

  it('does not overwrite the saved position when left before the video loaded', async () => {
    const { unmount } = await renderPlayer(<LessonPlayer lesson={LESSON} courseId="course-1" />);

    await act(async () => {
      await unmount();
    });

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('completes the lesson and reports the next one when the video plays to the end', async () => {
    const onEnded = jest.fn();
    await renderPlayer(<LessonPlayer lesson={LESSON} courseId="course-1" onEnded={onEnded} />);
    await act(async () => emit('statusChange', { status: 'readyToPlay' }));

    await act(async () => emit('playToEnd'));

    expect(mockSave).toHaveBeenLastCalledWith('lesson-1', { positionSec: 100, isCompleted: true });
    expect(onEnded).toHaveBeenCalledWith('lesson-2');
  });

  it('queues the position in AsyncStorage instead of calling the API while offline', async () => {
    onlineManager.setOnline(false);
    await renderPlayer(<LessonPlayer lesson={LESSON} courseId="course-1" />);
    await act(async () => emit('statusChange', { status: 'readyToPlay' }));

    await tick(10, 40);

    expect(mockSave).not.toHaveBeenCalled();
    expect(await getPendingProgress()).toEqual([
      expect.objectContaining({ lessonId: 'lesson-1', userId: 'user-1', positionSec: 50 }),
    ]);
  });
});
