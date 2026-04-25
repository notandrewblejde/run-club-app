import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * Root entry — sends the user to the feed when authenticated, login otherwise.
 * Stays on a loader while `restoreAuth` is reading the JWT from SecureStore.
 */
export default function Index() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F0F0F',
        }}
      >
        <ActivityIndicator color="#00A3E0" />
      </View>
    );
  }

  return isAuthenticated ? (
    <Redirect href="/(tabs)/feed" />
  ) : (
    <Redirect href="/auth/login" />
  );
}
