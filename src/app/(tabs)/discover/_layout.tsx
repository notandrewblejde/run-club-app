import { Stack } from 'expo-router';

/** Stack for the Discover tab. See profile/_layout.tsx for the rationale. */
export default function DiscoverStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
