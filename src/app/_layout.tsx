import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api/queryClient';
import { useAuthStore } from '@/stores/useAuthStore';

export default function RootLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const restoreAuth = useAuthStore((s) => s.restoreAuth);

  useEffect(() => {
    void restoreAuth();
  }, [restoreAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        )}
      </Stack>
    </QueryClientProvider>
  );
}
