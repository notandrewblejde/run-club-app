import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pencil, Plus } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { router } from 'expo-router';
import { useBottomBarActions, type BottomBarAction } from './BottomBarActionsContext';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

interface NavState {
  index: number;
  routes: Array<{ key: string; name: string; state?: NavState }>;
}

interface TabBarProps {
  state: NavState;
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

// Visual order of tabs in the bottom pill. expo-router auto-discovers tab
// folders alphabetically, so without this they'd render clubs → feed → profile.
const TAB_ORDER: readonly string[] = ['feed', 'clubs', 'profile'];

function matchKey(name: string): string | undefined {
  if (ICONS[name]) return name;
  const stripped = name.endsWith('/index') ? name.slice(0, -'/index'.length) : null;
  return stripped && ICONS[stripped] ? stripped : undefined;
}

// Top-level route names where we hide the bottom bar entirely (e.g. activity
// detail screens, which want a chrome-free reading experience). After the
// structural Stack-per-tab refactor the active tab is just "activity" — the
// inner stack screen "[id]" is one level deeper.
const OPT_OUT_ROUTES = new Set<string>(['activity']);

export default function CustomTabBar({ state, navigation }: TabBarProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const activeRoute = state.routes[state.index];
  const activeName = activeRoute?.name ?? '';
  const tabKey = matchKey(activeName);
  // If the active tab has a nested navigator (Stack), it's only "at the root"
  // when its own nested index is 0 — otherwise we're on a pushed detail screen
  // inside the tab and want the DetailBar.
  const nested = activeRoute?.state;
  const onTabRoot = !nested || nested.index === 0;
  const isOnRoot = !!tabKey && onTabRoot;
  // The OPT_OUT name may live inside a nested stack (e.g. activity/[id] when
  // pushed from feed in the future), so check both levels.
  const innerActiveName =
    nested && nested.routes[nested.index]?.name ? nested.routes[nested.index].name : '';
  const { actions } = useBottomBarActions();

  if (OPT_OUT_ROUTES.has(activeName) || OPT_OUT_ROUTES.has(innerActiveName)) return null;
  if (isOnRoot) {
    return <RootBar state={state} navigation={navigation} styles={styles} tokens={tokens} />;
  }
  return <DetailBar actions={actions} styles={styles} tokens={tokens} />;
}

function RootBar({
  state,
  navigation,
  styles,
  tokens,
}: TabBarProps & { styles: Styles; tokens: ThemeTokens }) {
  const visibleRoutes = state.routes
    .filter((r) => matchKey(r.name))
    .slice()
    .sort((a, b) => {
      const ai = TAB_ORDER.indexOf(matchKey(a.name)!);
      const bi = TAB_ORDER.indexOf(matchKey(b.name)!);
      return ai - bi;
    });

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
                color={isFocused ? tokens.navIconActive : tokens.navIconInactive}
              />
            </Pressable>
          );
        })}
      </View>
      <AgentPill styles={styles} tokens={tokens} />
    </View>
  );
}

function DetailBar({
  actions,
  styles,
  tokens,
}: {
  actions: BottomBarAction[];
  styles: Styles;
  tokens: ThemeTokens;
}) {
  // Some detail screens (discover, challenges, ai, activity/[id], users/[id]) are
  // flat top-level hidden tabs rather than being nested in a Stack. Reaching
  // them via `router.push` switches tabs instead of pushing — so `router.back()`
  // has no history to pop and React Navigation throws "GO_BACK was not handled".
  // Falling through to Home keeps the user unstuck.
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/feed');
    }
  };

  if (actions.length === 0) {
    return (
      <View
        style={[styles.container, { justifyContent: 'flex-start', paddingLeft: 24 }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={({ pressed }) => [styles.backCircle, pressed && styles.itemPressed]}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={tokens.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <AgentPill styles={styles} tokens={tokens} />
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
          <MaterialCommunityIcons name="arrow-left" size={22} color={tokens.text} />
        </Pressable>
        {actions.map((action, idx) => (
          <ActionButton key={`${action.label}-${idx}`} action={action} tokens={tokens} />
        ))}
      </View>
      <AgentPill styles={styles} tokens={tokens} />
    </View>
  );
}

function ActionButton({ action, tokens }: { action: BottomBarAction; tokens: ThemeTokens }) {
  const isOutlined = action.variant === 'outlined';
  const isError = action.color === 'error';
  const accent = isError ? tokens.error : tokens.primary;
  const textOnFill = isError ? '#ffffff' : tokens.onPrimary;
  const disabled = action.disabled || action.loading;
  const fg = isOutlined ? accent : textOnFill;

  const inner =
    action.loading ? (
      <ActivityIndicator color={fg} size="small" />
    ) : action.icon === 'pencil' ? (
      <Pencil size={20} color={fg} strokeWidth={2} />
    ) : action.icon === 'plus' ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Plus size={18} color={fg} strokeWidth={2.2} />
        <Text style={{ color: fg, fontSize: 14, fontWeight: '600' }}>Post</Text>
      </View>
    ) : (
      <Text style={{ color: fg, fontSize: 14, fontWeight: '600' }}>{action.label}</Text>
    );

  return (
    <Pressable
      onPress={action.onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      style={({ pressed }) => [
        actionButtonStyle,
        {
          backgroundColor: isOutlined ? 'transparent' : accent,
          borderWidth: isOutlined ? 1 : 0,
          borderColor: isOutlined ? accent : undefined,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
          minWidth: action.icon === 'pencil' ? 52 : undefined,
        },
      ]}
    >
      {inner}
    </Pressable>
  );
}

function AgentPill({ styles, tokens }: { styles: Styles; tokens: ThemeTokens }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.agentPill, pressed && styles.itemPressed]}
      onPress={() => router.push('/(tabs)/ai')}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel="Open AI coach"
    >
      <MaterialCommunityIcons name="creation" size={22} color={tokens.text} />
    </Pressable>
  );
}

const PILL_HEIGHT = 52;
const PILL_RADIUS = PILL_HEIGHT / 2;
const PILL_BOTTOM = 28;
const ITEM_WIDTH = 48;

const actionButtonStyle = {
  flex: 1,
  height: PILL_HEIGHT - 8,
  paddingHorizontal: 16,
  borderRadius: (PILL_HEIGHT - 8) / 2,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(t: ThemeTokens) {
  const shadow = Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: t.mode === 'dark' ? 0.4 : 0.15,
      shadowRadius: 16,
    },
    android: { elevation: 10 },
  });
  return StyleSheet.create({
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
      backgroundColor: t.navPill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.navPillBorder,
      paddingHorizontal: 4,
      ...shadow,
    },
    actionPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      height: PILL_HEIGHT,
      borderRadius: PILL_RADIUS,
      backgroundColor: t.navPill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.navPillBorder,
      paddingHorizontal: 4,
      gap: 6,
      ...shadow,
    },
    tabItem: {
      width: ITEM_WIDTH,
      height: PILL_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemPressed: { opacity: 0.6 },
    backCircle: {
      width: PILL_HEIGHT,
      height: PILL_HEIGHT,
      borderRadius: PILL_RADIUS,
      backgroundColor: t.navPill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.navPillBorder,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow,
    },
    agentPill: {
      width: PILL_HEIGHT,
      height: PILL_HEIGHT,
      borderRadius: PILL_RADIUS,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.navPill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.navPillBorder,
      ...shadow,
    },
  });
}
