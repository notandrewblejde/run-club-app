import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Search, Users, Globe, UserPlus } from 'lucide-react-native';
import { router } from 'expo-router';
import { useFollowUser, useJoinClub, usePublicClubs, useUserSearch } from '@/api/hooks';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

export default function DiscoverScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [query, setQuery] = useState('');
  const publicClubsQ = usePublicClubs();
  const usersQ = useUserSearch(query);
  const join = useJoinClub();
  const follow = useFollowUser();

  const handleJoin = async (clubId: string) => {
    try {
      await join.mutateAsync(clubId);
      Alert.alert('Joined', "You've joined the club.");
      router.push(`/(tabs)/clubs/${clubId}`);
    } catch (e: unknown) {
      Alert.alert('Could not join', (e as Error)?.message ?? 'Try again later');
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      await follow.mutateAsync(userId);
      Alert.alert('Following', 'You will now see their activities in your feed.');
    } catch (e: unknown) {
      Alert.alert('Could not follow', (e as Error)?.message ?? 'Try again later');
    }
  };

  const showingSearch = query.trim().length >= 2;
  const users = usersQ.data?.data ?? [];
  const publicClubs = publicClubsQ.data?.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <View style={styles.searchBox}>
          <Search size={16} color={tokens.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search runners by name"
            placeholderTextColor={tokens.placeholder}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {showingSearch ? (
          <>
            <Text style={styles.sectionTitle}>Runners</Text>
            {usersQ.isFetching ? (
              <ActivityIndicator color={tokens.accentBlue} style={{ marginTop: 12 }} />
            ) : users.length === 0 ? (
              <Text style={styles.empty}>No runners match.</Text>
            ) : (
              users.map((u) => (
                <View key={u.id} style={styles.row}>
                  <View style={styles.rowAvatar}>
                    <Text style={styles.rowInitial}>
                      {(u.name ?? '?').slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{u.name ?? 'Unnamed'}</Text>
                  </View>
                  <TouchableOpacity style={styles.action} onPress={() => handleFollow(u.id)}>
                    <UserPlus size={14} color={tokens.onPrimary} />
                    <Text style={styles.actionText}>Follow</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Public clubs</Text>
            {publicClubsQ.isLoading ? (
              <ActivityIndicator color={tokens.accentBlue} style={{ marginTop: 12 }} />
            ) : publicClubs.length === 0 ? (
              <Text style={styles.empty}>No public clubs yet. Be the first to start one.</Text>
            ) : (
              publicClubs.map((c) => (
                <View key={c.id} style={styles.row}>
                  <View style={[styles.rowAvatar, { backgroundColor: tokens.accentBlue }]}>
                    <Users size={16} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{c.name}</Text>
                    <View style={styles.rowMeta}>
                      <Globe size={11} color={tokens.textMuted} />
                      <Text style={styles.rowMetaText}>public</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.action} onPress={() => handleJoin(c.id)}>
                    <Text style={styles.actionText}>Join</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
    title: { color: t.text, fontSize: 28, fontWeight: '700', marginBottom: 12 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: t.surfaceElevated,
      paddingHorizontal: 14,
      height: 40,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    searchInput: { flex: 1, color: t.text, fontSize: 14 },
    scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 140 },
    sectionTitle: { color: t.text, fontWeight: '600', fontSize: 15, marginBottom: 8 },
    empty: { color: t.textMuted, marginTop: 12, fontSize: 13 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      gap: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    rowAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.accentOrange,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowInitial: { color: '#fff', fontWeight: '700' },
    rowTitle: { color: t.text, fontWeight: '600' },
    rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    rowMetaText: { color: t.textMuted, fontSize: 11 },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: t.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    actionText: { color: t.onPrimary, fontWeight: '600', fontSize: 13 },
  });
}
