import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api/queryClient';
import { useAuthStore } from '@/stores/useAuthStore';
import { BottomBarActionsProvider } from '@/components/nav/BottomBarActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

export default function RootLayout() {
  const restoreAuth = useAuthStore((s) => s.restoreAuth);

  useEffect(() => {
    void restoreAuth();
  }, [restoreAuth]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BottomBarActionsProvider>
            <ThemedShell />
          </BottomBarActionsProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
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
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
      </Stack>
    </>
  );
}
