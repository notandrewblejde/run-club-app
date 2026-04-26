import { useCallback, useMemo, useState } from 'react';
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
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Send,
  Trash2,
  Award,
  Pencil,
  Share2,
  Sparkles,
} from 'lucide-react-native';
import {
  useActivity,
  useAddComment,
  useComments,
  useDeleteComment,
  useMyClubs,
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
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

export default function ActivityDetailScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { id, from, profileId } = useLocalSearchParams<{
    id: string;
    from?: string;
    profileId?: string;
  }>();

  /** `router.back()` can bubble past this stack and restore the wrong tab (e.g. discover). */
  const closeActivityDetail = useCallback(() => {
    if (from === 'profile' && profileId) {
      router.replace(`/(tabs)/users/${profileId}`);
      return;
    }
    router.replace('/(tabs)/feed');
  }, [from, profileId]);
  const activityQ = useActivity(id);
  const commentsQ = useComments(id);
  const myClubsQ = useMyClubs();
  const toggleKudo = useToggleKudo(id ?? '');
  const addComment = useAddComment(id ?? '');
  const deleteComment = useDeleteComment(id ?? '');

  const [draft, setDraft] = useState('');
  const [shareOpen, setShareOpen] = useState(false);

  if (!id) return null;
  const activity = activityQ.data;

  if (activityQ.isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={tokens.accentBlue} />
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

  const mapUrl = generateStaticMapUrl(activity.map_polyline, 800, 320, {
    style: tokens.mapStyle,
    pathColor: tokens.mapPathColor,
  });
  const comments = commentsQ.data?.data ?? [];
  const clubs = myClubsQ.data?.data ?? [];
  const stravaPhotos = activity.photos ?? [];
  const appPhotos = activity.app_photos ?? [];
  const allGallery = [...stravaPhotos, ...appPhotos];

  const handlePost = async () => {
    if (!draft.trim()) return;
    try {
      await addComment.mutateAsync(draft.trim());
      setDraft('');
    } catch (e: unknown) {
      Alert.alert('Could not post comment', (e as Error)?.message);
    }
  };

  const openShare = () => {
    if (!clubs.length) {
      Alert.alert('No clubs yet', 'Join a club from the Clubs tab to share your run there.');
      return;
    }
    setShareOpen(true);
  };

  const pickClubForShare = (clubId: string) => {
    setShareOpen(false);
    router.push({
      pathname: '/(tabs)/clubs/[id]/posts/new',
      params: { id: clubId, activityId: activity.id },
    });
  };

  return (
    <View style={styles.container}>
      <Modal visible={shareOpen} animationType="slide" transparent>
        <Pressable style={styles.modalBackdrop} onPress={() => setShareOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Share to a club</Text>
            <Text style={styles.modalHint}>Pick a club. Your post will link to this activity.</Text>
            <FlatList
              data={clubs}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.clubRow}
                  onPress={() => pickClubForShare(item.id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.clubName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShareOpen(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={closeActivityDetail} hitSlop={12}>
            <ArrowLeft size={22} color={tokens.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activity.user?.name || 'Run'}
          </Text>
          <View style={styles.headerActions}>
            {activity.owned_by_viewer ? (
              <>
                <TouchableOpacity
                  onPress={() => router.push(`/(tabs)/activity/${id}/edit`)}
                  hitSlop={12}
                  style={styles.headerIconBtn}
                >
                  <Pencil size={20} color={tokens.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={openShare} hitSlop={12} style={styles.headerIconBtn}>
                  <Share2 size={20} color={tokens.textSecondary} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ width: 22 }} />
            )}
          </View>
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

        {activity.user_note ? (
          <Text style={styles.userNote}>{activity.user_note}</Text>
        ) : null}

        {mapUrl ? (
          <Image source={{ uri: mapUrl }} style={styles.mapImage} resizeMode="cover" />
        ) : (
          <View style={[styles.mapImage, styles.mapPlaceholder]}>
            <Text style={styles.mapPlaceholderText}>No GPS data</Text>
          </View>
        )}

        {activity.ai_coach_summary?.trim() ? (
          <View style={styles.coachCard}>
            <View style={styles.coachHeader}>
              <Sparkles size={14} color={tokens.accentOrange} />
              <Text style={styles.coachTitle}>Coach insight</Text>
            </View>
            <Text style={styles.coachBody}>{activity.ai_coach_summary.trim()}</Text>
          </View>
        ) : null}

        <View style={styles.statGrid}>
          <Stat label="Distance" value={formatMiles(activity.distance_miles)} styles={styles} />
          <Stat label="Time" value={formatDuration(activity.moving_time_secs)} styles={styles} />
          <Stat
            label="Pace"
            value={activity.avg_pace_display ?? formatPace(activity.avg_pace_secs_per_mile)}
            styles={styles}
          />
          <Stat label="Elevation" value={formatElevation(activity.elevation_gain_ft)} styles={styles} />
          <Stat
            label="Avg HR"
            value={activity.avg_heart_rate_bpm ? `${activity.avg_heart_rate_bpm} bpm` : '—'}
            styles={styles}
          />
          <Stat
            label="Max HR"
            value={activity.max_heart_rate_bpm ? `${activity.max_heart_rate_bpm} bpm` : '—'}
            styles={styles}
          />
        </View>

        {allGallery.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStrip}
          >
            {allGallery.map((url) => (
              <Image key={url} source={{ uri: url }} style={styles.photo} />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.engagementRow}>
          <TouchableOpacity style={styles.engagementBtn} onPress={() => toggleKudo.mutate()}>
            <Heart
              size={20}
              color={activity.kudoed_by_viewer ? tokens.accentOrange : tokens.textSecondary}
              fill={activity.kudoed_by_viewer ? tokens.accentOrange : 'transparent'}
            />
            <Text style={styles.engagementCount}>{activity.kudos_count}</Text>
          </TouchableOpacity>
          <View style={styles.engagementBtn}>
            <MessageCircle size={20} color={tokens.textSecondary} />
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
                <TouchableOpacity onPress={() => deleteComment.mutate(c.id)} hitSlop={8}>
                  <Trash2 size={14} color={tokens.textMuted} />
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
          placeholderTextColor={tokens.placeholder}
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
    errorText: { color: t.textSecondary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
    },
    headerTitle: { color: t.text, fontWeight: '600', fontSize: 16, flex: 1, textAlign: 'center' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 72, justifyContent: 'flex-end' },
    headerIconBtn: { padding: 4 },
    activityName: { color: t.text, fontSize: 22, fontWeight: '700', paddingHorizontal: 20 },
    timestamp: {
      color: t.textMuted,
      fontSize: 13,
      paddingHorizontal: 20,
      marginTop: 4,
      marginBottom: 12,
    },
    userNote: {
      color: t.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    prBadge: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      marginHorizontal: 20,
      backgroundColor: t.accentYellow,
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
      backgroundColor: t.surfaceElevated,
      marginBottom: 16,
    },
    mapPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    mapPlaceholderText: { color: t.textMuted, fontSize: 13 },
    coachCard: {
      marginHorizontal: 20,
      marginBottom: 16,
      padding: 14,
      borderRadius: 12,
      backgroundColor: t.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.accentOrange,
    },
    coachHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    coachTitle: { color: t.text, fontWeight: '700', fontSize: 13 },
    coachBody: { color: t.textSecondary, fontSize: 14, lineHeight: 20 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginBottom: 16 },
    statBlock: { width: '33%', paddingVertical: 8 },
    statLabel: {
      color: t.textMuted,
      fontSize: 11,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    statValue: { color: t.text, fontSize: 14, fontWeight: '600' },
    photoStrip: { paddingHorizontal: 20, gap: 8, marginBottom: 16 },
    photo: { width: 160, height: 120, borderRadius: 8, marginRight: 8, backgroundColor: t.surfaceElevated },
    engagementRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 24, marginBottom: 24 },
    engagementBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    engagementCount: { color: t.textSecondary, fontSize: 14 },
    sectionTitle: {
      color: t.text,
      fontWeight: '600',
      fontSize: 16,
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    emptyComments: {
      color: t.textMuted,
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
      backgroundColor: t.accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    commentInitial: { color: '#fff', fontWeight: '700' },
    commentBody: { flex: 1 },
    commentName: { color: t.text, fontWeight: '600', fontSize: 13 },
    commentContent: { color: t.textSecondary, fontSize: 13, marginTop: 2 },
    composer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: t.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
      padding: 12,
      paddingBottom: 28,
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: t.surfaceElevated,
      color: t.text,
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
      backgroundColor: t.accentOrange,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.4 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: t.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 36,
      maxHeight: '55%',
    },
    modalTitle: { color: t.text, fontSize: 18, fontWeight: '700' },
    modalHint: { color: t.textMuted, fontSize: 13, marginTop: 6, marginBottom: 12 },
    clubRow: {
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    clubName: { color: t.text, fontSize: 16, fontWeight: '600' },
    modalCancel: { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
    modalCancelText: { color: t.textSecondary, fontSize: 15 },
  });
}
