import { ErrorState } from '@/components/ui/ErrorState';
import { useTranslation } from '@/i18n';

import { getAdminErrorMessage, isForbiddenError } from '../adminErrors';

export type AdminErrorStateProps = {
  error: unknown;
  title?: string;
  onRetry?: () => void;
};

/**
 * Error placeholder of the admin screens. A 403 means the account is not an administrator (any
 * more): say so plainly and offer no Retry, because retrying cannot help.
 */
export function AdminErrorState({ error, title, onRetry }: AdminErrorStateProps) {
  const { t } = useTranslation('admin');
  const isForbidden = isForbiddenError(error);
  return (
    <ErrorState
      error={error}
      title={isForbidden ? t('forbiddenTitle') : title}
      message={isForbidden ? t('forbidden') : getAdminErrorMessage(error)}
      onRetry={isForbidden ? undefined : onRetry}
    />
  );
}
