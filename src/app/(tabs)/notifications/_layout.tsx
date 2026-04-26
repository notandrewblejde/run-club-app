import { Stack } from 'expo-router';
import { nativeStackBackGestureOptions } from '@/navigation/stackScreenOptions';

export default function NotificationsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...nativeStackBackGestureOptions }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
