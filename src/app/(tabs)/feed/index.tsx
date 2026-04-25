import { useMemo, useState } from 'react';
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
import { ChevronDown, Check } from 'lucide-react-native';
import { useFeed } from '@/api/hooks';
import { ActivityCard } from '@/components/activity/ActivityCard';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

type Scope = 'me' | 'following';

const SCOPE_LABEL: Record<Scope, string> = {
  me: 'My runs',
  following: 'Following',
};

export default function FeedScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [scope, setScope] = useState<Scope>('me');
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data, isLoading, isFetching, isError, refetch } = useFeed(scope);
  const activities = data?.data ?? [];

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
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ActivityCard
            activity={item}
            onPress={() => router.push(`/(tabs)/activity/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={tokens.accentBlue}
          />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {scope === 'following' ? 'Quiet feed' : 'No runs yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {scope === 'following'
                  ? 'Follow other runners and their activity will show up here.'
                  : 'Connect Strava to sync your activities.'}
              </Text>
            </View>
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
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
    title: { fontSize: 28, fontWeight: '700', color: t.text },
    content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 140 },
    emptyContainer: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: t.text, marginBottom: 8 },
    emptySubtitle: {
      fontSize: 13,
      color: t.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
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
  });
}
