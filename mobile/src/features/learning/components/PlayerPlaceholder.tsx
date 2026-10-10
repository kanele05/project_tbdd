import { PlayerStage } from '@/features/media/PlayerStage';
import { PlayerStatus } from '@/features/media/PlayerStatus';
import { useTranslation } from '@/i18n';

import { usePlayerMaxHeight } from '../playerLayout';

export type PlayerPlaceholderProps = {
  /** `loading` spinner, or a `message` (offline / error) with an optional Retry. */
  message?: string;
  onRetry?: () => void;
};

/**
 * Dark 16:9 box in the video slot while the lesson loads, or when it cannot be played. It is the
 * same size as the player, so the tabs below do not jump when the video appears.
 */
export function PlayerPlaceholder({ message, onRetry }: PlayerPlaceholderProps) {
  const { t } = useTranslation(['learning', 'common']);
  const maxHeight = usePlayerMaxHeight();
  return (
    <PlayerStage maxHeight={maxHeight} testID="player-placeholder">
      {message ? (
        <PlayerStatus
          kind="error"
          label={message}
          retryLabel={t('common:actions.retry')}
          onRetry={onRetry}
        />
      ) : (
        <PlayerStatus kind="loading" label={t('loadingVideo')} />
      )}
    </PlayerStage>
  );
}
