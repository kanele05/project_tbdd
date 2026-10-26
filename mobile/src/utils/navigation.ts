import { router, type Href } from 'expo-router';

/**
 * One step back; when there is no history (screen opened by URL or reloaded with F5 on the web)
 * replace the screen with `fallbackHref` instead of doing nothing.
 */
export function goBackOr(fallbackHref: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallbackHref);
}
