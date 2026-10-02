import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { STRINGS } from '@/constants/strings';
import { colors, spacing } from '@/theme';
import type { LessonDetail } from '@/types/api';

import { LEARNING_STRINGS } from '../strings';
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
export function LessonPlayer({ lesson, courseId, onEnded }: LessonPlayerProps) {
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
            {LEARNING_STRINGS.videoLoadFailed}
          </AppText>
          <Button
            title={STRINGS.common.retry}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.textPrimary },
  video: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.textPrimary,
  },
});
