import { router } from 'expo-router';
import type { ReactNode } from 'react';

import type { FeatherIconName } from '@/components/ui/icons';

export type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Link row under the form ("Don't have an account? Sign up"). */
  footer?: ReactNode;
  /**
   * Icon of the step screens (verify email, 2FA, forgot / reset password): puts the title over the
   * poster wall (blurred) with an icon disc and adds a back button.
   */
  icon?: FeatherIconName;
  /** Custom back handler (default: previous screen, or Login when there is no history). */
  onBack?: () => void;
};

/** Default back action of the step screens: previous screen, or Login when there is no history. */
export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/login');
}
