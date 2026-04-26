import { Stack } from 'expo-router';
import { nativeStackBackGestureOptions } from '@/navigation/stackScreenOptions';

/**
 * Keep a real screen under activity details so the native stack has depth > 1.
 * Otherwise opening /activity/:id from the feed is the only route on this stack
 * and iOS has nothing to interactive-pop (edge swipe does nothing).
 */
export const unstable_settings = {
  initialRouteName: 'index',
};

/**
 * Single stack for the activity tab (no nested `[id]/_layout` Stack).
 * Otherwise the detail screen sat alone on an inner stack and the iOS edge-swipe
 * could not pop. Detail + edit are siblings: `[id]/index`, `[id]/edit`.
 */
export default function ActivityStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...nativeStackBackGestureOptions }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/edit" />
    </Stack>
  );
}
