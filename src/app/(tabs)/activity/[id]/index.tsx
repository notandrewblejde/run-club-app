import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EventSource from 'react-native-sse';
import { useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  useActivitySummary,
  type ActivityCoachSummaryPayload,
  useAddComment,
  useComments,
  useDeleteComment,
  useMyClubs,
  useToggleKudo,
} from '@/api/hooks';
import { qk } from '@/api/queryClient';
import { ApiError } from '@/api/client';
import { generateStaticMapUrl } from '@/utils/mapbox';
import {
  formatDateFromUnix,
  formatDuration,
  formatElevation,
  firstTwoSentences,
  formatMiles,
  formatPace,
  formatRelativeFromUnix,
} from '@/utils/format';
import { MarkdownBubbleContent } from '@/components/chat/MarkdownBubbleContent';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

function coachMsgId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Space so the composer clears the floating DetailBar (back + agent pill, ~52px + ~28 offset). */
const DETAIL_BAR_BOTTOM_CLEARANCE = 82;

export default function ActivityDetailScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const insets = useSafeAreaInsets();
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
  const qc = useQueryClient();
  const activityQ = useActivity(id);
  const summaryQ = useActivitySummary(id, {
    enabled:
      !!id &&
      !!activityQ.data &&
      !(
        activityQ.data.ai_coach_summary &&
        activityQ.data.ai_coach_summary.trim().length > 0
      ),
  });
  const commentsQ = useComments(id);
  const myClubsQ = useMyClubs();
  const toggleKudo = useToggleKudo(id ?? '');
  const addComment = useAddComment(id ?? '');
  const deleteComment = useDeleteComment(id ?? '');

  const [draft, setDraft] = useState('');
  const [activityTab, setActivityTab] = useState<'comments' | 'coach'>('comments');
  const [shareOpen, setShareOpen] = useState(false);
  const [coachMessages, setCoachMessages] = useState<
    { id: string; role: 'user' | 'assistant'; content: string }[]
  >([]);
  const [coachDraft, setCoachDraft] = useState('');
  const [coachStreaming, setCoachStreaming] = useState(false);
  const coachEsRef = useRef<EventSource | null>(null);
  const coachScrollRef = useRef<ScrollView>(null);
  const commentsRef = useRef<View>(null);
  const mainScrollRef = useRef<ScrollView>(null);
  const coachSeedId = useRef<string | null>(null);

  const scrollMainTowardComposer = useCallback(() => {
    requestAnimationFrame(() => mainScrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(() => {
    setActivityTab('comments');
  }, [id]);

  useEffect(() => {
    const a = activityQ.data;
    if (!a) return;
    if (coachSeedId.current === a.id) return;
    coachSeedId.current = a.id;
    // Coach's take (main scroll) carries the summary; chat starts empty with the tab hint.
    setCoachMessages([]);
    setCoachDraft('');
  }, [activityQ.data]);

  useEffect(() => {
    requestAnimationFrame(() => coachScrollRef.current?.scrollToEnd({ animated: true }));
  }, [coachMessages]);

  useEffect(() => {
    const a = activityQ.data;
    const s = (summaryQ.data as ActivityCoachSummaryPayload | undefined)?.summary?.trim();
    if (!a?.id || !s) return;
    if ((a.ai_coach_summary?.trim() ?? '').length > 0) return;
    qc.setQueryData(qk.activity(a.id), { ...a, ai_coach_summary: s });
  }, [activityQ.data, summaryQ.data, qc]);

  useEffect(() => {
    return () => {
      coachEsRef.current?.close();
      coachEsRef.current = null;
    };
  }, []);

  if (!id) return null;

  if (activityQ.isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={tokens.accentBlue} />
      </View>
    );
  }
  if (activityQ.isError || !activityQ.data) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>{activityQ.error?.message ?? 'Activity not found'}</Text>
      </View>
    );
  }

  const activity = activityQ.data;
  const summaryPayload = summaryQ.data as ActivityCoachSummaryPayload | undefined;

  const coachTakeRaw =
    activity.ai_coach_summary?.trim() || summaryPayload?.summary?.trim() || '';
  const coachTakeLoading =
    summaryQ.isPending &&
    !(activity.ai_coach_summary?.trim()) &&
    !summaryPayload?.summary?.trim();
  const showCoachTake = coachTakeRaw.length > 0 || coachTakeLoading;

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

  const sendCoachMessage = async () => {
    if (!activity.owned_by_viewer || !id || coachStreaming) return;
    const text = coachDraft.trim();
    if (!text) return;
    Keyboard.dismiss();
    setCoachDraft('');
    setCoachMessages((m) => [...m, { id: coachMsgId(), role: 'user', content: text }]);

    const assistantId = coachMsgId();
    setCoachMessages((m) => [...m, { id: assistantId, role: 'assistant', content: '' }]);
    setCoachStreaming(true);

    try {
      const token = await SecureStore.getItemAsync('jwt');
      const apiBase = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

      coachEsRef.current?.close();
      const es = new EventSource<'done'>(`${apiBase}/v1/activities/${id}/coach/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text }),
        pollingInterval: 0,
      });
      coachEsRef.current = es;

      es.addEventListener('message', (e: any) => {
        const chunk = e.data ?? '';
        if (!chunk || chunk === '[DONE]') return;
        setCoachMessages((m) =>
          m.map((msg) => msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg)
        );
        setTimeout(() => coachScrollRef.current?.scrollToEnd({ animated: true }), 50);
      });

      es.addEventListener('done', () => {
        es.close(); coachEsRef.current = null; setCoachStreaming(false);
      });

      es.addEventListener('error', () => {
        es.close(); coachEsRef.current = null; setCoachStreaming(false);
        setCoachMessages((m) =>
          m.map((msg) => msg.id === assistantId && msg.content === ''
            ? { ...msg, content: 'Something went wrong. Try again.' } : msg)
        );
      });
    } catch (e: unknown) {
      setCoachStreaming(false);
      setCoachMessages((m) =>
        m.map((msg) => msg.id === assistantId && msg.content === ''
          ? { ...msg, content: (e as Error)?.message ?? 'Something went wrong.' } : msg)
      );
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
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

      <ScrollView
        ref={mainScrollRef}
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
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
          <Image
            key={`${activity.id}-${mapUrl}`}
            source={{ uri: mapUrl }}
            style={styles.mapImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.mapImage, styles.mapPlaceholder]}>
            <Text style={styles.mapPlaceholderText}>No GPS data</Text>
          </View>
        )}

        <View style={styles.engagementRow}>
          <TouchableOpacity style={styles.engagementBtn} onPress={() => toggleKudo.mutate()}>
            <Heart
              size={20}
              color={activity.kudoed_by_viewer ? tokens.accentOrange : tokens.textSecondary}
              fill={activity.kudoed_by_viewer ? tokens.accentOrange : 'transparent'}
            />
            <Text style={styles.engagementCount}>{activity.kudos_count}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.engagementBtn}
            onPress={() => {
              setActivityTab('comments');
              commentsRef.current?.measureInWindow((x, y) => {
                mainScrollRef.current?.scrollTo({ y: y, animated: true });
              });
            }}
          >
            <MessageCircle size={20} color={tokens.textSecondary} />
            <Text style={styles.engagementCount}>{activity.comment_count}</Text>
          </TouchableOpacity>
        </View>

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



        {showCoachTake ? (
          <View style={styles.coachTakeCard}>
            <View style={styles.coachTakeHeader}>
              <Sparkles size={14} color={tokens.aiAccent} />
              <Text style={styles.coachTakeTitle}>{`Coach's take`}</Text>
            </View>
            {coachTakeLoading ? (
              <ActivityIndicator
                size="small"
                color={tokens.aiAccent}
                style={styles.coachTakeLoading}
              />
            ) : (
              <Text style={styles.coachTakeBody}>{firstTwoSentences(coachTakeRaw)}</Text>
            )}
          </View>
        ) : null}

        <View ref={commentsRef}>
        </View>
        {activity.owned_by_viewer ? (
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabPill, activityTab === 'comments' && styles.tabPillActive]}
              onPress={() => setActivityTab('comments')}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityState={{ selected: activityTab === 'comments' }}
            >
              <Text style={[styles.tabPillText, activityTab === 'comments' && styles.tabPillTextActive]}>
                Comments
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabPill, activityTab === 'coach' && styles.tabPillActive]}
              onPress={() => setActivityTab('coach')}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityState={{ selected: activityTab === 'coach' }}
            >
              <Text style={[styles.tabPillText, activityTab === 'coach' && styles.tabPillTextActive]}>Coach</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.sectionTitle}>Comments</Text>
        )}

        {(!activity.owned_by_viewer || activityTab === 'comments') && (
          <>
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
          </>
        )}

        {activity.owned_by_viewer && activityTab === 'coach' ? (
          <View style={styles.coachChatCard}>
            <Text style={styles.coachTabHint}>
              {`Ask about this workout — replies use this activity's stats.`}
            </Text>
            <ScrollView
              ref={coachScrollRef}
              style={styles.coachChatThreadTab}
              contentContainerStyle={styles.coachChatThreadContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {coachMessages.map((m) => (
                <View
                  key={m.id}
                  style={[
                    styles.coachBubbleWrap,
                    m.role === 'user' ? styles.coachBubbleWrapUser : styles.coachBubbleWrapAssistant,
                  ]}
                >
                  <View
                    style={[
                      styles.coachBubble,
                      m.role === 'user' ? styles.coachBubbleUser : styles.coachBubbleAssistant,
                    ]}
                  >
                    {m.role === 'assistant' ? (
                      <MarkdownBubbleContent
                        content={m.content}
                        variant="assistant"
                        tokens={tokens}
                        fontSize={14}
                      />
                    ) : (
                      <Text style={styles.coachBubbleTextUser}>{m.content}</Text>
                    )}
                  </View>
                </View>
              ))}
              {coachStreaming ? (
                <View style={styles.coachTyping}>
                  <ActivityIndicator size="small" color={tokens.aiAccent} />
                </View>
              ) : null}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      {!activity.owned_by_viewer || activityTab === 'comments' ? (
        <View
          style={[
            styles.composer,
            {
              paddingBottom: 12 + Math.max(insets.bottom, 8),
              marginBottom: DETAIL_BAR_BOTTOM_CLEARANCE,
            },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="Add a comment…"
            placeholderTextColor={tokens.placeholder}
            value={draft}
            onChangeText={setDraft}
            multiline
            onFocus={scrollMainTowardComposer}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!draft.trim() || addComment.isPending) && styles.sendBtnDisabled]}
            onPress={handlePost}
            disabled={!draft.trim() || addComment.isPending}
          >
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={[
            styles.composer,
            {
              paddingBottom: 12 + Math.max(insets.bottom, 8),
              marginBottom: DETAIL_BAR_BOTTOM_CLEARANCE,
            },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="Ask your coach about this run…"
            placeholderTextColor={tokens.placeholder}
            value={coachDraft}
            onChangeText={setCoachDraft}
            multiline
            maxLength={2000}
            editable={!coachStreaming}
            onFocus={scrollMainTowardComposer}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!coachDraft.trim() || coachStreaming) && styles.sendBtnDisabled,
            ]}
            onPress={() => void sendCoachMessage()}
            disabled={!coachDraft.trim() || coachStreaming}
          >
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
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
    mainScroll: { flex: 1 },
    mainScrollContent: { paddingBottom: 16 },
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
    coachTakeCard: {
      marginHorizontal: 20,
      marginBottom: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: t.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.aiAccent,
    },
    coachTakeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    coachTakeTitle: { color: t.text, fontWeight: '700', fontSize: 12, letterSpacing: 0.2 },
    coachTakeBody: { color: t.textSecondary, fontSize: 13, lineHeight: 19 },
    coachTakeLoading: { alignSelf: 'flex-start', marginTop: 4 },
    coachChatCard: {
      marginHorizontal: 20,
      marginBottom: 16,
      padding: 14,
      borderRadius: 12,
      backgroundColor: t.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    coachChatHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    coachChatTitle: { color: t.text, fontWeight: '700', fontSize: 13 },
    coachChatThread: { maxHeight: 240 },
    coachChatThreadContent: { paddingBottom: 8, flexGrow: 1 },
    coachBubbleWrap: { marginBottom: 10, maxWidth: '92%' },
    coachBubbleWrapUser: { alignSelf: 'flex-end' },
    coachBubbleWrapAssistant: { alignSelf: 'flex-start' },
    coachBubble: { borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
    coachBubbleUser: { backgroundColor: t.accentBlue },
    coachBubbleAssistant: {
      backgroundColor: t.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    coachBubbleTextUser: { color: '#fff', fontSize: 14, lineHeight: 20 },
    coachBubbleTextAssistant: { color: t.text, fontSize: 14, lineHeight: 20 },
    coachTyping: { paddingVertical: 6, alignItems: 'flex-start' },
    coachChatComposer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
    coachChatInput: {
      flex: 1,
      minHeight: 40,
      maxHeight: 100,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: t.text,
      backgroundColor: t.background,
    },
    coachChatSend: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.aiAccent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coachChatSendDisabled: { opacity: 0.45 },
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
    engagementRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 24, marginBottom: 16 },
    engagementBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    engagementCount: { color: t.textSecondary, fontSize: 14 },
    tabBar: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 12,
      padding: 3,
      borderRadius: 10,
      backgroundColor: t.surfaceElevated,
      gap: 4,
    },
    tabPill: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
    },
    tabPillActive: { backgroundColor: t.background },
    tabPillText: { color: t.textMuted, fontSize: 14, fontWeight: '600' },
    tabPillTextActive: { color: t.text },
    coachTabHint: {
      color: t.textMuted,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 10,
    },
    coachChatThreadTab: { maxHeight: 360, minHeight: 200 },
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
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: t.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
      paddingHorizontal: 12,
      paddingTop: 10,
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
