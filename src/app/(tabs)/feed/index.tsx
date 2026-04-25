import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useFeed } from '@/api/hooks';
import { ActivityCard } from '@/components/activity/ActivityCard';

type Scope = 'me' | 'following';

export default function FeedScreen() {
  const [scope, setScope] = useState<Scope>('me');
  const { data, isLoading, isFetching, isError, refetch } = useFeed(scope);
  const activities = data?.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <View style={styles.tabRow}>
          <ScopeTab label="My runs" active={scope === 'me'} onPress={() => setScope('me')} />
          <ScopeTab
            label="Following"
            active={scope === 'following'}
            onPress={() => setScope('following')}
          />
        </View>
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ActivityCard
            activity={item}
            onPress={() => router.push(`/(tabs)/activity/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor="#00A3E0"
          />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {scope === 'following' ? 'Quiet feed' : 'No runs yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {scope === 'following'
                  ? 'Follow other runners and their activity will show up here.'
                  : 'Connect Strava to sync your activities.'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoading && activities.length === 0 ? (
            <ActivityIndicator color="#00A3E0" style={{ marginTop: 40 }} />
          ) : null
        }
      />

      {isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Couldn't load activities. Pull to retry.</Text>
        </View>
      ) : null}
    </View>
  );
}

function ScopeTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.scopeTab, active && styles.scopeTabActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.scopeTabText, active && styles.scopeTabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 12 },
  tabRow: { flexDirection: 'row', gap: 8 },
  scopeTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#161618',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  scopeTabActive: { backgroundColor: '#fff' },
  scopeTabText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
  scopeTabTextActive: { color: '#0F0F0F', fontWeight: '600' },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 140 },
  emptyContainer: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 8 },
  emptySubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },
  errorBanner: { backgroundColor: '#5b1212', paddingHorizontal: 16, paddingVertical: 10 },
  errorText: { color: '#fff', fontSize: 13 },
});
