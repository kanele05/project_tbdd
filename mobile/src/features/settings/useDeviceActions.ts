import { useToast } from '@/components/ui/Toast';
import { getAuthErrorMessage } from '@/features/auth/authErrors';
import { useTranslation } from '@/i18n';
import type { SessionDto } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { useRevokeOtherSessions, useRevokeSession } from './hooks';

/**
 * Remote sign-out of the signed-in devices (AUTH-09): "log out this device" / "log out all the
 * others", each behind a confirmation. Shared by the phone list and the PC table of `DevicesCard`.
 */
export function useDeviceActions() {
  const { t } = useTranslation(['settings', 'common']);
  const toast = useToast();
  const revoke = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();

  const signOutDevice = async (session: SessionDto) => {
    const isConfirmed = await confirmAction({
      title: t('settings:security.devices.confirmTitle'),
      message: t('settings:security.devices.confirmMessage', { name: session.deviceName }),
      confirmLabel: t('settings:security.devices.signOut'),
      cancelLabel: t('common:actions.cancel'),
      isDestructive: true,
    });
    if (!isConfirmed) return;
    try {
      await revoke.mutateAsync(session.id);
      toast.success(t('settings:security.devices.revoked'));
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    }
  };

  const signOutOthers = async () => {
    const isConfirmed = await confirmAction({
      title: t('settings:security.devices.confirmOthersTitle'),
      message: t('settings:security.devices.confirmOthersMessage'),
      confirmLabel: t('settings:security.devices.signOutOthers'),
      cancelLabel: t('common:actions.cancel'),
      isDestructive: true,
    });
    if (!isConfirmed) return;
    try {
      const { revokedCount } = await revokeOthers.mutateAsync();
      toast.success(t('settings:security.devices.revokedOthers', { count: revokedCount }));
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    }
  };

  return {
    signOutDevice,
    signOutOthers,
    isBusy: revoke.isPending || revokeOthers.isPending,
    isRevokingOthers: revokeOthers.isPending,
  };
}
