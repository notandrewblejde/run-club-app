import { Stack } from 'expo-router';

/** Stack for the AI tab. */
export default function AiStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
