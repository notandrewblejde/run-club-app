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
import { ChevronDown, Check, Search } from 'lucide-react-native';
import { useFeed } from '@/api/hooks';
import { ActivityCard } from '@/components/activity/ActivityCard';
import { EmptyState } from '@/components/EmptyState';
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
  });
}
