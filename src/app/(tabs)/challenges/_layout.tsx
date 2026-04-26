import { Stack } from 'expo-router';

/** Stack for the Challenges tab. */
export default function ChallengesStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
