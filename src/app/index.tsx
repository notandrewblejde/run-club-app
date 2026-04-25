import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTheme } from '@/theme/ThemeContext';

export default function Index() {
  const { tokens } = useTheme();
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tokens.background,
        }}
      >
        <ActivityIndicator color={tokens.accentBlue} />
      </View>
    );
  }

  return isAuthenticated ? (
    <Redirect href="/(tabs)/feed" />
  ) : (
    <Redirect href="/auth/login" />
  );
}
