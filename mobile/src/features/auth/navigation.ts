import { router } from 'expo-router';

/**
 * Back to the Login screen that sits below the current step screen (pops the stack instead of
 * stacking a second Login). Works as a plain navigation when Login is not in the stack.
 */
export function goToLogin(): void {
  router.dismissTo('/login');
}

/** One step back (e.g. from "reset password" to "forgot password"); Login when there is no history. */
export function goBackOrLogin(): void {
  if (router.canGoBack()) router.back();
  else goToLogin();
}
