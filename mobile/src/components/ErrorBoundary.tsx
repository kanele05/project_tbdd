import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/ui/ErrorState';
import { STRINGS } from '@/constants/strings';
import { colors } from '@/theme';

export type ErrorFallbackProps = {
  error?: unknown;
  onRetry: () => void;
};

/** Full-screen fallback shown when rendering crashes. Reused by the Expo Router `ErrorBoundary` export. */
export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const detail = __DEV__ && error instanceof Error ? error.message : undefined;
  return (
    <View style={styles.container}>
      <ErrorState
        title={STRINGS.errors.boundaryTitle}
        message={detail ?? STRINGS.errors.boundaryMessage}
        onRetry={onRetry}
        retryLabel="Try again"
      />
    </View>
  );
}

type ErrorBoundaryProps = {
  children: ReactNode;
  /** Called after the user pressed "Try again" (e.g. to clear caches). */
  onReset?: () => void;
};

type ErrorBoundaryState = { error: unknown; hasError: boolean };

/**
 * App-wide error boundary (M-30). Catches render errors below it and offers "Try again", which
 * re-mounts the children. Errors from async code / event handlers are handled by ErrorState/Toast.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, hasError: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error, hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (__DEV__) {
      console.error('ErrorBoundary caught an error', error, info.componentStack);
    }
  }

  private handleRetry = (): void => {
    this.props.onReset?.();
    this.setState({ error: null, hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
