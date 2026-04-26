import { useCallback, useMemo, useState } from 'react';
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
import { ChevronDown, Check, Search } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useFeed, useNotificationsPreview, useTrainingToday } from '@/api/hooks';
import { qk } from '@/api/queryClient';
import { ActivityCard } from '@/components/activity/ActivityCard';
import { EmptyState } from '@/components/EmptyState';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';
import type { components } from '@/api/schema';

type Scope = 'me' | 'following';
type TrainingToday = components['schemas']['TrainingToday'];
type Notification = components['schemas']['Notification'];
type NotifPreview = { unread_count: number; latest: Notification | null };

const SCOPE_LABEL: Record<Scope, string> = {
  me: 'My runs',
  following: 'Following',
};

export default function FeedScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const qc = useQueryClient();
  const [scope, setScope] = useState<Scope>('me');
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data, isLoading, isFetching, isError, refetch } = useFeed(scope);
  const activities = data?.data ?? [];
  const trainingToday = useTrainingToday();
  const notifPreview = useNotificationsPreview();

  const onRefreshFeed = useCallback(async () => {
    await refetch();
    void qc.invalidateQueries({ queryKey: qk.trainingToday() });
    void qc.invalidateQueries({ queryKey: qk.notificationsPreview() });
  }, [refetch, qc]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.titleRow, pressed && { opacity: 0.7 }]}
          onPress={() => setPickerOpen(true)}
          hitSlop={8}
        >
          <Text style={styles.title}>{SCOPE_LABEL[scope]}</Text>
          <ChevronDown size={22} color={tokens.textMuted} strokeWidth={2.2} />
        </Pressable>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push('/(tabs)/discover')}
          accessibilityRole="button"
          accessibilityLabel="Find runners"
        >
          <Search size={18} color={tokens.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <FeedHomeStrip
            styles={styles}
            training={trainingToday.data}
            trainingLoading={trainingToday.isLoading}
            preview={notifPreview.data}
            previewLoading={notifPreview.isLoading}
          />
        }
        renderItem={({ item }) => (
          <ActivityCard
            activity={item}
            onPress={() =>
              router.push(`/(tabs)/activity/${item.id}`, { withAnchor: true })
            }
          />
        )}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => void onRefreshFeed()}
            tintColor={tokens.accentBlue}
          />
        }
        ListEmptyComponent={
          isLoading ? null : scope === 'following' ? (
            <EmptyState
              title="Quiet feed"
              body="Follow other runners and their activity will show up here."
              ctaLabel="Find runners"
              onCtaPress={() => router.push('/(tabs)/discover')}
            />
          ) : (
            <EmptyState
              title="No runs yet"
              body="Connect Strava to sync your activities."
            />
          )
        }
        ListFooterComponent={
          isLoading && activities.length === 0 ? (
            <ActivityIndicator color={tokens.accentBlue} style={{ marginTop: 40 }} />
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
        styles={styles}
        tokens={tokens}
      />
    </View>
  );
}

function FeedHomeStrip({
  styles,
  training,
  trainingLoading,
  preview,
  previewLoading,
}: {
  styles: ReturnType<typeof makeStyles>;
  training: TrainingToday | undefined;
  trainingLoading: boolean;
  preview: NotifPreview | undefined;
  previewLoading: boolean;
}) {
  const unread = preview?.unread_count ?? 0;
  const teaser = preview?.latest?.title ?? '';

  return (
    <View style={styles.stripWrap}>
      <Pressable
        style={({ pressed }) => [styles.stripCard, pressed && { opacity: 0.92 }]}
        onPress={() => router.push('/(tabs)/ai')}
      >
        <Text style={styles.stripLabel}>Today</Text>
        {trainingLoading ? (
          <Text style={styles.stripMuted}>Loading plan…</Text>
        ) : (
          <>
            <Text style={styles.stripHeadline} numberOfLines={2}>
              {training?.headline ?? 'Your training plan'}
            </Text>
            <Text style={styles.stripSub} numberOfLines={2}>
              {training?.primary_session ?? 'Set a goal in AI Coach for tailored guidance.'}
            </Text>
          </>
        )}
        <Text style={styles.stripDisclaimer}>
          Suggestions only—not medical advice.
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.stripCard, pressed && { opacity: 0.92 }]}
        onPress={() => router.push('/(tabs)/notifications')}
      >
        <View style={styles.stripRowBetween}>
          <Text style={styles.stripLabel}>Notifications</Text>
          {unread > 0 ? (
            <View style={styles.stripBadge}>
              <Text style={styles.stripBadgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </View>
        {previewLoading ? (
          <Text style={styles.stripMuted}>Loading…</Text>
        ) : teaser ? (
          <Text style={styles.stripTeaser} numberOfLines={2}>
            {teaser}
          </Text>
        ) : (
          <Text style={styles.stripMuted}>Nothing new—sync a run to see updates.</Text>
        )}
        <Text style={styles.stripLink}>See all</Text>
      </Pressable>
    </View>
  );
}

function ScopePicker({
  visible,
  scope,
  onPick,
  onDismiss,
  styles,
  tokens,
}: {
  visible: boolean;
  scope: Scope;
  onPick: (scope: Scope) => void;
  onDismiss: () => void;
  styles: ReturnType<typeof makeStyles>;
  tokens: ThemeTokens;
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
              {scope === s ? <Check size={18} color={tokens.text} /> : null}
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
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
      paddingBottom: 8,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    title: { fontSize: 28, fontWeight: '700', color: t.text },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 140 },
    errorBanner: {
      backgroundColor: t.errorBg,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    errorText: { color: t.mode === 'dark' ? '#fff' : t.error, fontSize: 13 },

    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingTop: 90,
      paddingHorizontal: 20,
    },
    sheet: {
      backgroundColor: t.surfaceSheet,
      borderRadius: 14,
      paddingVertical: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
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
    sheetLabel: { color: t.text, fontSize: 15 },

    stripWrap: { gap: 10, marginBottom: 14 },
    stripCard: {
      borderRadius: 14,
      padding: 14,
      backgroundColor: t.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    stripRowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    stripLabel: {
      color: t.textMuted,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    stripHeadline: { color: t.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
    stripSub: { color: t.textSecondary, fontSize: 14, marginTop: 6, lineHeight: 19 },
    stripMuted: { color: t.textMuted, fontSize: 14, marginTop: 4 },
    stripTeaser: { color: t.text, fontSize: 14, marginTop: 4, lineHeight: 19 },
    stripDisclaimer: { color: t.textMuted, fontSize: 11, marginTop: 8 },
    stripLink: { color: t.accentBlue, fontSize: 14, fontWeight: '600', marginTop: 8 },
    stripBadge: {
      backgroundColor: t.accentBlue,
      borderRadius: 10,
      minWidth: 22,
      paddingHorizontal: 6,
      paddingVertical: 2,
      alignItems: 'center',
    },
    stripBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  });
}
