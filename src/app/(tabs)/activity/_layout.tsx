import { Stack } from 'expo-router';

/** Stack for the Activity tab. Holds the activity-detail screen. */
export default function ActivityStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
