import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Plus, Users, Globe, Lock } from 'lucide-react-native';
import { router } from 'expo-router';
import { useMyClubs } from '@/api/hooks';
import type { components } from '@/api/schema';

type Club = components['schemas']['Club'];

export default function ClubsScreen() {
  const { data, isLoading, isFetching, refetch, isError } = useMyClubs();
  const clubs = data?.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Clubs</Text>
          <Text style={styles.subtitle}>
            {clubs.length === 0
              ? 'Join or start your first club'
              : `${clubs.length} club${clubs.length === 1 ? '' : 's'}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/(tabs)/clubs/new')}
        >
          <Plus size={20} color="#0F0F0F" />
        </TouchableOpacity>
      </View>

      {isLoading && clubs.length === 0 ? (
        <ActivityIndicator color="#00A3E0" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ClubRow club={item} onPress={() => router.push(`/(tabs)/clubs/${item.id}`)} />
          )}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No clubs yet</Text>
                <Text style={styles.emptyBody}>
                  Tap + to create one, or head to Discover to find a public club to join.
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor="#00A3E0"
            />
          }
        />
      )}

      {isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Failed to load clubs</Text>
        </View>
      ) : null}
    </View>
  );
}

function ClubRow({ club, onPress }: { club: Club; onPress: () => void }) {
  const Icon = club.privacy_level === 'public' ? Globe : Lock;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.rowIcon}>
        <Users size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{club.name}</Text>
        <View style={styles.rowMeta}>
          <Icon size={11} color="rgba(255,255,255,0.5)" />
          <Text style={styles.rowMetaText}>{club.privacy_level}</Text>
          {club.viewer_role ? (
            <>
              <Text style={styles.rowMetaText}>·</Text>
              <Text style={styles.rowMetaText}>{club.viewer_role}</Text>
            </>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 140 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00A3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: '#fff', fontWeight: '600', marginBottom: 2 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowMetaText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 8 },
  emptyBody: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },
  errorBanner: { backgroundColor: '#5b1212', paddingHorizontal: 16, paddingVertical: 10 },
  errorText: { color: '#fff', fontSize: 13 },
});
