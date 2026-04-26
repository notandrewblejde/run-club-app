import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Plus, Users, Globe, Lock, Search } from 'lucide-react-native';
import { router } from 'expo-router';
import { useMyClubs } from '@/api/hooks';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';
import type { components } from '@/api/schema';

type Club = components['schemas']['Club'];

export default function ClubsScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { data, isLoading, isFetching, refetch, isError } = useMyClubs();
  const clubs = data?.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Clubs</Text>
          <Text style={styles.subtitle}>
            {clubs.length === 0
              ? 'Join or start your first club'
              : `${clubs.length} club${clubs.length === 1 ? '' : 's'}`}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/(tabs)/discover')}
            accessibilityLabel="Discover"
          >
            <Search size={18} color={tokens.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/(tabs)/clubs/new')}
            accessibilityLabel="Create club"
          >
            <Plus size={20} color={tokens.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && clubs.length === 0 ? (
        <ActivityIndicator color={tokens.accentBlue} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ClubRow
              club={item}
              tokens={tokens}
              styles={styles}
              onPress={() => router.push(`/(tabs)/clubs/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No clubs yet</Text>
                <Text style={styles.emptyBody}>
                  Tap + to create one, or head to Discover to find a public club to join.
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={tokens.accentBlue}
            />
          }
        />
      )}

      {isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Failed to load clubs</Text>
        </View>
      ) : null}
    </View>
  );
}

function ClubRow({
  club,
  tokens,
  styles,
  onPress,
}: {
  club: Club;
  tokens: ThemeTokens;
  styles: ReturnType<typeof makeStyles>;
  onPress: () => void;
}) {
  const Icon = club.privacy_level === 'public' ? Globe : Lock;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.rowIcon}>
        <Users size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{club.name}</Text>
        <View style={styles.rowMeta}>
          <Icon size={11} color={tokens.textMuted} />
          <Text style={styles.rowMetaText}>{club.privacy_level}</Text>
          {club.viewer_role ? (
            <>
              <Text style={styles.rowMetaText}>·</Text>
              <Text style={styles.rowMetaText}>{club.viewer_role}</Text>
            </>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 12,
    },
    title: { fontSize: 28, fontWeight: '700', color: t.text },
    subtitle: { fontSize: 13, color: t.textMuted, marginTop: 4 },
    headerActions: { flexDirection: 'row', gap: 8 },
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
    createButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 140 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      gap: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTitle: { color: t.text, fontWeight: '600', marginBottom: 2 },
    rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rowMetaText: { color: t.textMuted, fontSize: 12 },
    empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: t.text, marginBottom: 8 },
    emptyBody: {
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
  });
}
