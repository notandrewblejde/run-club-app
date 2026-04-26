import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  useAcceptFollowRequest,
  useFollowRequests,
  useRejectFollowRequest,
} from '@/api/hooks';
import { UserRow } from '@/components/social/UserRow';
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
          renderItem={({ item }) => {
            const requester = item.requester ?? { id: '', name: 'Unnamed' };
            return (
              <UserRow
                user={requester}
                right={
                  <>
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
                  </>
                }
              />
            );
          }}
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
