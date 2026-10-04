import { Alert, Platform } from 'react-native';

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Red confirm button on iOS (log out, delete...). */
  isDestructive?: boolean;
};

/**
 * Cross-platform "Are you sure?" dialog. `Alert.alert` is a silent no-op on react-native-web, so on
 * the web a browser `confirm()` is used instead. Resolves `true` when the user confirmed.
 */
export function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel,
  isDestructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    const hasConfirm = typeof window !== 'undefined' && typeof window.confirm === 'function';
    return Promise.resolve(hasConfirm ? window.confirm(`${title}\n\n${message}`) : true);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: isDestructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
