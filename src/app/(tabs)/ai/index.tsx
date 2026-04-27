import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Pencil, Sparkles, Send } from 'lucide-react-native';
import { router } from 'expo-router';
import {
  useFeed,
  useActivityCoachChat,
  useTrainingGoal,
  usePutTrainingGoal,
  useTrainingGoalFeedbackInfinite,
  usePostTrainingGoalFeedback,
  useClearTrainingGoalFeedback,
} from '@/api/hooks';
import { qk } from '@/api/queryClient';
import { ApiError } from '@/api/client';
import { formatMiles, formatRelativeFromUnix } from '@/utils/format';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Run-scoped thread vs server-stored training-goal notes (same list; labels differ). */
  channel: 'run' | 'goal';
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
  const putGoal = usePutTrainingGoal();
  const feedbackQ = useTrainingGoalFeedbackInfinite();
  const postGoalFeedback = usePostTrainingGoalFeedback();
  const clearGoalFeedback = useClearTrainingGoalFeedback();
  const [goalDraft, setGoalDraft] = useState('');
  // Must not use `?? []` inline — a new array every render would retrigger effects that
  // depend on `recent` and cause "Maximum update depth exceeded" when the feed is empty.
  const recent = useMemo(() => feedQ.data?.data ?? [], [feedQ.data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [goalNoteMode, setGoalNoteMode] = useState(false);
  const bodyScrollRef = useRef<ScrollView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const goalInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const coachChat = useActivityCoachChat();
  const serverGoal = trainingGoalQ.data?.goal_text?.trim() ?? '';
  const canGoalNote = !!trainingGoalQ.data?.goal_text?.trim();
  const canChatAboutRun = recent.length > 0;
  const showKav = canChatAboutRun || canGoalNote;
  const onlyGoalPath = !canChatAboutRun && canGoalNote;
  const effectiveGoalMode = onlyGoalPath || goalNoteMode;
  const totalSavedGoalNotes = feedbackQ.data?.pages[0]?.total_count ?? 0;

  useEffect(() => {
    if (onlyGoalPath) setGoalNoteMode(true);
  }, [onlyGoalPath]);

  const saveTrainingGoal = async () => {
    const text = goalDraft.trim();
    if (!text) {
      Alert.alert('Training goal', 'Enter a goal first.');
      return;
    }
    try {
      await putGoal.mutateAsync(text);
    } catch (e: unknown) {
      const err = e as ApiError | Error;
      const line =
        'status' in err && typeof err.status === 'number'
          ? `${err.message} (${err.status})`
          : err.message;
      Alert.alert("Couldn't save goal", line);
    }
  };

  useFocusEffect(
    useCallback(() => {
      clearActions();
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
      if (!onlyGoalPath) {
        setMessages((prev) => prev.filter((m) => m.channel === 'goal'));
      }
      return;
    }
    const a = recent.find((x) => x.id === selectedId);
    if (!a) return;
    if (lastSeededActivityId.current === selectedId) return;
    lastSeededActivityId.current = selectedId;
    const stored = a.ai_coach_summary?.trim();
    const opener = stored
      ? `Here's your saved insight for ${a.name} (${formatMiles(a.distance_miles)} · ${formatRelativeFromUnix(a.start_date)}):\n\n${stored}\n\nAsk a follow-up about this run below, or use Goal note for training-plan context.`
      : `You're chatting about ${a.name} (${formatMiles(a.distance_miles)} · ${formatRelativeFromUnix(a.start_date)}). I don't have a saved coach blurb yet for this one — ask anything about pace, effort, or recovery and I'll use your workout stats.`;
    setMessages((prev) => {
      const keep = prev.filter((m) => m.channel === 'goal');
      return [
        ...keep,
        { id: msgId(), role: 'assistant', content: opener, channel: 'run' },
      ];
    });
  }, [selectedId, recent, onlyGoalPath]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const composerPending = coachChat.isPending || postGoalFeedback.isPending;

  const sendComposer = async () => {
    const text = draft.trim();
    if (!text) return;
    if (effectiveGoalMode) {
      if (!canGoalNote) {
        Alert.alert('Training goal', 'Save a training goal first to add goal notes.');
        return;
      }
      Keyboard.dismiss();
      setDraft('');
      const userMsg: ChatMessage = { id: msgId(), role: 'user', content: text, channel: 'goal' };
      setMessages((m) => [...m, userMsg]);
      try {
        const res = await postGoalFeedback.mutateAsync(text);
        const reply = res?.reply ?? 'Saved.';
        setMessages((m) => [
          ...m,
          { id: msgId(), role: 'assistant', content: reply, channel: 'goal' },
        ]);
      } catch (e: unknown) {
        if (__DEV__ && e instanceof ApiError) {
          console.warn('[AI Coach] goal note', e.message, { status: e.status, code: e.code, type: e.type });
        }
        setMessages((m) => [
          ...m,
          {
            id: msgId(),
            role: 'assistant',
            content: (e as Error)?.message ?? 'Could not send goal note. Try again.',
            channel: 'goal',
          },
        ]);
      }
      return;
    }
    if (!selectedId) return;
    Keyboard.dismiss();
    setDraft('');
    const userMsg: ChatMessage = { id: msgId(), role: 'user', content: text, channel: 'run' };
    setMessages((m) => [...m, userMsg]);
    try {
      const res = await coachChat.mutateAsync({ activityId: selectedId, message: text });
      const reply = res?.reply ?? 'No reply.';
      setMessages((m) => [
        ...m,
        { id: msgId(), role: 'assistant', content: reply, channel: 'run' },
      ]);
    } catch (e: unknown) {
      if (__DEV__ && e instanceof ApiError) {
        console.warn('[AI Coach] run chat', e.message, { status: e.status, code: e.code, type: e.type });
      } else if (__DEV__ && e instanceof Error) {
        console.warn('[AI Coach] run chat', e.message);
      }
      setMessages((m) => [
        ...m,
        {
          id: msgId(),
          role: 'assistant',
          content: (e as Error)?.message ?? 'Something went wrong. Try again.',
          channel: 'run',
        },
      ]);
    }
  };

  const confirmClearFeedback = () => {
    if (totalSavedGoalNotes <= 0) return;
    Alert.alert(
      'Clear saved goal notes?',
      'This removes stored goal note messages. Your training goal text stays the same, and we will rebuild the interpretation without these notes. Messages on this screen that were goal notes will no longer match the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () =>
            void (async () => {
              try {
                await clearGoalFeedback.mutateAsync();
                setMessages((m) => m.filter((x) => x.channel !== 'goal'));
                void feedbackQ.refetch();
              } catch {
                /* Error surfaced by mutation in dev */
              }
            })(),
        },
      ],
    );
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
        Save a training goal, then use the bar below: chat about a synced run, or add goal notes (saved for
        your next plan refresh). Per-run coach insights are stored on the activity when AI is configured on
        the server.
      </Text>

      <ScrollView
        ref={bodyScrollRef}
        style={styles.bodyScroll}
        contentContainerStyle={styles.bodyScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        bounces
      >
        <View style={styles.goalSection}>
        <View style={styles.goalTitleRow}>
          <Text style={styles.sectionTitle}>Training goal</Text>
          {serverGoal.length > 0 ? (
            <TouchableOpacity
              style={styles.goalEditPencil}
              onPress={() => {
                requestAnimationFrame(() => goalInputRef.current?.focus());
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit training goal"
            >
              <Pencil size={18} color={tokens.accentOrange} strokeWidth={2.1} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.sectionHint}>
          Describe what you are training for in plain language. The server refreshes your interpretation and
          today&apos;s plan after you save (and when new runs sync).
        </Text>
        <TextInput
          ref={goalInputRef}
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
          onPress={() => void saveTrainingGoal()}
          disabled={putGoal.isPending}
        >
          <Text style={styles.goalSaveText}>{putGoal.isPending ? 'Saving…' : 'Save goal'}</Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>Suggestions only—not medical advice.</Text>
        {totalSavedGoalNotes > 0 ? (
          <View style={styles.goalMetaRow}>
            <Text style={styles.goalMetaText}>
              {totalSavedGoalNotes} saved goal note{totalSavedGoalNotes === 1 ? '' : 's'}
            </Text>
            <TouchableOpacity
              onPress={confirmClearFeedback}
              disabled={clearGoalFeedback.isPending}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear saved goal notes on server"
            >
              <Text style={[styles.clearFeedbackLink, clearGoalFeedback.isPending && { opacity: 0.5 }]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        </View>

        {feedQ.isLoading ? (
          <ActivityIndicator color={tokens.accentOrange} style={{ marginTop: 24, marginBottom: 24 }} />
        ) : recent.length === 0 ? (
          <Text style={styles.empty}>
            No recent runs yet. Connect Strava and sync — coach notes are generated from your imported workout
            telemetry.
          </Text>
        ) : null}
      </ScrollView>

      {showKav ? (
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          {canChatAboutRun ? (
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
                    onPress={() => {
                      setSelectedId(a.id);
                      setGoalNoteMode(false);
                    }}
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
          ) : null}

          <ScrollView
            ref={scrollRef}
            style={styles.thread}
            contentContainerStyle={styles.threadContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {onlyGoalPath ? (
              <Text style={styles.hint}>
                Add notes about your training goal — they are saved and used when we refresh your
                interpretation and plan (same text as the old goal-feedback field).
              </Text>
            ) : canChatAboutRun && !selectedId && !effectiveGoalMode ? (
              <Text style={styles.hint}>
                Tap a run to chat with workout stats
                {canGoalNote ? ', or use Goal note to refine your plan without picking a run.' : '.'}
              </Text>
            ) : canChatAboutRun && !selectedId && effectiveGoalMode ? (
              <Text style={styles.hint}>
                Goal note mode: messages shape your next plan. Switch to &quot;This run&quot; after you pick a
                workout to chat with stats.
              </Text>
            ) : null}
            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.bubbleWrap,
                  m.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapAssistant,
                ]}
              >
                {m.channel === 'goal' ? (
                  <Text
                    style={[
                      styles.channelPill,
                      m.role === 'user' ? styles.channelPillUser : styles.channelPillAssistant,
                    ]}
                  >
                    Training goal
                  </Text>
                ) : null}
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
            ))}
            {composerPending ? (
              <View style={styles.typing}>
                <ActivityIndicator size="small" color={tokens.accentOrange} />
              </View>
            ) : null}
          </ScrollView>

          {canChatAboutRun && canGoalNote ? (
            <View style={styles.modeRow}>
              <TouchableOpacity
                onPress={() => setGoalNoteMode(false)}
                activeOpacity={0.85}
                style={[
                  styles.modePill,
                  { borderColor: !effectiveGoalMode ? tokens.accentOrange : tokens.divider },
                  !effectiveGoalMode && { backgroundColor: tokens.surfaceElevated },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: !effectiveGoalMode }}
                accessibilityLabel="This run"
              >
                <Text
                  style={[
                    styles.modePillText,
                    !effectiveGoalMode && { color: tokens.accentOrange, fontWeight: '700' },
                  ]}
                >
                  This run
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setGoalNoteMode(true)}
                activeOpacity={0.85}
                style={[
                  styles.modePill,
                  { borderColor: effectiveGoalMode ? tokens.accentOrange : tokens.divider },
                  effectiveGoalMode && { backgroundColor: tokens.surfaceElevated },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: effectiveGoalMode }}
                accessibilityLabel="Goal note"
              >
                <Text
                  style={[
                    styles.modePillText,
                    effectiveGoalMode && { color: tokens.accentOrange, fontWeight: '700' },
                  ]}
                >
                  Goal note
                </Text>
              </TouchableOpacity>
            </View>
          ) : onlyGoalPath ? (
            <Text style={styles.modeOnlyCaption}>Notes apply to your training plan</Text>
          ) : null}

          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput
              style={styles.input}
              placeholder={
                effectiveGoalMode
                  ? canGoalNote
                    ? 'e.g. Road half not trail; back off on travel weeks…'
                    : 'Save a training goal first'
                  : selectedId
                    ? 'Message about this run…'
                    : 'Pick a run or use Goal note'
              }
              placeholderTextColor={tokens.placeholder}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={effectiveGoalMode ? 4000 : 2000}
              editable={
                !composerPending &&
                (effectiveGoalMode ? canGoalNote : canChatAboutRun && !!selectedId)
              }
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!draft.trim() ||
                  composerPending ||
                  (effectiveGoalMode && !canGoalNote) ||
                  (!effectiveGoalMode && !selectedId)) &&
                  styles.sendBtnDisabled,
              ]}
              onPress={() => void sendComposer()}
              disabled={
                !draft.trim() ||
                composerPending ||
                (effectiveGoalMode && !canGoalNote) ||
                (!effectiveGoalMode && !selectedId)
              }
              accessibilityRole="button"
              accessibilityLabel={effectiveGoalMode ? 'Send goal note' : 'Send message about run'}
            >
              <Send size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : null}
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
    bodyScroll: { flex: 1 },
    bodyScrollContent: { paddingBottom: 16, flexGrow: 1 },
    empty: { color: t.textMuted, fontSize: 14, marginTop: 12, lineHeight: 20, paddingHorizontal: 0 },
    kav: { maxHeight: '46%', minHeight: 280 },
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
      paddingTop: 10,
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
    goalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    goalEditPencil: {
      padding: 6,
      borderRadius: 8,
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
    goalMetaRow: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    goalMetaText: { color: t.textSecondary, fontSize: 12 },
    clearFeedbackLink: { color: t.error, fontSize: 14, fontWeight: '600' },

    channelPill: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 4,
    },
    channelPillUser: { color: t.accentBlue, alignSelf: 'flex-end' },
    channelPillAssistant: { color: t.textMuted, alignSelf: 'flex-start' },

    modeRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 2,
      gap: 8,
    },
    modePill: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: t.background,
    },
    modePillText: { color: t.textSecondary, fontSize: 14 },
    modeOnlyCaption: {
      color: t.textMuted,
      fontSize: 12,
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 2,
    },
  });
}
