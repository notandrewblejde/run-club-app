import { Stack } from 'expo-router';
import { nativeStackBackGestureOptions } from '@/navigation/stackScreenOptions';

/** Stack for the Challenges tab. */
export default function ChallengesStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...nativeStackBackGestureOptions }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
