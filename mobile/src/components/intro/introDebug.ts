import { Platform } from 'react-native';

/**
 * Dev-only (web): `?introT=900` freezes the launch intro at 900 ms so a frame can be screenshotted.
 * Always `undefined` in production builds and on native.
 */
export function getIntroFreezeMs(): number | undefined {
  if (!__DEV__ || Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
  const raw = new URLSearchParams(window.location.search).get('introT');
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
