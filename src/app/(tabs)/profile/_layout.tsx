import { Stack } from 'expo-router';

/**
 * Stack for the Profile tab. Wrapping the children in a Stack (instead of
 * registering each as a flat hidden tab) means router.back() from edit/requests
 * pops within this tab and the popped screen unmounts, running its useEffect
 * cleanups (e.g. clearActions in BottomBarActionsContext).
 */
export default function ProfileStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="requests" />
    </Stack>
  );
}
