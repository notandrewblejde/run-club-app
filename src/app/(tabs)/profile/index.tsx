import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import {
  Pencil,
  LogOut,
  Activity as ActivityIcon,
  RefreshCw,
  Sun,
  Moon,
  Smartphone,
  Check,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDisconnectStrava, useMe, useTriggerStravaSync } from '@/api/hooks';
import { formatDuration, formatMiles } from '@/utils/format';
import { useTheme, type AppearancePreference } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

const APPEARANCE_OPTIONS: Array<{
  key: AppearancePreference;
  label: string;
  Icon: typeof Sun;
}> = [
  { key: 'system', label: 'System', Icon: Smartphone },
  { key: 'light', label: 'Light', Icon: Sun },
  { key: 'dark', label: 'Dark', Icon: Moon },
];

export default function ProfileScreen() {
  const { tokens, preference, setPreference } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const logout = useAuthStore((s) => s.logout);
  const meQ = useMe();
  const sync = useTriggerStravaSync();
  const disconnect = useDisconnectStrava();
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  if (meQ.isLoading && !meQ.data) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={tokens.accentBlue} />
      </View>
    );
  }
  const profile = meQ.data;
  if (!profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Could not load profile.</Text>
      </View>
    );
  }

  const handleSync = async () => {
    try {
      await sync.mutateAsync();
      Alert.alert('Sync started', 'Recent activities will appear in your feed shortly.');
    } catch (e: unknown) {
      Alert.alert('Could not start sync', (e as Error)?.message ?? 'Try again later');
    }
  };

  const handleDisconnect = () => {
    Alert.alert('Disconnect Strava?', 'New runs will stop syncing automatically.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: () => disconnect.mutate(),
      },
    ]);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  const currentAppearance = APPEARANCE_OPTIONS.find((o) => o.key === preference);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={meQ.isFetching && !meQ.isLoading}
            onRefresh={meQ.refetch}
            tintColor={tokens.accentBlue}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity
            hitSlop={12}
            onPress={() => router.push('/(tabs)/profile/edit')}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <Pencil size={18} color={tokens.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.identity}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>
                {(profile.name ?? '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{profile.name ?? 'Unnamed runner'}</Text>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          <View style={styles.followsRow}>
            <Counter label="Followers" value={profile.followers_count} styles={styles} />
            <Counter label="Following" value={profile.following_count} styles={styles} />
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <ActivityIcon size={16} color={tokens.accentBlue} />
            <Text style={styles.statsHeaderText}>All-time</Text>
          </View>
          <View style={styles.statsGrid}>
            <Stat label="Activities" value={`${profile.stats.total_activities}`} styles={styles} />
            <Stat label="Distance" value={formatMiles(profile.stats.total_distance_miles)} styles={styles} />
            <Stat label="Time" value={formatDuration(profile.stats.total_moving_seconds)} styles={styles} />
          </View>
          <View style={[styles.statsHeader, { marginTop: 12 }]}>
            <ActivityIcon size={16} color={tokens.accentOrange} />
            <Text style={styles.statsHeaderText}>Last 30 days</Text>
          </View>
          <View style={styles.statsGrid}>
            <Stat label="Activities" value={`${profile.stats.activities_30d}`} styles={styles} />
            <Stat label="Distance" value={formatMiles(profile.stats.distance_miles_30d)} styles={styles} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setAppearanceOpen(true)}
            activeOpacity={0.7}
          >
            {currentAppearance ? (
              <currentAppearance.Icon size={16} color={tokens.text} />
            ) : null}
            <Text style={[styles.rowText, { marginLeft: 10 }]}>
              {currentAppearance?.label ?? 'System'}
            </Text>
            <Text style={styles.rowMuted}>Tap to change</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Strava</Text>
          {profile.strava_connected ? (
            <>
              <View style={[styles.row, { backgroundColor: tokens.surfaceElevated }]}>
                <Text style={styles.rowText}>Connected</Text>
                <Text style={styles.rowMuted}>Auto-syncing</Text>
              </View>
              <TouchableOpacity style={styles.row} onPress={handleSync} disabled={sync.isPending}>
                <RefreshCw size={16} color={tokens.accentBlue} />
                <Text style={[styles.rowText, { color: tokens.accentBlue, marginLeft: 8 }]}>
                  {sync.isPending ? 'Syncing…' : 'Re-sync recent runs'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.row} onPress={handleDisconnect}>
                <Text style={[styles.rowText, { color: tokens.error }]}>Disconnect Strava</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.row, { backgroundColor: tokens.stravaOrange }]}
              onPress={() => router.push('/(tabs)/strava-connect')}
            >
              <Text style={[styles.rowText, { color: '#fff' }]}>Connect Strava</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.logout} onPress={handleLogout}>
          <LogOut size={16} color={tokens.textSecondary} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>

      <AppearanceSheet
        visible={appearanceOpen}
        current={preference}
        onPick={(p) => {
          setPreference(p);
          setAppearanceOpen(false);
        }}
        onDismiss={() => setAppearanceOpen(false)}
        tokens={tokens}
        styles={styles}
      />
    </>
  );
}

function AppearanceSheet({
  visible,
  current,
  onPick,
  onDismiss,
  tokens,
  styles,
}: {
  visible: boolean;
  current: AppearancePreference;
  onPick: (p: AppearancePreference) => void;
  onDismiss: () => void;
  tokens: ThemeTokens;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.sheetTitle}>Appearance</Text>
          {APPEARANCE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={styles.sheetRow}
              onPress={() => onPick(opt.key)}
              activeOpacity={0.7}
            >
              <opt.Icon size={18} color={tokens.text} />
              <Text style={styles.sheetLabel}>{opt.label}</Text>
              {current === opt.key ? (
                <Check size={18} color={tokens.accentBlue} />
              ) : (
                <View style={{ width: 18 }} />
              )}
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Counter({
  label,
  value,
  styles,
}: {
  label: string;
  value: number | string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.counter}>
      <Text style={styles.counterValue}>{value}</Text>
      <Text style={styles.counterLabel}>{label}</Text>
    </View>
  );
}

function Stat({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingBottom: 140 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 12,
    },
    title: { color: t.text, fontSize: 28, fontWeight: '700' },
    identity: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
    avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 12 },
    avatarFallback: {
      backgroundColor: t.accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
    name: { color: t.text, fontSize: 20, fontWeight: '700' },
    bio: { color: t.textSecondary, fontSize: 13, marginTop: 4 },
    followsRow: { flexDirection: 'row', gap: 28, marginTop: 16 },
    counter: { alignItems: 'center' },
    counterValue: { color: t.text, fontSize: 18, fontWeight: '700' },
    counterLabel: { color: t.textMuted, fontSize: 12 },
    statsCard: {
      backgroundColor: t.surface,
      marginHorizontal: 20,
      borderRadius: 12,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    statsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    statsHeaderText: { color: t.textSecondary, fontSize: 13, fontWeight: '600' },
    statsGrid: { flexDirection: 'row' },
    statBlock: { flex: 1 },
    statLabel: { color: t.textMuted, fontSize: 11, textTransform: 'uppercase' },
    statValue: { color: t.text, fontSize: 16, fontWeight: '600', marginTop: 2 },
    section: { marginTop: 24, paddingHorizontal: 20, gap: 8 },
    sectionTitle: { color: t.text, fontWeight: '600', fontSize: 15, marginBottom: 4 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: t.surfaceElevated,
    },
    rowText: { color: t.text, fontSize: 14, flex: 1 },
    rowMuted: { color: t.textMuted, fontSize: 12 },
    logout: {
      marginTop: 32,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
    },
    logoutText: { color: t.textSecondary, fontSize: 14 },
    errorText: { color: t.textSecondary },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    modalSheet: {
      backgroundColor: t.surfaceSheet,
      borderRadius: 14,
      paddingVertical: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    sheetTitle: {
      color: t.textMuted,
      fontSize: 12,
      textTransform: 'uppercase',
      paddingHorizontal: 16,
      paddingVertical: 10,
      letterSpacing: 0.5,
    },
    sheetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sheetLabel: { color: t.text, fontSize: 15, flex: 1 },
  });
}
