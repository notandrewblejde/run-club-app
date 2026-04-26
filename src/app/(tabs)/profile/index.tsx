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
  Users,
  Trophy,
  ChevronRight,
  ChevronDown,
  HeartPulse,
  Watch,
  Footprints,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  useDisconnectStrava,
  useFollowRequests,
  useMe,
  useTriggerStravaSync,
} from '@/api/hooks';
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
  const requestsQ = useFollowRequests();
  const pendingCount = requestsQ.data?.data?.length ?? 0;
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

  const showIntegrationSoon = (name: string) => {
    Alert.alert(
      `${name} (coming soon)`,
      'This source is not wired up yet. When it is, you will connect it here the same way as Strava.',
    );
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
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/(tabs)/profile/edit')}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <Pencil size={18} color={tokens.text} />
            </TouchableOpacity>
          </View>
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
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/users/${profile.id}/followers`)}
              hitSlop={6}
            >
              <Counter label="Followers" value={profile.followers_count} styles={styles} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/users/${profile.id}/following`)}
              hitSlop={6}
            >
              <Counter label="Following" value={profile.following_count} styles={styles} />
            </TouchableOpacity>
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
            <Stat label="Time" value={formatDuration(profile.stats.moving_seconds_30d)} styles={styles} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/(tabs)/profile/requests')}
            activeOpacity={0.7}
          >
            <Users size={16} color={tokens.text} />
            <Text style={[styles.rowText, { marginLeft: 10 }]}>Follow requests</Text>
            {pendingCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            ) : null}
            <ChevronRight size={16} color={tokens.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/(tabs)/challenges')}
            activeOpacity={0.7}
          >
            <Trophy size={16} color={tokens.accentYellow} />
            <Text style={[styles.rowText, { marginLeft: 10 }]}>Challenges</Text>
            <ChevronRight size={16} color={tokens.textMuted} />
          </TouchableOpacity>
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
            <ChevronDown size={16} color={tokens.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connected apps</Text>
          {profile.strava_connected ? (
            <>
              <View style={[styles.row, { backgroundColor: tokens.surfaceElevated }]}>
                <Text style={styles.rowText}>Strava</Text>
                <Text style={styles.rowMuted}>Connected · auto-sync</Text>
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
              activeOpacity={0.7}
            >
              <Text style={[styles.rowText, { color: '#fff' }]}>Connect Strava</Text>
              <ChevronRight size={16} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.row}
            onPress={() => showIntegrationSoon('Apple Health')}
            activeOpacity={0.7}
          >
            <HeartPulse size={16} color={tokens.text} />
            <Text style={[styles.rowText, { marginLeft: 10 }]}>Apple Health</Text>
            <Text style={[styles.rowMuted, { marginRight: 6 }]}>Coming soon</Text>
            <ChevronRight size={16} color={tokens.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.row}
            onPress={() => showIntegrationSoon('Google Fit')}
            activeOpacity={0.7}
          >
            <Footprints size={16} color={tokens.text} />
            <Text style={[styles.rowText, { marginLeft: 10 }]}>Google Fit</Text>
            <Text style={[styles.rowMuted, { marginRight: 6 }]}>Coming soon</Text>
            <ChevronRight size={16} color={tokens.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.row}
            onPress={() => showIntegrationSoon('Garmin Connect')}
            activeOpacity={0.7}
          >
            <Watch size={16} color={tokens.text} />
            <Text style={[styles.rowText, { marginLeft: 10 }]}>Garmin Connect</Text>
            <Text style={[styles.rowMuted, { marginRight: 6 }]}>Coming soon</Text>
            <ChevronRight size={16} color={tokens.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Log out"
          >
            <LogOut size={16} color={tokens.error} />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
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
    headerActions: { flexDirection: 'row', gap: 8 },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
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
    badge: {
      backgroundColor: t.accentOrange,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      minWidth: 22,
      alignItems: 'center',
      marginRight: 8,
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    logoutSection: { marginTop: 32, paddingHorizontal: 20 },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.error,
      backgroundColor: 'transparent',
    },
    logoutText: { color: t.error, fontSize: 14, fontWeight: '600' },
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
