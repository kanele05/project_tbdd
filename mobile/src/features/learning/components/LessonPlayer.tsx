import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PlayerStage } from '@/features/media/PlayerStage';
import { PlayerStatus } from '@/features/media/PlayerStatus';
import { isYouTubeHostUrl, parseYouTubeVideoSource } from '@/features/media/youtube';
import { YouTubePlayer } from '@/features/media/YouTubePlayer';
import { useTranslation } from '@/i18n';
import { makeStyles } from '@/theme';
import type { LessonDetail } from '@/types/api';

import { usePlayerMaxHeight } from '../playerLayout';
import { useLessonProgress } from '../useLessonProgress';
import { getResumePosition, resolveVideoUrl, seekPlayer } from '../videoUtils';

export type LessonPlayerProps = {
  lesson: LessonDetail;
  courseId: string;
  /** The video played to its end; `nextLessonId` is `null` for the last lesson. */
  onEnded?: (nextLessonId: string | null) => void;
};

/**
 * The video of SC-15 (`expo-video`, native controls, fullscreen). Mount it with `key={lesson.id}`:
 * a new lesson is a new player and a new progress tracker, and the old one saves on unmount.
 *
 * - resumes at the saved `positionSec` (the first `readyToPlay` re-applies it if the seek raced);
 * - feeds the tracker with the 1 s `timeUpdate`, the position when paused, and `playToEnd`.
 */
export function LessonPlayer(props: LessonPlayerProps) {
  if (isYouTubeHostUrl(props.lesson.videoUrl)) {
    return <YouTubeLessonPlayer {...props} />;
  }
  return <Mp4LessonPlayer {...props} />;
}

function YouTubeLessonPlayer({ lesson, courseId, onEnded }: LessonPlayerProps) {
  const { t } = useTranslation(['learning', 'common']);
  const styles = useStyles();
  const maxHeight = usePlayerMaxHeight();
  const [playerAttempt, setPlayerAttempt] = useState(0);
  const source = parseYouTubeVideoSource(lesson.videoUrl);
  const tracker = useLessonProgress(lesson, courseId);
  const didEndRef = useRef(false);
  const startPositionSec = getResumePosition(lesson);

  return (
    <View style={styles.youtube}>
      <YouTubePlayer
        key={`${lesson.videoUrl}:${playerAttempt}`}
        source={lesson.videoUrl}
        title={lesson.title}
        initialPositionSec={
          source?.endSeconds === undefined
            ? startPositionSec
            : Math.min(startPositionSec, source.endSeconds - source.startSeconds)
        }
        loadingLabel={t('loadingVideo')}
        errorLabel={t('videoLoadFailed')}
        retryLabel={t('common:actions.retry')}
        maxHeight={maxHeight}
        onRetry={() => setPlayerAttempt((attempt) => attempt + 1)}
        sourceLabel={t('videoSourceLabel')}
        openSourceLabel={t('openVideoSource')}
        onProgress={(positionSec) => tracker.update(positionSec)}
        onPaused={(positionSec) => {
          tracker.update(positionSec);
          void tracker.flush();
        }}
        onEnded={() => {
          if (didEndRef.current) return;
          didEndRef.current = true;
          void tracker.markEnded();
          onEnded?.(lesson.nextLessonId);
        }}
      />
    </View>
  );
}

function Mp4LessonPlayer({ lesson, courseId, onEnded }: LessonPlayerProps) {
  const { t } = useTranslation(['learning', 'common']);
  const maxHeight = usePlayerMaxHeight();
  const [startPositionSec] = useState(() => getResumePosition(lesson));
  const [hasError, setHasError] = useState(false);
  const isReadyRef = useRef(false);
  const tracker = useLessonProgress(lesson, courseId);

  const player = useVideoPlayer({ uri: resolveVideoUrl(lesson.videoUrl) }, (instance) => {
    instance.timeUpdateEventInterval = 1;
    instance.currentTime = startPositionSec;
    instance.play();
  });

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'error') {
      setHasError(true);
      return;
    }
    if (status === 'readyToPlay' && !isReadyRef.current) {
      isReadyRef.current = true;
      setHasError(false);
      if (Math.abs(player.currentTime - startPositionSec) > 2) {
        seekPlayer(player, startPositionSec);
      }
    }
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (isReadyRef.current) tracker.update(currentTime);
  });

  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (isPlaying || !isReadyRef.current) return;
    // Paused: the last `timeUpdate` can be up to a second old, so use the exact position.
    tracker.update(player.currentTime);
    void tracker.flush();
  });

  useEventListener(player, 'playToEnd', () => {
    void tracker.markEnded();
    onEnded?.(lesson.nextLessonId);
  });

  return (
    <PlayerStage maxHeight={maxHeight}>
      <VideoView
        player={player}
        style={getVideoViewStyle(hasError)}
        nativeControls
        fullscreenOptions={{ enable: true }}
        contentFit="contain"
        accessibilityLabel={lesson.title}
      />
      {hasError ? (
        <PlayerStatus
          kind="error"
          label={t('videoLoadFailed')}
          retryLabel={t('common:actions.retry')}
          onRetry={() => {
            setHasError(false);
            void player
              .replaceAsync({ uri: resolveVideoUrl(lesson.videoUrl) })
              .then(() => player.play());
          }}
        />
      ) : null}
    </PlayerStage>
  );
}

/**
 * Frame-filling style of the `VideoView`. On the web the `<video>` element is a replaced element:
 * `absoluteFill` alone leaves it at its intrinsic size (640x360 for a 360p file, 300x150 without a
 * source), so the width and height are explicit. While the load failed the broken element is hidden
 * (and inert) so its native controls do not show through the error overlay.
 */
export function getVideoViewStyle(hasError: boolean): StyleProp<ViewStyle> {
  return [
    StyleSheet.absoluteFill,
    { width: '100%', height: '100%' },
    hasError ? { opacity: 0, pointerEvents: 'none' } : null,
  ];
}

/** The YouTube slot is the 16:9 frame (loading/error inside it) plus the attribution row. */
const useStyles = makeStyles((t) => ({
  youtube: { width: '100%', backgroundColor: t.colors.scrim },
}));
