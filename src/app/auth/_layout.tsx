import { Stack } from 'expo-router';
import { nativeStackBackGestureOptions } from '@/navigation/stackScreenOptions';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...nativeStackBackGestureOptions,
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="strava-connect" />
    </Stack>
  );
}
