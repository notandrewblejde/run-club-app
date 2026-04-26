import { Stack } from 'expo-router';

/**
 * Stack for the Users tab. Holds the user-detail screen plus its Followers
 * and Following sub-screens, so push/pop stays inside this tab.
 */
export default function UsersStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/followers" />
      <Stack.Screen name="[id]/following" />
    </Stack>
  );
}
