import { Stack } from 'expo-router';
import { nativeStackBackGestureOptions } from '@/navigation/stackScreenOptions';

/** Stack for the Discover tab. See profile/_layout.tsx for the rationale. */
export default function DiscoverStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...nativeStackBackGestureOptions }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
