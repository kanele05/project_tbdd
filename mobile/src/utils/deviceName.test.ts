import { Platform } from 'react-native';

import { getDeviceName, parseUserAgent, resetDeviceNameCache } from './deviceName';

const mockDevice: {
  modelName: string | null;
  deviceName: string | null;
  osName: string | null;
  osVersion: string | null;
} = { modelName: 'Pixel 7', deviceName: "Khang's phone", osName: 'Android', osVersion: '15' };

jest.mock('expo-device', () => ({
  get modelName() {
    return mockDevice.modelName;
  },
  get deviceName() {
    return mockDevice.deviceName;
  },
  get osName() {
    return mockDevice.osName;
  },
  get osVersion() {
    return mockDevice.osVersion;
  },
}));

const EDGE_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

describe('parseUserAgent', () => {
  it('recognizes Edge before Chrome', () => {
    expect(parseUserAgent(EDGE_WINDOWS)).toEqual({ browser: 'Edge', os: 'Windows' });
  });

  it('recognizes Safari on iOS', () => {
    expect(parseUserAgent(SAFARI_IPHONE)).toEqual({ browser: 'Safari', os: 'iOS' });
  });

  it('returns nulls for an unknown agent', () => {
    expect(parseUserAgent('curl/8.0')).toEqual({ browser: null, os: null });
  });
});

describe('getDeviceName', () => {
  beforeEach(() => {
    resetDeviceNameCache();
    mockDevice.modelName = 'Pixel 7';
    mockDevice.deviceName = "Khang's phone";
    mockDevice.osName = 'Android';
    mockDevice.osVersion = '15';
  });

  afterEach(() => jest.restoreAllMocks());

  it('uses the model name and OS on a phone (never the user-chosen device name)', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(getDeviceName()).toBe('Pixel 7 · Android 15');
  });

  it('falls back to the device name, then to a generic label', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockDevice.modelName = null;
    expect(getDeviceName()).toBe("Khang's phone · Android 15");
    resetDeviceNameCache();
    mockDevice.deviceName = null;
    mockDevice.osName = null;
    mockDevice.osVersion = null;
    expect(getDeviceName()).toBe('Android device · android');
  });

  it('describes the browser and OS on the web', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { userAgent: EDGE_WINDOWS },
    });
    try {
      expect(getDeviceName()).toBe('Edge on Windows');
    } finally {
      if (original) Object.defineProperty(globalThis, 'navigator', original);
    }
  });

  it('is stable (cached) and at most 80 characters', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockDevice.modelName = 'X'.repeat(200);
    const first = getDeviceName();
    mockDevice.modelName = 'Other';
    expect(getDeviceName()).toBe(first);
    expect(first).toHaveLength(80);
  });
});
