import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View } from 'react-native';

import { ErrorState } from '@/components/ui/ErrorState';
import { useTranslation } from '@/i18n';
import { makeStyles } from '@/theme';

export type ErrorFallbackProps = {
  error?: unknown;
  onRetry: () => void;
};

/** Full-screen fallback shown when rendering crashes. Reused by the Expo Router `ErrorBoundary` export. */
export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const { t } = useTranslation('errors');
  const styles = useStyles();
  const detail = __DEV__ && error instanceof Error ? error.message : undefined;
  return (
    <View style={styles.container}>
      <ErrorState
        title={t('boundaryTitle')}
        message={detail ?? t('boundaryMessage')}
        onRetry={onRetry}
        retryLabel={t('tryAgain')}
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

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.background,
  },
}));
