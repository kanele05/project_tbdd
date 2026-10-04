import { useVideoPlayer, VideoView } from 'expo-video';
import { ActivityIndicator, Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, IconButton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/appError';
import { makeStyles, spacing, useTheme } from '@/theme';

import { usePreviewLesson } from '../hooks';

export type PreviewPlayerModalProps = {
  /** Lesson to preview; the modal is open while this is not null. */
  lessonId: string | null;
  onClose: () => void;
};

function PreviewVideo({ url }: { url: string }) {
  const styles = useStyles();
  const player = useVideoPlayer(url, (instance) => {
    instance.play();
  });
  return <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />;
}

function PreviewBody({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const { t } = useTranslation(['course', 'common']);
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { data, isPending, error, refetch } = usePreviewLesson(lessonId);

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
      <View style={styles.stage}>
        {isPending ? (
          <ActivityIndicator
            size="large"
            color={colors.white}
            accessibilityLabel={t('course:preview.loading')}
          />
        ) : null}
        {data ? <PreviewVideo url={data.videoUrl} /> : null}
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
      {lessonId !== null ? <PreviewBody lessonId={lessonId} onClose={onClose} /> : null}
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  // The `scrim` token (near-black in both themes) is the video backdrop.
  container: { flex: 1, backgroundColor: t.colors.scrim },
  topBar: { height: 56, justifyContent: 'center', paddingHorizontal: spacing.xs },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  video: { width: '100%', aspectRatio: 16 / 9 },
  error: { alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.xxl },
  title: { padding: spacing.xl },
}));
