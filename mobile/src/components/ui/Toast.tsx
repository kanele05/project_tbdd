import Feather from '@expo/vector-icons/Feather';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, radius, shadows, spacing, useTheme } from '@/theme';
import type { Palette } from '@/theme';

import { AppText } from './AppText';
import type { FeatherIconName } from './icons';

export type ToastType = 'success' | 'error' | 'info';

export type ToastOptions = {
  type?: ToastType;
  /** Auto-dismiss delay in ms. Default 3000 (4000 when there is an action). */
  duration?: number;
  /** Optional action button, e.g. "Undo". */
  actionLabel?: string;
  onAction?: () => void;
};

type ToastMessage = ToastOptions & { id: number; message: string };

export type ToastApi = {
  show: (message: string, options?: ToastOptions) => void;
  success: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  error: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  info: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  hide: () => void;
};

const ICONS: Record<ToastType, FeatherIconName> = {
  success: 'check-circle',
  error: 'alert-circle',
  info: 'info',
};

function iconColor(colors: Palette, type: ToastType): string {
  if (type === 'success') return colors.success;
  if (type === 'error') return colors.danger;
  return colors.primary;
}

/** Space kept below the toast so it floats above the floating tab bar (64 dp + gaps). */
const BOTTOM_OFFSET = 88;

const ToastContext = createContext<ToastApi | null>(null);

/* ---- imperative access for code that lives outside React (query cache callbacks...) ---- */
let externalShow: ((message: string, options?: ToastOptions) => void) | null = null;

/** Show a toast from non-component code. No-op until `ToastProvider` has mounted. */
export function showToast(message: string, options?: ToastOptions): void {
  externalShow?.(message, options);
}

/**
 * Global toast host. Mount once near the root (inside the SafeAreaProvider); use `useToast()`
 * in components or `showToast()` elsewhere. One toast at a time; a new one replaces the old.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastMessage | null>(null);
  const counter = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const themed = useStyles();

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setCurrent(null);
      },
    );
  }, [clearTimer, opacity]);

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      clearTimer();
      counter.current += 1;
      const next: ToastMessage = { id: counter.current, message, type: 'info', ...options };
      setCurrent(next);
      AccessibilityInfo.announceForAccessibility(message);
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      const duration = options?.duration ?? (options?.actionLabel ? 4000 : 3000);
      timer.current = setTimeout(hide, duration);
    },
    [clearTimer, hide, opacity],
  );

  useEffect(() => {
    externalShow = show;
    return () => {
      externalShow = null;
      clearTimer();
    };
  }, [show, clearTimer]);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, options) => show(message, { ...options, type: 'success' }),
      error: (message, options) => show(message, { ...options, type: 'error' }),
      info: (message, options) => show(message, { ...options, type: 'info' }),
      hide,
    }),
    [show, hide],
  );

  const type = current?.type ?? 'info';

  return (
    <ToastContext.Provider value={api}>
      {children}
      {current ? (
        <View
          pointerEvents="box-none"
          style={[styles.host, { paddingBottom: insets.bottom + BOTTOM_OFFSET }]}
        >
          <Animated.View
            style={[styles.toast, themed.toast, shadows.floating, { opacity }]}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            testID="toast"
          >
            <Feather name={ICONS[type]} size={20} color={iconColor(colors, type)} />
            <AppText variant="body" color="onToast" style={styles.message}>
              {current.message}
            </AppText>
            {current.actionLabel ? (
              <Pressable
                onPress={() => {
                  current.onAction?.();
                  hide();
                }}
                hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={current.actionLabel}
              >
                <AppText variant="label" color="toastAccent">
                  {current.actionLabel}
                </AppText>
              </Pressable>
            ) : null}
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

/** `const toast = useToast(); toast.success('Saved')`. Must be used under `ToastProvider`. */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    maxWidth: 480,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  message: { flexShrink: 1 },
});

const useStyles = makeStyles((t) => ({
  // In dark mode an outline keeps the toast visible where its shadow disappears.
  toast: {
    backgroundColor: t.colors.toast,
    borderWidth: 1,
    borderColor: t.isDark ? t.colors.border : t.colors.toast,
  },
}));
