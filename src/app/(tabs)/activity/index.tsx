import { Redirect } from 'expo-router';

/**
 * Hidden base route for the activity tab stack. Detail screens are pushed on top;
 * popping returns here, then we send the user to the feed (same outcome as the
 * in-app back affordance).
 */
export default function ActivityTabIndex() {
  return <Redirect href="/(tabs)/feed" />;
}
