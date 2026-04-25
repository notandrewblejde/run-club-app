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
} from 'react-native';
import { router } from 'expo-router';
import {
  Settings,
  LogOut,
  Activity as ActivityIcon,
  RefreshCw,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDisconnectStrava, useMe, useTriggerStravaSync } from '@/api/hooks';
import { formatDuration, formatMiles } from '@/utils/format';

export default function ProfileScreen() {
  const logout = useAuthStore((s) => s.logout);
  const meQ = useMe();
  const sync = useTriggerStravaSync();
  const disconnect = useDisconnectStrava();

  if (meQ.isLoading && !meQ.data) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#00A3E0" />
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
        onPress: () => {
          disconnect.mutate();
        },
      },
    ]);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={meQ.isFetching && !meQ.isLoading}
          onRefresh={meQ.refetch}
          tintColor="#00A3E0"
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity hitSlop={12}>
          <Settings size={20} color="rgba(255,255,255,0.7)" />
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
          <Counter label="Followers" value={profile.followers_count} />
          <Counter label="Following" value={profile.following_count} />
        </View>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <ActivityIcon size={16} color="#00A3E0" />
          <Text style={styles.statsHeaderText}>All-time</Text>
        </View>
        <View style={styles.statsGrid}>
          <Stat label="Activities" value={`${profile.stats.total_activities}`} />
          <Stat label="Distance" value={formatMiles(profile.stats.total_distance_miles)} />
          <Stat label="Time" value={formatDuration(profile.stats.total_moving_seconds)} />
        </View>
        <View style={[styles.statsHeader, { marginTop: 12 }]}>
          <ActivityIcon size={16} color="#FF6B35" />
          <Text style={styles.statsHeaderText}>Last 30 days</Text>
        </View>
        <View style={styles.statsGrid}>
          <Stat label="Activities" value={`${profile.stats.activities_30d}`} />
          <Stat label="Distance" value={formatMiles(profile.stats.distance_miles_30d)} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Strava</Text>
        {profile.strava_connected ? (
          <>
            <View style={[styles.row, { backgroundColor: '#161618' }]}>
              <Text style={styles.rowText}>Connected</Text>
              <Text style={styles.rowMuted}>Auto-syncing</Text>
            </View>
            <TouchableOpacity style={styles.row} onPress={handleSync} disabled={sync.isPending}>
              <RefreshCw size={16} color="#00A3E0" />
              <Text style={[styles.rowText, { color: '#00A3E0', marginLeft: 8 }]}>
                {sync.isPending ? 'Syncing…' : 'Re-sync recent runs'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={handleDisconnect}>
              <Text style={[styles.rowText, { color: '#ff7070' }]}>Disconnect Strava</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.row, { backgroundColor: '#FC4C02' }]}
            onPress={() => router.push('/auth/strava-connect')}
          >
            <Text style={[styles.rowText, { color: '#fff' }]}>Connect Strava</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.logout} onPress={handleLogout}>
        <LogOut size={16} color="rgba(255,255,255,0.6)" />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Counter({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.counter}>
      <Text style={styles.counterValue}>{value}</Text>
      <Text style={styles.counterLabel}>{label}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
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
  title: { color: '#fff', fontSize: 28, fontWeight: '700' },
  identity: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 12 },
  avatarFallback: {
    backgroundColor: '#00A3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#0F0F0F', fontSize: 32, fontWeight: '700' },
  name: { color: '#fff', fontSize: 20, fontWeight: '700' },
  bio: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  followsRow: { flexDirection: 'row', gap: 28, marginTop: 16 },
  counter: { alignItems: 'center' },
  counterValue: { color: '#fff', fontSize: 18, fontWeight: '700' },
  counterLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  statsCard: {
    backgroundColor: '#111',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statsHeaderText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  statsGrid: { flexDirection: 'row' },
  statBlock: { flex: 1 },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase' },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 2 },
  section: { marginTop: 24, paddingHorizontal: 20, gap: 8 },
  sectionTitle: { color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#161618',
  },
  rowText: { color: '#fff', fontSize: 14, flex: 1 },
  rowMuted: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  logout: {
    marginTop: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  logoutText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  errorText: { color: 'rgba(255,255,255,0.7)' },
});
