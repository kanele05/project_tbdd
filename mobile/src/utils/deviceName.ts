import * as Device from 'expo-device';
import { Platform } from 'react-native';

/** The server stores at most 80 characters (`deviceName` in `auth.schema.ts`). */
const MAX_LENGTH = 80;

type Detected = { browser: string | null; os: string | null };

/** Browser + OS out of a `navigator.userAgent` string (same families the server recognizes). */
export function parseUserAgent(userAgent: string): Detected {
  const browser = /Edg(e|A|iOS)?\//.test(userAgent)
    ? 'Edge'
    : /OPR\/|Opera/.test(userAgent)
      ? 'Opera'
      : /Firefox\/|FxiOS\//.test(userAgent)
        ? 'Firefox'
        : /Chrome\/|CriOS\//.test(userAgent)
          ? 'Chrome'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : null;
  const os = /Android/i.test(userAgent)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(userAgent)
      ? 'iOS'
      : /Windows/i.test(userAgent)
        ? 'Windows'
        : /Mac OS X|Macintosh/i.test(userAgent)
          ? 'macOS'
          : /Linux|X11/i.test(userAgent)
            ? 'Linux'
            : null;
  return { browser, os };
}

function webDeviceName(): string {
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const { browser, os } = parseUserAgent(userAgent);
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? 'Web browser';
}

function nativeDeviceName(): string {
  const fallbackModel = Platform.OS === 'ios' ? 'iPhone' : 'Android device';
  // `modelName` ("Pixel 7") rather than the user-chosen device name, which often holds a real name.
  const model = Device.modelName ?? Device.deviceName ?? fallbackModel;
  const os = [Device.osName ?? Platform.OS, Device.osVersion].filter(Boolean).join(' ');
  return `${model} · ${os}`;
}

let cached: string | null = null;

/**
 * Human-readable name of this device for the "Devices" list ("Pixel 7 · Android 15",
 * "Edge on Windows"). Sent on login / email verification / 2FA so the server does not have to guess
 * from the User-Agent. Stable for the lifetime of the app.
 */
export function getDeviceName(): string {
  cached ??= (Platform.OS === 'web' ? webDeviceName() : nativeDeviceName())
    .trim()
    .slice(0, MAX_LENGTH);
  return cached;
}

/** Test helper: forget the cached name. */
export function resetDeviceNameCache(): void {
  cached = null;
}
