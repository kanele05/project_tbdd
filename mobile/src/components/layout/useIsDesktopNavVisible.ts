import { useBreakpoint } from '@/hooks/useBreakpoint';
import { selectIsLoggedIn, useAuthStore } from '@/stores/authStore';

/** The desktop top bar exists on wide windows (>= 768) for signed-in users only (not on auth screens). */
export function useIsDesktopNavVisible(): boolean {
  const { isWide } = useBreakpoint();
  const isLoggedIn = useAuthStore(selectIsLoggedIn);
  return isWide && isLoggedIn;
}
