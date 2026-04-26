import { Stack } from 'expo-router';
import { nativeStackBackGestureOptions } from '@/navigation/stackScreenOptions';

/**
 * Stack for the Clubs tab. See profile/_layout.tsx for rationale — putting
 * detail screens (new, [id]/...) in a real Stack instead of flat hidden tabs
 * makes router.back() pop within the tab and triggers screen-level cleanup.
 */
export default function ClubsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...nativeStackBackGestureOptions }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/edit" />
      <Stack.Screen name="[id]/posts/new" />
      <Stack.Screen name="[id]/posts/[postId]/edit" />
      <Stack.Screen name="[id]/members" />
      <Stack.Screen name="[id]/invite" />
      <Stack.Screen name="[id]/goals/new" />
    </Stack>
  );
}
