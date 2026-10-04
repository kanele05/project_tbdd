import { useCallback } from 'react';

import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { confirmAction } from '@/utils/confirmAction';

/**
 * "Log out" with the confirmation every entry point must show (Settings, Profile menu): a native
 * alert on Android / iOS, a browser `confirm()` on the web. Returns a function that resolves once
 * the user answered; the session is only cleared when they confirmed.
 */
export function useConfirmLogout(): () => Promise<void> {
  const { t } = useTranslation(['auth', 'common']);
  const logout = useAuthStore((state) => state.logout);

  return useCallback(async () => {
    const isConfirmed = await confirmAction({
      title: t('auth:logout'),
      message: t('auth:logoutMessage'),
      confirmLabel: t('auth:logout'),
      cancelLabel: t('common:actions.cancel'),
      isDestructive: true,
    });
    if (isConfirmed) await logout();
  }, [t, logout]);
}
