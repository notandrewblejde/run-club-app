import { Stack } from 'expo-router';
import { nativeStackBackGestureOptions } from '@/navigation/stackScreenOptions';

/** Stack wrapper so feed matches other tabs and any future pushed routes get the same back gestures. */
export default function FeedStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...nativeStackBackGestureOptions }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
