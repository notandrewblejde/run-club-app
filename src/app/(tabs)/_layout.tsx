import { Tabs } from 'expo-router';
import CustomTabBar from '@/components/nav/CustomTabBar';

/**
 * The visible tabs (feed, clubs, profile) are auto-discovered by expo-router
 * from the filesystem. We only declare Tabs.Screen entries here for the
 * routes that need to be hidden from the tab bar (modal/detail/agent screens).
 *
 * The custom tab bar in CustomTabBar filters routes by name itself, so even
 * with all routes registered we only render icons for the canonical three.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...(props as Parameters<typeof CustomTabBar>[0])} />}
    >
      <Tabs.Screen name="discover/index" options={{ href: null }} />
      <Tabs.Screen name="challenges/index" options={{ href: null }} />
      <Tabs.Screen name="activity/[id]" options={{ href: null }} />
      <Tabs.Screen name="clubs/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="clubs/[id]/members" options={{ href: null }} />
      <Tabs.Screen name="clubs/[id]/invite" options={{ href: null }} />
      <Tabs.Screen name="clubs/[id]/goals/new" options={{ href: null }} />
      <Tabs.Screen name="clubs/new" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="profile/requests" options={{ href: null }} />
      <Tabs.Screen name="users/[id]" options={{ href: null }} />
      <Tabs.Screen name="users/[id]/followers" options={{ href: null }} />
      <Tabs.Screen name="users/[id]/following" options={{ href: null }} />
      <Tabs.Screen name="ai/index" options={{ href: null }} />
    </Tabs>
  );
}
