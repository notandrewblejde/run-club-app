import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  useAcceptFollowRequest,
  useFollowRequests,
  useRejectFollowRequest,
} from '@/api/hooks';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

export default function FollowRequestsScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const reqQ = useFollowRequests();
  const accept = useAcceptFollowRequest();
  const reject = useRejectFollowRequest();
  const requests = reqQ.data?.data ?? [];

  const handleAccept = async (id: string) => {
    try {
      await accept.mutateAsync(id);
    } catch (e: unknown) {
      Alert.alert('Could not accept', (e as Error)?.message ?? 'Try again later');
    }
  };
  const handleReject = async (id: string) => {
    try {
      await reject.mutateAsync(id);
    } catch (e: unknown) {
      Alert.alert('Could not decline', (e as Error)?.message ?? 'Try again later');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Follow requests</Text>
      </View>

      {reqQ.isLoading ? (
        <ActivityIndicator color={tokens.accentBlue} style={{ marginTop: 40 }} />
      ) : requests.length === 0 ? (
        <Text style={styles.empty}>No pending requests.</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.identity}
                activeOpacity={0.85}
                onPress={() => item.requester?.id && router.push(`/(tabs)/users/${item.requester.id}`)}
              >
                {item.requester?.avatar_url ? (
                  <Image source={{ uri: item.requester.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarText}>
                      {(item.requester?.name ?? '?').slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.name}>{item.requester?.name ?? 'Unnamed'}</Text>
              </TouchableOpacity>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.acceptBtn]}
                  onPress={() => handleAccept(item.id)}
                  disabled={accept.isPending}
                >
                  <Text style={[styles.actionLabel, { color: tokens.onPrimary }]}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleReject(item.id)}
                  disabled={reject.isPending}
                >
                  <Text style={[styles.actionLabel, { color: tokens.text }]}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    title: { color: t.text, fontWeight: '700', fontSize: 22 },
    empty: { color: t.textMuted, paddingHorizontal: 20, marginTop: 24 },
    list: { paddingHorizontal: 16, paddingBottom: 140 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
      gap: 12,
    },
    identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 36, height: 36, borderRadius: 18 },
    avatarFallback: {
      backgroundColor: t.accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontWeight: '700' },
    name: { color: t.text, fontWeight: '600' },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
    acceptBtn: { backgroundColor: t.primary },
    rejectBtn: {
      backgroundColor: t.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    actionLabel: { fontSize: 13, fontWeight: '600' },
  });
}
