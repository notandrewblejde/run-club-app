import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronDown, Check } from 'lucide-react-native';
import { useFeed } from '@/api/hooks';
import { ActivityCard } from '@/components/activity/ActivityCard';

type Scope = 'me' | 'following';

const SCOPE_LABEL: Record<Scope, string> = {
  me: 'My runs',
  following: 'Following',
};

export default function FeedScreen() {
  const [scope, setScope] = useState<Scope>('me');
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data, isLoading, isFetching, isError, refetch } = useFeed(scope);
  const activities = data?.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.titleRow, pressed && { opacity: 0.7 }]}
          onPress={() => setPickerOpen(true)}
          hitSlop={8}
        >
          <Text style={styles.title}>{SCOPE_LABEL[scope]}</Text>
          <ChevronDown size={22} color="rgba(255,255,255,0.5)" strokeWidth={2.2} />
        </Pressable>
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

      <ScopePicker
        visible={pickerOpen}
        scope={scope}
        onPick={(s) => {
          setScope(s);
          setPickerOpen(false);
        }}
        onDismiss={() => setPickerOpen(false)}
      />
    </View>
  );
}

function ScopePicker({
  visible,
  scope,
  onPick,
  onDismiss,
}: {
  visible: boolean;
  scope: Scope;
  onPick: (scope: Scope) => void;
  onDismiss: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {(['me', 'following'] as Scope[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={styles.sheetRow}
              onPress={() => onPick(s)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetLabel}>{SCOPE_LABEL[s]}</Text>
              {scope === s ? <Check size={18} color="#fff" /> : null}
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
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

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: 90,
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    minWidth: 200,
    alignSelf: 'flex-start',
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sheetLabel: { color: '#fff', fontSize: 15 },
});
