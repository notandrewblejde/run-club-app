import { Stack } from 'expo-router'
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useEffect } from 'react';
import { nativeStackBackGestureOptions } from '@/navigation/stackScreenOptions';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api/queryClient';
import { useAuthStore } from '@/stores/useAuthStore';
import { BottomBarActionsProvider } from '@/components/nav/BottomBarActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { useAppleHealthBackgroundSync } from '@/health/useAppleHealthBackgroundSync';
import { UniversalActivityLinkHandler } from '@/components/UniversalActivityLinkHandler';

export default function RootLayout() {
  usePushNotifications()
  const restoreAuth = useAuthStore((s) => s.restoreAuth);

  useEffect(() => {
    void restoreAuth();
  }, [restoreAuth]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AppleHealthSyncBridge />
          <UniversalActivityLinkHandler />
          <BottomBarActionsProvider>
            <ThemedShell />
          </BottomBarActionsProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function AppleHealthSyncBridge() {
  useAppleHealthBackgroundSync();
  return null;
}

function ThemedShell() {
  const { tokens, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tokens.background },
          ...nativeStackBackGestureOptions,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
      </Stack>
    </>
  );
}
