import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Tabs, router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { House, Users, MapPin, Trophy, User, Sparkles } from 'lucide-react-native';

const ACTIVE = '#fff';
const INACTIVE = 'rgba(255,255,255,0.45)';

/**
 * Linear-style floating navigation: a centered translucent pill for primary
 * routes, plus a separate smaller pill on the right that invokes the AI
 * coach.
 */
export default function TabsLayout() {
  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarBackground: () => (
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
              <View style={styles.blurOverlay} />
            </BlurView>
          ),
          tabBarShowLabel: false,
          tabBarActiveTintColor: ACTIVE,
          tabBarInactiveTintColor: INACTIVE,
          tabBarItemStyle: styles.tabItem,
        }}
      >
        <Tabs.Screen
          name="feed"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color }) => <House color={color} size={20} strokeWidth={2.2} />,
          }}
        />
        <Tabs.Screen
          name="clubs"
          options={{
            title: 'Clubs',
            tabBarIcon: ({ color }) => <Users color={color} size={20} strokeWidth={2.2} />,
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color }) => <MapPin color={color} size={20} strokeWidth={2.2} />,
          }}
        />
        <Tabs.Screen
          name="challenges"
          options={{
            title: 'Challenges',
            tabBarIcon: ({ color }) => <Trophy color={color} size={20} strokeWidth={2.2} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <User color={color} size={20} strokeWidth={2.2} />,
          }}
        />
        {/* Hidden routes the tab bar shouldn't show */}
        <Tabs.Screen name="activity/[id]" options={{ href: null }} />
        <Tabs.Screen name="clubs/[id]/index" options={{ href: null }} />
        <Tabs.Screen name="clubs/new" options={{ href: null }} />
        <Tabs.Screen name="ai/index" options={{ href: null }} />
      </Tabs>

      <AgentButton />
    </View>
  );
}

function AgentButton() {
  return (
    <Pressable
      style={({ pressed }) => [styles.agentPill, pressed && styles.agentPillPressed]}
      onPress={() => router.push('/(tabs)/ai')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Open AI coach"
    >
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={styles.blurOverlay} />
      </BlurView>
      <Sparkles color="#fff" size={20} strokeWidth={2.2} />
    </Pressable>
  );
}

const PILL_HEIGHT = 56;
const PILL_RADIUS = PILL_HEIGHT / 2;
const PILL_BOTTOM = 28;

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabBar: {
    position: 'absolute',
    bottom: PILL_BOTTOM,
    left: 24,
    right: 88,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  blurOverlay: { flex: 1, backgroundColor: 'rgba(20,20,22,0.55)' },
  tabItem: { height: PILL_HEIGHT },
  agentPill: {
    position: 'absolute',
    right: 24,
    bottom: PILL_BOTTOM,
    width: PILL_HEIGHT,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  agentPillPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
});
