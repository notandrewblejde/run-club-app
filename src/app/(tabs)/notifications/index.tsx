import { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { openActivityNotificationTarget } from '@/navigation/notificationDeepLink';
import { ArrowLeft } from 'lucide-react-native';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/api/hooks';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';
import type { components } from '@/api/schema';

type Notification = components['schemas']['Notification'];

function parseNotificationPayload(payload: string | null | undefined): {
  activityId: string;
  commentId?: string;
} | null {
  if (!payload?.trim()) return null;
  try {
    const o = JSON.parse(payload) as { activityId?: string; commentId?: string };
    const activityId = o.activityId && typeof o.activityId === 'string' ? o.activityId : null;
    if (!activityId) return null;
    const commentId = o.commentId && typeof o.commentId === 'string' ? o.commentId : undefined;
    return { activityId, commentId };
  } catch {
    return null;
  }
}

export default function NotificationsScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const listQ = useNotifications({ limit: 50 });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const rows = listQ.data?.data ?? [];

  const onRefresh = useCallback(async () => {
    await listQ.refetch();
  }, [listQ]);

  const openRow = async (item: Notification) => {
    try {
      if (!item.read_at) {
        await markRead.mutateAsync(item.id);
      }
    } catch {
      // still navigate
    }
    const parsed = parseNotificationPayload(item.payload_json);
    if (parsed) {
      openActivityNotificationTarget(parsed.activityId, { commentId: parsed.commentId });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <ArrowLeft size={22} color={tokens.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity
          onPress={() => void markAll.mutateAsync()}
          disabled={markAll.isPending}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Mark all read"
        >
          <Text style={[styles.markAll, markAll.isPending && { opacity: 0.5 }]}>Read all</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={listQ.isFetching && !listQ.isLoading}
            onRefresh={() => void onRefresh()}
            tintColor={tokens.accentBlue}
          />
        }
        ListEmptyComponent={
          listQ.isLoading ? (
            <ActivityIndicator color={tokens.accentBlue} style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.empty}>
              No notifications yet. They appear for new Strava syncs, comments on your activities, and more.
            </Text>
          )
        }
        renderItem={({ item }) => {
          const unread = !item.read_at;
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
              onPress={() => void openRow(item)}
            >
              {unread ? <View style={styles.dot} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBody} numberOfLines={4}>
                  {item.body}
                </Text>
                <Text style={styles.cardMeta}>
                  {parseNotificationPayload(item.payload_json) ? 'Tap to open · ' : ''}
                  {item.created_at}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    title: { color: t.text, fontWeight: '700', fontSize: 18, flex: 1, textAlign: 'center' },
    markAll: { color: t.accentBlue, fontWeight: '600', fontSize: 14 },
    listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
    empty: { color: t.textMuted, fontSize: 14, marginTop: 24, textAlign: 'center', lineHeight: 20 },
    card: {
      flexDirection: 'row',
      gap: 10,
      padding: 14,
      borderRadius: 14,
      backgroundColor: t.surfaceElevated,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.accentBlue,
      marginTop: 6,
    },
    cardTitle: { color: t.text, fontWeight: '700', fontSize: 15 },
    cardBody: { color: t.textSecondary, fontSize: 14, marginTop: 6, lineHeight: 20 },
    cardMeta: { color: t.textMuted, fontSize: 11, marginTop: 8 },
  });
}
