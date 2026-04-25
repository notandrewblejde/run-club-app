import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useActivityStore } from '@/stores/useActivityStore';
import { ActivityCard } from '@/components/activity/ActivityCard';
import { Activity } from '@/types';
import { router } from 'expo-router';

export default function FeedScreen() {
  const activities = useActivityStore((state) => state.activities);
  const loading = useActivityStore((state) => state.loading);
  const error = useActivityStore((state) => state.error);
  const hasMore = useActivityStore((state) => state.hasMore);
  const fetchActivities = useActivityStore((state) => state.fetchActivities);
  const refreshActivities = useActivityStore((state) => state.refreshActivities);

  useEffect(() => {
    fetchActivities(0);
  }, []);

  const handleEndReached = () => {
    if (hasMore && !loading) {
      fetchActivities();
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No runs yet</Text>
      <Text style={styles.emptySubtitle}>Connect Strava to sync your activities</Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading || activities.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#00A3E0" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity Feed</Text>
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
            refreshing={loading && activities.length > 0}
            onRefresh={refreshActivities}
            tintColor="#00A3E0"
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        scrollEnabled={true}
      />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: '#8B0000',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
  },
});
