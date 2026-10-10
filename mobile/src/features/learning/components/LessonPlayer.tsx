import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { isYouTubeHostUrl, parseYouTubeVideoSource } from '@/features/media/youtube';
import { YouTubePlayer } from '@/features/media/YouTubePlayer';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';
import type { LessonDetail } from '@/types/api';

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
  const styles = useStyles();
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
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        fullscreenOptions={{ enable: true }}
        contentFit="contain"
        accessibilityLabel={lesson.title}
      />
      {hasError ? (
        <View style={styles.overlay}>
          <AppText variant="body" color="white" align="center">
            {t('videoLoadFailed')}
          </AppText>
          <Button
            title={t('common:actions.retry')}
            variant="outline"
            size="sm"
            onPress={() => {
              setHasError(false);
              void player
                .replaceAsync({ uri: resolveVideoUrl(lesson.videoUrl) })
                .then(() => player.play());
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * The video slot is always dark, in light mode too. MP4: a 16:9 box. YouTube: natural height
 * (16:9 embed + attribution row), so nothing spills over the tabs below.
 */
const useStyles = makeStyles((t) => ({
  container: { width: '100%', aspectRatio: 16 / 9, backgroundColor: t.colors.scrim },
  youtube: { width: '100%', backgroundColor: t.colors.scrim },
  video: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: t.colors.scrim,
  },
}));
