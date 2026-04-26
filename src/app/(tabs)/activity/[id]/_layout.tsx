import { Stack } from 'expo-router';
import { nativeStackBackGestureOptions } from '@/navigation/stackScreenOptions';

export default function ActivityIdLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...nativeStackBackGestureOptions }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
    </Stack>
  );
}
