import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  Modal,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, IconButton } from '@/components/ui';
import { isYouTubeHostUrl } from '@/features/media/youtube';
import { YouTubePlayer } from '@/features/media/YouTubePlayer';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/appError';
import { DarkThemeScope, makeStyles, spacing, useTheme } from '@/theme';

import { usePreviewLesson } from '../hooks';

export type PreviewPlayerModalProps = {
  /** Lesson to preview; the modal is open while this is not null. */
  lessonId: string | null;
  onClose: () => void;
};

function PreviewMp4Video({
  url,
  loadingLabel,
  playLabel,
  errorMessage,
  retryLabel,
  onRetry,
}: {
  url: string;
  loadingLabel: string;
  playLabel: string;
  errorMessage: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const player = useVideoPlayer(url, (instance) => {
    if (Platform.OS !== 'web') instance.play();
  });
  const [status, setStatus] = useState(player.status);
  const [isPlaying, setIsPlaying] = useState(player.playing);
  useEventListener(player, 'statusChange', ({ status: nextStatus }) => setStatus(nextStatus));
  useEventListener(player, 'playingChange', ({ isPlaying: nextIsPlaying }) =>
    setIsPlaying(nextIsPlaying),
  );

  if (status === 'error') {
    return (
      <View style={styles.error}>
        <AppText variant="body" color="white" align="center">
          {errorMessage}
        </AppText>
        <Button title={retryLabel} variant="outline" onPress={onRetry} />
      </View>
    );
  }

  return (
    <View style={styles.videoStage} testID="preview-video-stage">
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        playsInline
        contentFit="contain"
      />
      {status !== 'readyToPlay' ? (
        <ActivityIndicator
          style={styles.playerLoading}
          pointerEvents="none"
          size="large"
          color={colors.white}
          accessibilityLabel={loadingLabel}
        />
      ) : null}
      {!isPlaying ? (
        <View style={styles.playOverlay} pointerEvents="box-none">
          <Button title={playLabel} style={styles.playButton} onPress={() => player.play()} />
        </View>
      ) : null}
    </View>
  );
}

function PreviewVideo(props: {
  url: string;
  loadingLabel: string;
  playLabel: string;
  errorMessage: string;
  retryLabel: string;
  onRetry: () => void;
  sourceLabel: string;
  openSourceLabel: string;
  stageSize: { width: number; height: number };
}) {
  const styles = useStyles();
  if (isYouTubeHostUrl(props.url)) {
    const playerWidth =
      props.stageSize.width > 0
        ? Math.min(
            props.stageSize.width,
            (Math.max(200, props.stageSize.height - spacing.sm - 48) * 16) / 9,
          )
        : '100%';
    return (
      <ScrollView
        style={styles.externalScroll}
        contentContainerStyle={styles.externalContent}
        testID="youtube-preview-stage"
      >
        <View style={{ width: playerWidth }} testID="youtube-preview-width">
          <YouTubePlayer
            source={props.url}
            title={props.playLabel}
            loadingLabel={props.loadingLabel}
            errorLabel={props.errorMessage}
            retryLabel={props.retryLabel}
            sourceLabel={props.sourceLabel}
            openSourceLabel={props.openSourceLabel}
            onRetry={props.onRetry}
          />
        </View>
      </ScrollView>
    );
  }
  return <PreviewMp4Video {...props} />;
}

function PreviewBody({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const { t } = useTranslation(['course', 'common', 'errors']);
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { data, isPending, error, refetch } = usePreviewLesson(lessonId);
  const [playerAttempt, setPlayerAttempt] = useState(0);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const onStageLayout = useCallback(({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    setStageSize((previous) =>
      previous.width === layout.width && previous.height === layout.height
        ? previous
        : { width: layout.width, height: layout.height },
    );
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <IconButton
          icon="x"
          color="white"
          onPress={onClose}
          accessibilityLabel={t('course:preview.close')}
          testID="preview-close"
        />
      </View>
      <View style={styles.stage} testID="preview-stage" onLayout={onStageLayout}>
        {isPending ? (
          <ActivityIndicator
            size="large"
            color={colors.white}
            accessibilityLabel={t('course:preview.loading')}
          />
        ) : null}
        {data ? (
          <PreviewVideo
            key={playerAttempt}
            url={data.videoUrl}
            loadingLabel={t('course:preview.loading')}
            playLabel={t('course:preview.play')}
            errorMessage={t('errors:generic')}
            retryLabel={t('common:actions.retry')}
            onRetry={() => setPlayerAttempt((attempt) => attempt + 1)}
            sourceLabel={t('course:preview.sourceLabel')}
            openSourceLabel={t('course:preview.openSource')}
            stageSize={stageSize}
          />
        ) : null}
        {error ? (
          <View style={styles.error}>
            <AppText variant="body" color="white" align="center">
              {getErrorMessage(error)}
            </AppText>
            <Button
              title={t('common:actions.retry')}
              variant="outline"
              onPress={() => void refetch()}
            />
          </View>
        ) : null}
      </View>
      {data ? (
        <AppText variant="title" color="white" numberOfLines={2} style={styles.title}>
          {data.title}
        </AppText>
      ) : null}
    </View>
  );
}

/**
 * Full-screen modal that plays a preview lesson (hero play button / preview row of the Lessons
 * tab). The player is created only once the lesson URL is known and released when closed.
 */
export function PreviewPlayerModal({ lessonId, onClose }: PreviewPlayerModalProps) {
  return (
    <Modal
      visible={lessonId !== null}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      {lessonId !== null ? (
        <DarkThemeScope>
          <PreviewBody lessonId={lessonId} onClose={onClose} />
        </DarkThemeScope>
      ) : null}
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  // The `scrim` token (near-black in both themes) is the video backdrop.
  container: { flex: 1, backgroundColor: t.colors.scrim },
  topBar: { height: 56, justifyContent: 'center', paddingHorizontal: spacing.xs },
  stage: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  videoStage: {
    width: '100%',
    height: '100%',
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: { width: '100%', height: '100%' },
  playOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerLoading: { position: 'absolute', top: spacing.xl },
  playButton: { alignSelf: 'center' },
  error: { alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.xxl },
  title: { padding: spacing.xl },
  externalScroll: { width: '100%', height: '100%' },
  externalContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
}));
