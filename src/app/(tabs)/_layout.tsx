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
      {/*
        Every tab folder ships its own Stack via _layout.tsx — the Tabs
        navigator only sees one screen per tab so push/back stays within the
        tab and `router.back()` pops the inner stack instead of switching tabs.
        The hidden tabs below register `href: null` so the default tab bar
        wouldn't show them; our CustomTabBar separately filters the visible
        pill to feed/clubs/profile via the ICONS map.
      */}
      <Tabs.Screen name="discover" options={{ href: null }} />
      <Tabs.Screen name="challenges" options={{ href: null }} />
      <Tabs.Screen name="activity" options={{ href: null }} />
      <Tabs.Screen name="users" options={{ href: null }} />
      <Tabs.Screen name="ai" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
