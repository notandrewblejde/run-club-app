import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { nativeStackBackGestureOptions } from '@/navigation/stackScreenOptions';

/**
 * Keep a real screen under activity details so the native stack has depth > 1.
 * Otherwise opening /activity/:id from the feed is the only route on this stack
 * and iOS has nothing to interactive-pop (edge swipe does nothing).
 *
 * Call sites that open a detail must use `router.push(..., { withAnchor: true })`
 * so the `index` route stays under the detail in history; otherwise Expo can mount
 * only the detail screen and the swipe-back gesture never activates.
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
      <Stack.Screen
        name="[id]/index"
        options={
          Platform.OS === 'ios'
            ? {
                /** Widen left-edge recognition so vertical ScrollView competes less with the pop gesture. */
                gestureResponseDistance: { start: 64 },
              }
            : undefined
        }
      />
      <Stack.Screen name="[id]/edit" />
    </Stack>
  );
}
