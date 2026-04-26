import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { components } from '@/api/schema';
import { useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ArrowLeft, Sparkles, Send } from 'lucide-react-native';
import { router } from 'expo-router';
import {
  useFeed,
  useActivityCoachChat,
  useTrainingGoal,
  useTrainingToday,
  usePutTrainingGoal,
  useTrainingGoalFeedbackInfinite,
  usePostTrainingGoalFeedback,
  useClearTrainingGoalFeedback,
} from '@/api/hooks';
import { qk } from '@/api/queryClient';
import { formatMiles, formatRelativeFromUnix } from '@/utils/format';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

type GoalFeedbackMessage = components['schemas']['GoalFeedbackMessage'];

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

function msgId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function AiCoachScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const qc = useQueryClient();
  const { clearActions } = useBottomBarActions();
  const feedQ = useFeed('me');
  const trainingGoalQ = useTrainingGoal();
  const trainingTodayQ = useTrainingToday();
  const putGoal = usePutTrainingGoal();
  const feedbackQ = useTrainingGoalFeedbackInfinite();
  const postGoalFeedback = usePostTrainingGoalFeedback();
  const clearGoalFeedback = useClearTrainingGoalFeedback();
  const [goalDraft, setGoalDraft] = useState('');
  const [feedbackDraft, setFeedbackDraft] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const feedbackRows: GoalFeedbackMessage[] = useMemo(() => {
    const pages = feedbackQ.data?.pages;
    if (!pages?.length) return [];
    return [...pages].reverse().flatMap((p) => p.data);
  }, [feedbackQ.data]);
  const recent = feedQ.data?.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const coachChat = useActivityCoachChat();

  useFocusEffect(
    useCallback(() => {
      clearActions();
      void qc.invalidateQueries({ queryKey: qk.trainingToday() });
      void qc.invalidateQueries({ queryKey: qk.trainingGoal() });
      void qc.invalidateQueries({ queryKey: qk.trainingGoalFeedbackInfinite() });
      return () => {};
    }, [clearActions, qc]),
  );

  useEffect(() => {
    const g = trainingGoalQ.data?.goal_text;
    if (g !== undefined && g !== null) setGoalDraft(g);
  }, [trainingGoalQ.data?.goal_text]);

  const lastSeededActivityId = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedId) {
      lastSeededActivityId.current = null;
      setMessages([]);
      return;
    }
    const a = recent.find((x) => x.id === selectedId);
    if (!a) return;
    if (lastSeededActivityId.current === selectedId) return;
    lastSeededActivityId.current = selectedId;
    const stored = a.ai_coach_summary?.trim();
    const opener = stored
      ? `Here's your saved insight for ${a.name} (${formatMiles(a.distance_miles)} · ${formatRelativeFromUnix(a.start_date)}):\n\n${stored}\n\nAsk a follow-up about this run below.`
      : `You're chatting about ${a.name} (${formatMiles(a.distance_miles)} · ${formatRelativeFromUnix(a.start_date)}). I don't have a saved coach blurb yet for this one — ask anything about pace, effort, or recovery and I'll use your workout stats.`;
    setMessages([{ id: msgId(), role: 'assistant', content: opener }]);
  }, [selectedId, recent]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !selectedId) return;
    Keyboard.dismiss();
    setDraft('');
    const userMsg: ChatMessage = { id: msgId(), role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    try {
      const res = await coachChat.mutateAsync({ activityId: selectedId, message: text });
      const reply = res?.reply ?? 'No reply.';
      setMessages((m) => [...m, { id: msgId(), role: 'assistant', content: reply }]);
    } catch (e: unknown) {
      setMessages((m) => [
        ...m,
        {
          id: msgId(),
          role: 'assistant',
          content: (e as Error)?.message ?? 'Something went wrong. Try again.',
        },
      ]);
    }
  };

  const confirmClearFeedback = () => {
    if (feedbackRows.length === 0) return;
    Alert.alert(
      'Clear goal feedback?',
      'This removes the saved conversation. Your training goal text stays the same, and we will rebuild the interpretation without these notes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => void clearGoalFeedback.mutateAsync(),
        },
      ],
    );
  };

  const sendGoalFeedback = async () => {
    const text = feedbackDraft.trim();
    if (!text) return;
    if (!trainingGoalQ.data?.goal_text?.trim()) return;
    Keyboard.dismiss();
    setFeedbackError(null);
    setFeedbackDraft('');
    try {
      await postGoalFeedback.mutateAsync(text);
    } catch (e: unknown) {
      setFeedbackDraft(text);
      setFeedbackError((e as Error)?.message ?? 'Could not send feedback');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={tokens.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Sparkles size={18} color={tokens.accentOrange} />
          <Text style={styles.headerText}>AI Coach</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <Text style={styles.intro}>
        Choose a recent run, then chat about it. Insights are saved on each activity after sync when AI is
        configured on the server.
      </Text>

      <View style={styles.goalSection}>
        <Text style={styles.sectionTitle}>Training goal</Text>
        <Text style={styles.sectionHint}>
          Describe what you are training for in plain language. The server refreshes your interpretation and
          today&apos;s plan after you save (and when new runs sync).
        </Text>
        <TextInput
          style={styles.goalInput}
          placeholder="e.g. Build to a half marathon in October while staying healthy…"
          placeholderTextColor={tokens.placeholder}
          value={goalDraft}
          onChangeText={setGoalDraft}
          multiline
          maxLength={8000}
        />
        <TouchableOpacity
          style={[styles.goalSave, putGoal.isPending && { opacity: 0.55 }]}
          onPress={() => void putGoal.mutateAsync(goalDraft)}
          disabled={putGoal.isPending}
        >
          <Text style={styles.goalSaveText}>{putGoal.isPending ? 'Saving…' : 'Save goal'}</Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>Suggestions only—not medical advice.</Text>

        <View style={styles.goalFeedbackHeader}>
          <Text style={[styles.sectionTitle, { flex: 1 }]}>Goal feedback</Text>
          {feedbackRows.length > 0 ? (
            <TouchableOpacity
              onPress={confirmClearFeedback}
              disabled={clearGoalFeedback.isPending}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear goal feedback history"
            >
              <Text style={[styles.clearFeedbackLink, clearGoalFeedback.isPending && { opacity: 0.5 }]}>
                Clear history
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.sectionHint}>
          Clarify or correct how we should read your goal. Messages are stored on the server and included when we
          rebuild your interpretation and daily plan—they are not a separate persistent Claude &quot;memory&quot;
          product, just context we pass in on refresh.
        </Text>
        {feedbackQ.hasNextPage ? (
          <TouchableOpacity
            style={styles.loadOlder}
            onPress={() => void feedbackQ.fetchNextPage()}
            disabled={feedbackQ.isFetchingNextPage}
          >
            <Text style={styles.loadOlderText}>
              {feedbackQ.isFetchingNextPage ? 'Loading…' : 'Load older messages'}
            </Text>
          </TouchableOpacity>
        ) : null}
        <ScrollView
          style={styles.feedbackThread}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {feedbackQ.isPending && !feedbackQ.data ? (
            <ActivityIndicator color={tokens.accentOrange} style={{ marginVertical: 12 }} />
          ) : feedbackRows.length === 0 ? (
            <Text style={styles.feedbackEmpty}>No notes yet. Save a goal first, then add context here.</Text>
          ) : (
            feedbackRows.map((row) => (
              <View
                key={row.id}
                style={[
                  styles.feedbackBubble,
                  row.role === 'user' ? styles.feedbackBubbleUser : styles.feedbackBubbleCoach,
                ]}
              >
                <Text
                  style={row.role === 'user' ? styles.feedbackRoleUser : styles.feedbackRoleCoach}
                >
                  {row.role === 'user' ? 'You' : 'Coach'}
                </Text>
                <Text style={row.role === 'user' ? styles.feedbackTextUser : styles.feedbackTextCoach}>
                  {row.content}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
        {feedbackError ? <Text style={styles.feedbackError}>{feedbackError}</Text> : null}
        <View style={styles.feedbackComposer}>
          <TextInput
            style={styles.feedbackInput}
            placeholder={
              trainingGoalQ.data?.goal_text?.trim()
                ? 'e.g. I meant trail half, not road; easy weeks when travel…'
                : 'Save a training goal above to enable feedback'
            }
            placeholderTextColor={tokens.placeholder}
            value={feedbackDraft}
            onChangeText={setFeedbackDraft}
            multiline
            maxLength={4000}
            editable={!!trainingGoalQ.data?.goal_text?.trim() && !postGoalFeedback.isPending}
          />
          <TouchableOpacity
            style={[
              styles.feedbackSend,
              (!feedbackDraft.trim() ||
                !trainingGoalQ.data?.goal_text?.trim() ||
                postGoalFeedback.isPending) && { opacity: 0.45 },
            ]}
            onPress={() => void sendGoalFeedback()}
            disabled={
              !feedbackDraft.trim() || !trainingGoalQ.data?.goal_text?.trim() || postGoalFeedback.isPending
            }
            accessibilityRole="button"
            accessibilityLabel="Send goal feedback"
          >
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Today&apos;s plan</Text>
        {trainingTodayQ.isLoading ? (
          <ActivityIndicator color={tokens.accentOrange} style={{ marginTop: 8 }} />
        ) : (
          <View style={styles.todayCard}>
            <Text style={styles.todayHeadline}>{trainingTodayQ.data?.headline}</Text>
            <Text style={styles.todayPrimary}>{trainingTodayQ.data?.primary_session}</Text>
            {(trainingTodayQ.data?.bullets ?? []).map((b, i) => (
              <Text key={`${i}-${String(b).slice(0, 32)}`} style={styles.todayBullet}>
                • {b}
              </Text>
            ))}
          </View>
        )}
      </View>

      {feedQ.isLoading ? (
        <ActivityIndicator color={tokens.accentOrange} style={{ marginTop: 24 }} />
      ) : recent.length === 0 ? (
        <Text style={styles.empty}>
          No recent runs yet. Connect Strava and sync — coach notes are generated from your imported workout
          telemetry.
        </Text>
      ) : (
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            keyboardShouldPersistTaps="handled"
          >
            {recent.slice(0, 12).map((a) => {
              const on = selectedId === a.id;
              return (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setSelectedId(a.id)}
                  activeOpacity={0.85}
                  style={[
                    styles.chip,
                    { borderColor: on ? tokens.accentOrange : tokens.divider },
                    on && { backgroundColor: tokens.surfaceElevated },
                  ]}
                >
                  <Text style={[styles.chipName, on && { color: tokens.accentOrange }]} numberOfLines={1}>
                    {a.name}
                  </Text>
                  <Text style={styles.chipMeta} numberOfLines={1}>
                    {formatMiles(a.distance_miles)} · {formatRelativeFromUnix(a.start_date)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView
            ref={scrollRef}
            style={styles.thread}
            contentContainerStyle={styles.threadContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {!selectedId ? (
              <Text style={styles.hint}>Tap a run above to open the chat thread.</Text>
            ) : (
              messages.map((m) => (
                <View
                  key={m.id}
                  style={[
                    styles.bubbleWrap,
                    m.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapAssistant,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                    ]}
                  >
                    <Text style={m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
                      {m.content}
                    </Text>
                  </View>
                </View>
              ))
            )}
            {coachChat.isPending ? (
              <View style={styles.typing}>
                <ActivityIndicator size="small" color={tokens.accentOrange} />
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder={selectedId ? 'Message your coach…' : 'Pick a run first'}
              placeholderTextColor={tokens.placeholder}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={2000}
              editable={!!selectedId && !coachChat.isPending}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!draft.trim() || !selectedId || coachChat.isPending) && styles.sendBtnDisabled,
              ]}
              onPress={() => void send()}
              disabled={!draft.trim() || !selectedId || coachChat.isPending}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <Send size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
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
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 12,
    },
    headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    headerText: { color: t.text, fontWeight: '600', fontSize: 16 },
    intro: {
      color: t.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    empty: { color: t.textMuted, fontSize: 14, marginTop: 12, lineHeight: 20, paddingHorizontal: 20 },
    kav: { flex: 1 },
    chipRow: {
      gap: 8,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    chip: {
      width: 168,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: t.surfaceElevated,
    },
    chipName: { color: t.text, fontWeight: '600', fontSize: 13 },
    chipMeta: { color: t.textMuted, fontSize: 11, marginTop: 4 },
    thread: { flex: 1 },
    threadContent: { paddingHorizontal: 20, paddingBottom: 16, flexGrow: 1 },
    hint: { color: t.textMuted, fontSize: 14, marginTop: 24, textAlign: 'center' },
    bubbleWrap: { marginBottom: 10, maxWidth: '92%' },
    bubbleWrapUser: { alignSelf: 'flex-end' },
    bubbleWrapAssistant: { alignSelf: 'flex-start' },
    bubble: {
      borderRadius: 16,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    bubbleUser: { backgroundColor: t.accentBlue },
    bubbleAssistant: {
      backgroundColor: t.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    bubbleTextUser: { color: '#fff', fontSize: 15, lineHeight: 21 },
    bubbleTextAssistant: { color: t.text, fontSize: 15, lineHeight: 21 },
    typing: { paddingVertical: 8, alignItems: 'flex-start' },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      paddingBottom: 24,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
      backgroundColor: t.background,
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 120,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: t.text,
      backgroundColor: t.surfaceElevated,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.accentOrange,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.45 },

    goalSection: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sectionTitle: { color: t.text, fontWeight: '700', fontSize: 15 },
    sectionHint: { color: t.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 6 },
    goalInput: {
      marginTop: 10,
      minHeight: 88,
      borderRadius: 12,
      padding: 12,
      fontSize: 15,
      color: t.text,
      backgroundColor: t.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
      textAlignVertical: 'top',
    },
    goalSave: {
      marginTop: 10,
      alignSelf: 'flex-start',
      backgroundColor: t.accentOrange,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
    },
    goalSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    disclaimer: { color: t.textMuted, fontSize: 11, marginTop: 8 },
    todayCard: {
      marginTop: 8,
      padding: 14,
      borderRadius: 12,
      backgroundColor: t.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    todayHeadline: { color: t.text, fontWeight: '700', fontSize: 16 },
    todayPrimary: { color: t.textSecondary, fontSize: 14, marginTop: 8, lineHeight: 20 },
    todayBullet: { color: t.textSecondary, fontSize: 14, marginTop: 6, lineHeight: 20 },

    goalFeedbackHeader: {
      marginTop: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    clearFeedbackLink: { color: t.error, fontSize: 14, fontWeight: '600' },
    loadOlder: {
      alignSelf: 'center',
      marginTop: 4,
      marginBottom: 4,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    loadOlderText: { color: t.accentBlue, fontSize: 14, fontWeight: '600' },
    feedbackThread: { maxHeight: 220, marginTop: 8 },
    feedbackEmpty: { color: t.textMuted, fontSize: 13, marginVertical: 8, lineHeight: 18 },
    feedbackBubble: {
      maxWidth: '92%',
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 8,
    },
    feedbackBubbleUser: {
      alignSelf: 'flex-end',
      backgroundColor: t.accentBlue,
    },
    feedbackBubbleCoach: {
      alignSelf: 'flex-start',
      backgroundColor: t.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    feedbackRoleUser: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
    feedbackRoleCoach: { fontSize: 11, fontWeight: '700', color: t.textMuted, marginBottom: 4 },
    feedbackTextUser: { fontSize: 14, lineHeight: 20, color: '#fff' },
    feedbackTextCoach: { fontSize: 14, lineHeight: 20, color: t.text },
    feedbackError: { color: t.error, fontSize: 13, marginTop: 6 },
    feedbackComposer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginTop: 8,
    },
    feedbackInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: t.text,
      backgroundColor: t.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
      textAlignVertical: 'top',
    },
    feedbackSend: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: t.accentOrange,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
