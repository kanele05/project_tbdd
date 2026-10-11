import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppFrame } from '@/components/AppFrame';
import { ErrorBoundary as AppErrorBoundary, ErrorFallback } from '@/components/ErrorBoundary';
import { AppIntro, getIntroFreezeMs } from '@/components/intro';
import { ToastProvider } from '@/components/ui/Toast';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { persistOptions } from '@/lib/persister';
import { queryClient, setupQueryEnvironment } from '@/lib/queryClient';
import { selectIsLoggedIn, useAuthStore } from '@/stores/authStore';
import { fontAssets, ThemeProvider, useTheme } from '@/theme';
import { useNavigationTheme } from '@/theme/navigationTheme';

// Keep the native splash visible until fonts + cache + session are ready (SC-01).
void SplashScreen.preventAutoHideAsync();
setupQueryEnvironment();

/** Expo Router route-level error boundary: same fallback + "Try again" as the app-wide one. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return <ErrorFallback error={error} onRetry={() => void retry()} />;
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const isReady = useAppBootstrap(fontsReady);
  const isLoggedIn = useAuthStore(selectIsLoggedIn);
  const { colors, statusBarStyle } = useTheme();
  const navigationTheme = useNavigationTheme();
  // The launch intro plays once per app start, in parallel with the bootstrap (SC-01).
  const [isIntroDone, setIsIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIsIntroDone(true), []);
  const intro = isIntroDone ? null : (
    <AppIntro
      isActive={fontsReady}
      isReady={isReady}
      onFinish={finishIntro}
      freezeAtMs={getIntroFreezeMs()}
    />
  );

  return (
    <>
      {isReady ? (
        <NavigationThemeProvider value={navigationTheme}>
          <AppFrame>
            <StatusBar style={statusBarStyle} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="index" />

              {/* Logged-out only. Guard flips => Expo Router redirects automatically. */}
              <Stack.Protected guard={!isLoggedIn}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>

              {/* Logged-in only. */}
              <Stack.Protected guard={isLoggedIn}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="search-filter" options={{ presentation: 'modal' }} />
                <Stack.Screen name="course-list" />
                <Stack.Screen name="course/[id]/index" />
                <Stack.Screen name="course/[id]/reviews" />
                <Stack.Screen name="course/[id]/write-review" options={{ presentation: 'modal' }} />
                <Stack.Screen name="learn/[courseId]/index" />
                <Stack.Screen name="learn/[courseId]/tutor" />
                <Stack.Screen name="learn/[courseId]/quiz" />
                <Stack.Screen
                  name="learn/[courseId]/submit-project"
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen name="question/[id]" />
                <Stack.Screen name="teacher/[id]" />
                <Stack.Screen name="teachers" />
                <Stack.Screen name="cart" />
                <Stack.Screen name="checkout" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="profile/edit" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="studio/[id]/index" />
                <Stack.Screen name="studio/[id]/edit" />
                <Stack.Screen name="studio/[id]/curriculum" />
                <Stack.Screen name="studio/ai-draft" options={{ presentation: 'modal' }} />
                <Stack.Screen name="studio/[id]/stats" />
                <Stack.Screen name="studio/[id]/submissions" />
                <Stack.Screen name="profile/teacher-edit" />
                <Stack.Screen name="admin/courses" />
                <Stack.Screen name="admin/courses/[id]" />
                <Stack.Screen name="admin/users" />
              </Stack.Protected>
            </Stack>
          </AppFrame>
        </NavigationThemeProvider>
      ) : null}
      {intro}
    </>
  );
}

/** Root view: the screen color follows the theme (no white flash behind the navigator in dark mode). */
function ThemedRoot({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.background }]}>
      {children}
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  // A font error must not block the app: text falls back to the system font.
  const [areFontsLoaded, fontError] = useFonts(fontAssets);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedRoot>
          <AppErrorBoundary>
            <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
              <ToastProvider>
                <RootNavigator fontsReady={areFontsLoaded || fontError !== null} />
              </ToastProvider>
            </PersistQueryClientProvider>
          </AppErrorBoundary>
        </ThemedRoot>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
