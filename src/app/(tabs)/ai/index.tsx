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
  useGlobalAiCoachChat,
  useTrainingGoal,
  usePutTrainingGoal,
  useTrainingGoalFeedbackInfinite,
  usePostTrainingGoalFeedback,
  useClearTrainingGoalFeedback,
} from '@/api/hooks';
import { qk } from '@/api/queryClient';
import { ApiError } from '@/api/client';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

type ChatRole = 'user' | 'assistant';
type MessageSource = 'chat' | 'plan';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  source: MessageSource;
}

function msgId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function AiCoachScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const qc = useQueryClient();
  const { clearActions } = useBottomBarActions();
  const trainingGoalQ = useTrainingGoal();
  const putGoal = usePutTrainingGoal();
  const feedbackQ = useTrainingGoalFeedbackInfinite();
  const postGoalFeedback = usePostTrainingGoalFeedback();
  const clearGoalFeedback = useClearTrainingGoalFeedback();
  const globalCoach = useGlobalAiCoachChat();

  const [goalDraft, setGoalDraft] = useState('');
  const [planDraft, setPlanDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const goalInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const seededRef = useRef(false);

  const serverGoal = trainingGoalQ.data?.goal_text?.trim() ?? '';
  const canGoalNote = !!trainingGoalQ.data?.goal_text?.trim();
  const totalSavedGoalNotes = feedbackQ.data?.pages[0]?.total_count ?? 0;

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

  useEffect(() => {
    if (trainingGoalQ.isLoading) return;
    if (seededRef.current) return;
    seededRef.current = true;
    setMessages([
      {
        id: msgId(),
        role: 'assistant',
        source: 'chat',
        content:
          'Ask anything about training load, race prep, or how your recent runs fit your goal. This chat uses your saved goal, plan notes, and imported activities. For deep questions about one workout, open that run and use Chat about this run there.',
      },
    ]);
  }, [trainingGoalQ.isLoading]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendPlanNote = async () => {
    const text = planDraft.trim();
    if (!text) return;
    if (!canGoalNote) {
      Alert.alert('Training goal', 'Save a training goal first.');
      return;
    }
    Keyboard.dismiss();
    setPlanDraft('');
    const userMsg: ChatMessage = { id: msgId(), role: 'user', content: text, source: 'plan' };
    setMessages((m) => [...m, userMsg]);
    try {
      const res = await postGoalFeedback.mutateAsync(text);
      setMessages((m) => [
        ...m,
        { id: msgId(), role: 'assistant', content: res?.reply ?? 'Saved.', source: 'plan' },
      ]);
    } catch (e: unknown) {
      if (__DEV__ && e instanceof ApiError) {
        console.warn('[AI Coach] plan note', e.message, { status: e.status, code: e.code });
      }
      setMessages((m) => [
        ...m,
        {
          id: msgId(),
          role: 'assistant',
          content: (e as Error)?.message ?? 'Could not save plan note.',
          source: 'plan',
        },
      ]);
    }
  };

  const sendChat = async () => {
    const text = chatDraft.trim();
    if (!text) return;
    Keyboard.dismiss();
    setChatDraft('');
    setMessages((m) => [...m, { id: msgId(), role: 'user', content: text, source: 'chat' }]);
    try {
      const res = await globalCoach.mutateAsync({ message: text });
      setMessages((m) => [
        ...m,
        { id: msgId(), role: 'assistant', content: res?.reply ?? 'No reply.', source: 'chat' },
      ]);
    } catch (e: unknown) {
      if (__DEV__ && e instanceof ApiError) {
        console.warn('[AI Coach] global', e.message, { status: e.status, code: e.code });
      }
      setMessages((m) => [
        ...m,
        {
          id: msgId(),
          role: 'assistant',
          content: (e as Error)?.message ?? 'Something went wrong. Try again.',
          source: 'chat',
        },
      ]);
    }
  };

  const planPending = postGoalFeedback.isPending;
  const chatPending = globalCoach.isPending;

  const confirmClearFeedback = () => {
    if (totalSavedGoalNotes <= 0) return;
    Alert.alert(
      'Clear saved plan notes?',
      'Removes stored plan note messages on the server. Your training goal text stays the same.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () =>
            void (async () => {
              try {
                await clearGoalFeedback.mutateAsync();
                setMessages((m) => m.filter((x) => x.source !== 'plan'));
                void feedbackQ.refetch();
              } catch {
                /* noop */
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

      <View style={styles.mainColumn}>
        <ScrollView
          ref={scrollRef}
          style={styles.bodyScroll}
          contentContainerStyle={styles.bodyScrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator
        >
          <Text style={styles.intro}>
            Coaching uses your imported runs, saved goal, and plan notes. Per-run chat lives on each activity.
          </Text>

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
              Plain language goal. The server refreshes your interpretation and home plan after you save.
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
                  {totalSavedGoalNotes} saved plan note{totalSavedGoalNotes === 1 ? '' : 's'}
                </Text>
                <TouchableOpacity
                  onPress={confirmClearFeedback}
                  disabled={clearGoalFeedback.isPending}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear saved plan notes on server"
                >
                  <Text style={[styles.clearFeedbackLink, clearGoalFeedback.isPending && { opacity: 0.5 }]}>
                    Clear
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Plan notes</Text>
            <Text style={styles.sectionHint}>
              Short clarifications saved for your next plan refresh (shown in this thread with a Plan label).
            </Text>
            <View style={styles.planComposer}>
              <TextInput
                style={styles.planInput}
                placeholder={
                  canGoalNote
                    ? 'e.g. Road half not trail; easy weeks when travel…'
                    : 'Save a goal above to add plan notes'
                }
                placeholderTextColor={tokens.placeholder}
                value={planDraft}
                onChangeText={setPlanDraft}
                multiline
                maxLength={4000}
                editable={canGoalNote && !planPending}
              />
              <TouchableOpacity
                style={[styles.planSend, (!planDraft.trim() || !canGoalNote || planPending) && { opacity: 0.45 }]}
                onPress={() => void sendPlanNote()}
                disabled={!planDraft.trim() || !canGoalNote || planPending}
                accessibilityRole="button"
                accessibilityLabel="Save plan note"
              >
                <Send size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 22, paddingHorizontal: 20 }]}>Conversation</Text>
          {messages.map((m) => (
            <View
              key={m.id}
              style={[styles.bubbleWrap, m.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapAssistant]}
            >
              {m.source === 'plan' ? (
                <Text
                  style={[styles.sourcePill, m.role === 'user' ? styles.sourcePillUser : styles.sourcePillAssist]}
                >
                  Plan
                </Text>
              ) : null}
              <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
                <Text style={m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
                  {m.content}
                </Text>
              </View>
            </View>
          ))}
          {planPending || chatPending ? (
            <View style={styles.typing}>
              <ActivityIndicator size="small" color={tokens.accentOrange} />
            </View>
          ) : null}
        </ScrollView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
          style={[styles.kavFooter, { paddingBottom: Math.max(insets.bottom, 10) }]}
        >
          <View style={styles.chatComposer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Message your coach…"
              placeholderTextColor={tokens.placeholder}
              value={chatDraft}
              onChangeText={setChatDraft}
              multiline
              maxLength={4000}
              editable={!chatPending}
            />
            <TouchableOpacity
              style={[styles.chatSend, (!chatDraft.trim() || chatPending) && styles.chatSendDisabled]}
              onPress={() => void sendChat()}
              disabled={!chatDraft.trim() || chatPending}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <Send size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
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
    mainColumn: { flex: 1 },
    intro: {
      color: t.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    bodyScroll: { flex: 1 },
    bodyScrollContent: { paddingBottom: 120 },

    goalSection: {
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    goalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    goalEditPencil: { padding: 6, borderRadius: 8 },
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

    planComposer: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    planInput: {
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
    planSend: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: t.accentOrange,
      alignItems: 'center',
      justifyContent: 'center',
    },

    bubbleWrap: { marginBottom: 10, maxWidth: '92%', paddingHorizontal: 20 },
    bubbleWrapUser: { alignSelf: 'flex-end' },
    bubbleWrapAssistant: { alignSelf: 'flex-start' },
    sourcePill: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 4,
    },
    sourcePillUser: { color: t.accentBlue, alignSelf: 'flex-end' },
    sourcePillAssist: { color: t.textMuted, alignSelf: 'flex-start' },
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
    typing: { paddingVertical: 8, paddingHorizontal: 20, alignItems: 'flex-start' },

    kavFooter: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
      backgroundColor: t.background,
    },
    chatComposer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    chatInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: t.text,
      backgroundColor: t.surfaceElevated,
    },
    chatSend: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: t.accentOrange,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chatSendDisabled: { opacity: 0.45 },
  });
}
