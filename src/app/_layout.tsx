import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api/queryClient';
import { useAuthStore } from '@/stores/useAuthStore';
import { BottomBarActionsProvider } from '@/components/nav/BottomBarActionsContext';

export default function RootLayout() {
  const restoreAuth = useAuthStore((s) => s.restoreAuth);

  useEffect(() => {
    void restoreAuth();
  }, [restoreAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <BottomBarActionsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
        </Stack>
      </BottomBarActionsProvider>
    </QueryClientProvider>
  );
}
