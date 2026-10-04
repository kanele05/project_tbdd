import { Alert, Platform, type AlertButton } from 'react-native';

import { confirmAction } from './confirmAction';

const OPTIONS = {
  title: 'Log out',
  message: 'Are you sure?',
  confirmLabel: 'Log out',
  cancelLabel: 'Cancel',
  isDestructive: true,
};

describe('confirmAction', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, 'window');
  });

  describe('on native', () => {
    function pressButton(label: string) {
      const spy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
        const button = (buttons as AlertButton[]).find((b) => b.text === label);
        button?.onPress?.();
      });
      return spy;
    }

    it('resolves true when the confirm button is pressed', async () => {
      const spy = pressButton('Log out');
      await expect(confirmAction(OPTIONS)).resolves.toBe(true);
      const buttons = spy.mock.calls[0]?.[2] as AlertButton[];
      expect(buttons.find((b) => b.text === 'Log out')?.style).toBe('destructive');
    });

    it('resolves false when cancelled', async () => {
      pressButton('Cancel');
      await expect(confirmAction(OPTIONS)).resolves.toBe(false);
    });

    it('resolves false when the dialog is dismissed', async () => {
      jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, _b, options) => {
        options?.onDismiss?.();
      });
      await expect(confirmAction(OPTIONS)).resolves.toBe(false);
    });
  });

  describe('on the web', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'web');
    });

    it('uses window.confirm (Alert.alert does nothing on react-native-web)', async () => {
      const confirm = jest.fn(() => true);
      Object.defineProperty(globalThis, 'window', { configurable: true, value: { confirm } });
      const alertSpy = jest.spyOn(Alert, 'alert');

      await expect(confirmAction(OPTIONS)).resolves.toBe(true);

      expect(confirm).toHaveBeenCalledWith('Log out\n\nAre you sure?');
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('resolves false when the user declines', async () => {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: { confirm: () => false },
      });
      await expect(confirmAction(OPTIONS)).resolves.toBe(false);
    });
  });
});
