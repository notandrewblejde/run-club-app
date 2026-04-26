import { Stack } from 'expo-router';
import { nativeStackBackGestureOptions } from '@/navigation/stackScreenOptions';

/** Stack for the Activity tab. Holds the activity-detail screen. */
export default function ActivityStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...nativeStackBackGestureOptions }}>
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
