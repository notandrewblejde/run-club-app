import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Heart, MessageCircle, Send, Trash2, Award } from 'lucide-react-native';
import {
  useActivity,
  useAddComment,
  useComments,
  useDeleteComment,
  useToggleKudo,
} from '@/api/hooks';
import { generateStaticMapUrl } from '@/utils/mapbox';
import {
  formatDateFromUnix,
  formatDuration,
  formatElevation,
  formatMiles,
  formatPace,
} from '@/utils/format';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const activityQ = useActivity(id);
  const commentsQ = useComments(id);
  const toggleKudo = useToggleKudo(id ?? '');
  const addComment = useAddComment(id ?? '');
  const deleteComment = useDeleteComment(id ?? '');

  const [draft, setDraft] = useState('');

  if (!id) return null;
  const activity = activityQ.data;

  if (activityQ.isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#00A3E0" />
      </View>
    );
  }
  if (activityQ.isError || !activity) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>{activityQ.error?.message ?? 'Activity not found'}</Text>
      </View>
    );
  }

  const mapUrl = generateStaticMapUrl(activity.map_polyline, 800, 320);
  const comments = commentsQ.data?.data ?? [];

  const handlePost = async () => {
    if (!draft.trim()) return;
    try {
      await addComment.mutateAsync(draft.trim());
      setDraft('');
    } catch (e: unknown) {
      Alert.alert('Could not post comment', (e as Error)?.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activity.user?.name || 'Run'}
          </Text>
          <View style={{ width: 22 }} />
        </View>

        <Text style={styles.activityName}>{activity.name}</Text>
        <Text style={styles.timestamp}>
          {formatDateFromUnix(activity.start_date)}
          {activity.city ? ` · ${activity.city}` : ''}
          {activity.state ? `, ${activity.state}` : ''}
        </Text>

        {activity.personal_record ? (
          <View style={styles.prBadge}>
            <Award size={14} color="#0F0F0F" />
            <Text style={styles.prText}>Personal record</Text>
          </View>
        ) : null}

        {mapUrl ? (
          <Image source={{ uri: mapUrl }} style={styles.mapImage} resizeMode="cover" />
        ) : (
          <View style={[styles.mapImage, styles.mapPlaceholder]}>
            <Text style={styles.mapPlaceholderText}>No GPS data</Text>
          </View>
        )}

        <View style={styles.statGrid}>
          <Stat label="Distance" value={formatMiles(activity.distance_miles)} />
          <Stat label="Time" value={formatDuration(activity.moving_time_secs)} />
          <Stat
            label="Pace"
            value={activity.avg_pace_display ?? formatPace(activity.avg_pace_secs_per_mile)}
          />
          <Stat label="Elevation" value={formatElevation(activity.elevation_gain_ft)} />
          <Stat
            label="Avg HR"
            value={activity.avg_heart_rate_bpm ? `${activity.avg_heart_rate_bpm} bpm` : '—'}
          />
          <Stat
            label="Max HR"
            value={activity.max_heart_rate_bpm ? `${activity.max_heart_rate_bpm} bpm` : '—'}
          />
        </View>

        {activity.photos && activity.photos.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStrip}
          >
            {activity.photos.map((url) => (
              <Image key={url} source={{ uri: url }} style={styles.photo} />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.engagementRow}>
          <TouchableOpacity
            style={styles.engagementBtn}
            onPress={() => toggleKudo.mutate()}
          >
            <Heart
              size={20}
              color={activity.kudoed_by_viewer ? '#FF6B35' : 'rgba(255,255,255,0.7)'}
              fill={activity.kudoed_by_viewer ? '#FF6B35' : 'transparent'}
            />
            <Text style={styles.engagementCount}>{activity.kudos_count}</Text>
          </TouchableOpacity>
          <View style={styles.engagementBtn}>
            <MessageCircle size={20} color="rgba(255,255,255,0.7)" />
            <Text style={styles.engagementCount}>{activity.comment_count}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Comments</Text>
        {comments.length === 0 && !commentsQ.isLoading ? (
          <Text style={styles.emptyComments}>Be the first to drop a comment.</Text>
        ) : (
          comments.map((c) => (
            <View key={c.id} style={styles.commentRow}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentInitial}>
                  {(c.user?.name ?? '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.commentBody}>
                <Text style={styles.commentName}>{c.user?.name ?? 'Unnamed'}</Text>
                <Text style={styles.commentContent}>{c.content}</Text>
              </View>
              {activity.owned_by_viewer || c.user?.id === activity.user?.id ? (
                <TouchableOpacity
                  onPress={() => deleteComment.mutate(c.id)}
                  hitSlop={8}
                >
                  <Trash2 size={14} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment…"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!draft.trim() || addComment.isPending) && styles.sendBtnDisabled,
          ]}
          onPress={handlePost}
          disabled={!draft.trim() || addComment.isPending}
        >
          <Send size={18} color="#fff" />
        </TouchableOpacity>
      </View>
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
  errorText: { color: 'rgba(255,255,255,0.7)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: { color: '#fff', fontWeight: '600', fontSize: 16 },
  activityName: { color: '#fff', fontSize: 22, fontWeight: '700', paddingHorizontal: 20 },
  timestamp: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  prBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    backgroundColor: '#FFD24A',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    gap: 4,
    marginBottom: 12,
  },
  prText: { color: '#0F0F0F', fontWeight: '700', fontSize: 12 },
  mapImage: {
    height: 220,
    marginHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#000',
    marginBottom: 16,
  },
  mapPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161618',
  },
  mapPlaceholderText: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginBottom: 16 },
  statBlock: { width: '33%', paddingVertical: 8 },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  photoStrip: { paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  photo: { width: 160, height: 120, borderRadius: 8, marginRight: 8, backgroundColor: '#222' },
  engagementRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 24, marginBottom: 24 },
  engagementBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  engagementCount: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  sectionTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  emptyComments: {
    color: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 20,
    fontSize: 13,
    marginBottom: 24,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00A3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentInitial: { color: '#0F0F0F', fontWeight: '700' },
  commentBody: { flex: 1 },
  commentName: { color: '#fff', fontWeight: '600', fontSize: 13 },
  commentContent: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  composer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(15,15,15,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    paddingBottom: 28,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#161618',
    color: '#fff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 36,
    maxHeight: 120,
    fontSize: 14,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: 'rgba(255,107,53,0.4)' },
});
