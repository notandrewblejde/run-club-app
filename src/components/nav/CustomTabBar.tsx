import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { router } from 'expo-router';
import { useBottomBarActions, type BottomBarAction } from './BottomBarActionsContext';

/**
 * Linear-style custom tab bar with three render modes:
 *   1. Root (feed/clubs/profile) — pill of tab icons + agent pill on the right.
 *   2. Detail with actions       — circular back button + a row of action buttons.
 *   3. Detail without actions    — circular back button only.
 *
 * Detail screens push their actions via `useBottomBarActions()`; this component
 * picks them up automatically. Patterned after rn-driver-app's BottomTabBar.
 */

interface TabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string }>;
  };
  navigation: {
    navigate: (name: string) => void;
    emit: (event: {
      type: string;
      target?: string;
      canPreventDefault: boolean;
    }) => { defaultPrevented: boolean };
  };
}

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface IconConfig {
  active: IconName;
  inactive: IconName;
}

const ICONS: Record<string, IconConfig> = {
  feed: { active: 'home', inactive: 'home-outline' },
  clubs: { active: 'account-group', inactive: 'account-group-outline' },
  profile: { active: 'account', inactive: 'account-outline' },
};

const ROOT_KEYS = new Set(Object.keys(ICONS));

function matchKey(name: string): string | undefined {
  if (ICONS[name]) return name;
  const stripped = name.endsWith('/index') ? name.slice(0, -'/index'.length) : null;
  return stripped && ICONS[stripped] ? stripped : undefined;
}

/**
 * Routes that own their own bottom-anchored UI (e.g. a sticky comment
 * composer) and don't want our bar layered on top.
 */
const OPT_OUT_ROUTES = new Set<string>(['activity/[id]']);

export default function CustomTabBar({ state, navigation }: TabBarProps) {
  const activeRoute = state.routes[state.index];
  const activeName = activeRoute?.name ?? '';
  const isOnRoot = !!matchKey(activeName);
  const { actions } = useBottomBarActions();

  if (OPT_OUT_ROUTES.has(activeName)) return null;
  if (isOnRoot) {
    return <RootBar state={state} navigation={navigation} />;
  }
  return <DetailBar actions={actions} />;
}

// ── Root bar (tab pill + agent) ────────────────────────────────────────

function RootBar({ state, navigation }: TabBarProps) {
  const visibleRoutes = state.routes.filter((r) => matchKey(r.name));

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.pill}>
        {visibleRoutes.map((route) => {
          const isFocused = state.routes[state.index]?.key === route.key;
          const matchedKey = matchKey(route.name);
          const config = matchedKey ? ICONS[matchedKey] : undefined;
          if (!config) return null;

          return (
            <Pressable
              key={route.key}
              style={({ pressed }) => [styles.tabItem, pressed && styles.itemPressed]}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={route.name}
              accessibilityState={isFocused ? { selected: true } : {}}
              hitSlop={4}
            >
              <MaterialCommunityIcons
                name={isFocused ? config.active : config.inactive}
                size={24}
                color={isFocused ? '#fff' : 'rgba(255,255,255,0.45)'}
              />
            </Pressable>
          );
        })}
      </View>
      <AgentPill />
    </View>
  );
}

// ── Detail bar (back + actions) ────────────────────────────────────────

function DetailBar({ actions }: { actions: BottomBarAction[] }) {
  const goBack = () => router.back();

  if (actions.length === 0) {
    // Back-only: small left-aligned circular button. The screen's own header
    // typically also has a back affordance, so we keep this minimal.
    return (
      <View style={[styles.container, { justifyContent: 'flex-start', paddingLeft: 24 }]} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [styles.backCircle, pressed && styles.itemPressed]}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }} />
        <AgentPill />
      </View>
    );
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.actionPill}>
        <Pressable
          style={({ pressed }) => [styles.tabItem, pressed && styles.itemPressed]}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={4}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </Pressable>
        {actions.map((action, idx) => (
          <ActionButton key={`${action.label}-${idx}`} action={action} />
        ))}
      </View>
      <AgentPill />
    </View>
  );
}

function ActionButton({ action }: { action: BottomBarAction }) {
  const isOutlined = action.variant === 'outlined';
  const isError = action.color === 'error';
  const accent = isError ? '#FF6B6B' : '#fff';
  const disabled = action.disabled || action.loading;

  return (
    <Pressable
      onPress={action.onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: isOutlined ? 'transparent' : accent,
          borderWidth: isOutlined ? 1 : 0,
          borderColor: isOutlined ? accent : undefined,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {action.loading ? (
        <ActivityIndicator color={isOutlined ? accent : '#0F0F0F'} size="small" />
      ) : (
        <Text
          style={[
            styles.actionLabel,
            { color: isOutlined ? accent : '#0F0F0F' },
          ]}
        >
          {action.label}
        </Text>
      )}
    </Pressable>
  );
}

// ── Agent pill (always shown on the right) ─────────────────────────────

function AgentPill() {
  return (
    <Pressable
      style={({ pressed }) => [styles.agentPill, pressed && styles.itemPressed]}
      onPress={() => router.push('/(tabs)/ai')}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel="Open AI coach"
    >
      <MaterialCommunityIcons name="creation" size={22} color="#fff" />
    </Pressable>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

export { ROOT_KEYS };

const PILL_HEIGHT = 52;
const PILL_RADIUS = PILL_HEIGHT / 2;
const PILL_BOTTOM = 28;
const ITEM_WIDTH = 48;
const SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  android: { elevation: 10 },
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: PILL_BOTTOM,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: 'rgba(28,28,30,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 4,
    ...SHADOW,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: 'rgba(28,28,30,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 4,
    gap: 6,
    ...SHADOW,
  },
  tabItem: {
    width: ITEM_WIDTH,
    height: PILL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPressed: { opacity: 0.6 },
  actionButton: {
    flex: 1,
    height: PILL_HEIGHT - 8,
    paddingHorizontal: 16,
    borderRadius: (PILL_HEIGHT - 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 14, fontWeight: '600' },
  backCircle: {
    width: PILL_HEIGHT,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: 'rgba(28,28,30,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  agentPill: {
    width: PILL_HEIGHT,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28,28,30,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOW,
  },
});
